"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { apiModel, Department } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useCriticalActionOtp } from "@/hooks/useCriticalActionOtp";
import { Otp2FaChallengeModal } from "@/components/auth/Otp2FaChallengeModal";
import { Section } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { moduleLabel, permissionTitle } from "@/utils/access/permission-meta";
import type { PermissionItem, Role } from "@/types";

export function ClubMemberAccessSection({
  clubId,
  userId,
  membershipStatus,
  departments,
}: {
  clubId: string;
  userId: string;
  membershipStatus: string;
  departments: Department[];
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const roleOtp = useCriticalActionOtp("ROLE_CHANGE");
  const canView = session.canInClub("permission.view", clubId);
  const canAssign = session.canInClub("permission.assign", clubId) && membershipStatus === "ACTIVE";
  const canRevoke = session.canInClub("permission.revoke", clubId);
  const canRoleView = session.canInClub("role.view", clubId) || session.hasGlobal("role.view") || session.can("role.manage");

  const [roleId, setRoleId] = useState("");
  const [roleDeptId, setRoleDeptId] = useState("");
  const [permId, setPermId] = useState("");
  const [permDeptId, setPermDeptId] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);
  const inThisClub = (cid?: string, did?: string) => cid === clubId || (!!did && deptMap.has(did));

  const rolesQuery = useQuery({
    queryKey: qk.roles("club-access"),
    queryFn: () => apiModel.roles(),
    enabled: canAssign && canRoleView,
  });
  const groupsQuery = useQuery({
    queryKey: qk.permissionGroups("club-access"),
    queryFn: () => apiModel.permissionGroups(),
    enabled: canView || canAssign,
  });
  const userRolesQuery = useQuery({
    queryKey: qk.userRoles(userId, clubId),
    queryFn: () => apiModel.userRoles(userId),
    enabled: canView && !!userId,
  });
  const userPermsQuery = useQuery({
    queryKey: qk.userPermissions(userId, clubId),
    queryFn: () => apiModel.userPermissions(userId),
    enabled: canView && !!userId,
  });

  const refreshAccess = () => {
    queryClient.invalidateQueries({ queryKey: qk.userRoles(userId) });
    queryClient.invalidateQueries({ queryKey: qk.userPermissions(userId) });
    queryClient.invalidateQueries({ queryKey: qk.clubPositions(clubId) });
  };

  const grantableRoles = useMemo<Role[]>(() => {
    return (rolesQuery.data ?? []).filter((r) => {
      if (!r.active || r.scope === "GLOBAL" || r.code === "DEPARTMENT_HEAD") return false;
      const clubWideOk =
        session.canClubWide("permission.assign", clubId) &&
        r.permissionKeys.every((k) => session.canClubWide(k, clubId));
      if (r.scope === "CLUB") return clubWideOk;
      if (clubWideOk) return true;
      return departments.some(
        (d) =>
          session.canInDepartment("permission.assign", clubId, d.id) &&
          r.permissionKeys.every((k) => session.canInDepartment(k, clubId, d.id))
      );
    });
  }, [clubId, departments, rolesQuery.data, session]);

  const selectedRole = grantableRoles.find((r) => r.id === roleId) ?? grantableRoles[0];
  const effectiveRoleId = selectedRole?.id ?? "";
  const canGrantSelectedRoleClubWide = selectedRole
    ? session.canClubWide("permission.assign", clubId) &&
      selectedRole.permissionKeys.every((k) => session.canClubWide(k, clubId))
    : false;
  const allowedRoleDepts = useMemo(
    () =>
      selectedRole?.scope === "DEPARTMENT"
        ? departments.filter(
            (d) =>
              session.canInDepartment("permission.assign", clubId, d.id) &&
              selectedRole.permissionKeys.every((k) => session.canInDepartment(k, clubId, d.id))
          )
        : [],
    [clubId, departments, selectedRole, session]
  );
  const effectiveRoleDept =
    selectedRole?.scope === "CLUB"
      ? ""
      : !canGrantSelectedRoleClubWide
      ? allowedRoleDepts.find((d) => d.id === roleDeptId)?.id ?? allowedRoleDepts[0]?.id ?? ""
      : roleDeptId;

  const grantableGroups = useMemo(() => {
    return (groupsQuery.data ?? [])
      .map((g) => ({
        module: g.module,
        permissions: g.permissions.filter((p) => {
          if (!p.active || p.scope === "GLOBAL") return false;
          const clubWideOk =
            session.canClubWide("permission.assign", clubId) &&
            session.canClubWide(p.permissionKey, clubId);
          if (p.scope === "CLUB") return clubWideOk;
          if (clubWideOk) return true;
          return departments.some(
            (d) =>
              session.canInDepartment("permission.assign", clubId, d.id) &&
              session.canInDepartment(p.permissionKey, clubId, d.id)
          );
        }),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [clubId, departments, groupsQuery.data, session]);

  const allGrantablePerms = useMemo<PermissionItem[]>(
    () => grantableGroups.flatMap((g) => g.permissions),
    [grantableGroups]
  );
  const permByKey = useMemo(
    () => new Map((groupsQuery.data ?? []).flatMap((g) => g.permissions).map((p) => [p.permissionKey, p])),
    [groupsQuery.data]
  );
  const roleById = useMemo(
    () => new Map((rolesQuery.data ?? []).map((r) => [r.id, r])),
    [rolesQuery.data]
  );
  const selectedPerm = allGrantablePerms.find((p) => p.id === permId) ?? allGrantablePerms[0];
  const effectivePermId = selectedPerm?.id ?? "";
  const canGrantSelectedClubWide = selectedPerm
    ? session.canClubWide("permission.assign", clubId) && session.canClubWide(selectedPerm.permissionKey, clubId)
    : false;
  const allowedPermDepts = useMemo(
    () =>
      selectedPerm?.scope === "DEPARTMENT"
        ? departments.filter(
            (d) =>
              session.canInDepartment("permission.assign", clubId, d.id) &&
              session.canInDepartment(selectedPerm.permissionKey, clubId, d.id)
          )
        : [],
    [clubId, departments, selectedPerm, session]
  );
  const effectivePermDept =
    selectedPerm?.scope === "CLUB"
      ? ""
      : !canGrantSelectedClubWide
      ? allowedPermDepts.find((d) => d.id === permDeptId)?.id ?? allowedPermDepts[0]?.id ?? ""
      : permDeptId;

  const canRevokeRoleAssignment = (r: { roleId: string; scope: string; departmentId?: string }) => {
    if (!canRevoke) return false;
    const roleDef = roleById.get(r.roleId);
    if (r.scope === "DEPARTMENT" && r.departmentId) {
      if (!session.canInDepartment("permission.revoke", clubId, r.departmentId)) return false;
      return !roleDef || roleDef.permissionKeys.every((k) => session.canInDepartment(k, clubId, r.departmentId));
    }
    if (!session.canClubWide("permission.revoke", clubId)) return false;
    return !roleDef || roleDef.permissionKeys.every((k) => session.canClubWide(k, clubId));
  };

  const canRevokePermGrant = (p: { permissionKey: string; scope: string; departmentId?: string }) => {
    if (!canRevoke) return false;
    if (p.scope === "DEPARTMENT" && p.departmentId) {
      return (
        session.canInDepartment("permission.revoke", clubId, p.departmentId) &&
        session.canInDepartment(p.permissionKey, clubId, p.departmentId)
      );
    }
    if (p.scope === "CLUB") {
      return session.canClubWide("permission.revoke", clubId) && session.canClubWide(p.permissionKey, clubId);
    }
    return false;
  };

  const assignRoleMut = useMutation({
    mutationFn: () =>
      roleOtp.runWithOtp((otp) =>
        apiModel.assignRole(
          userId,
          {
            roleId: effectiveRoleId,
            scope: effectiveRoleDept ? "DEPARTMENT" : "CLUB",
            clubId: effectiveRoleDept ? undefined : clubId,
            departmentId: effectiveRoleDept || undefined,
          },
          otp
        )
      ),
    onSuccess: () => { setMsg("Đã gán vai trò tại CLB / Ban."); setErr(""); refreshAccess(); },
    onError: (e) => { setErr(describeError(e)); setMsg(""); },
  });

  const revokeRoleMut = useMutation({
    mutationFn: (assignmentId: string) => roleOtp.runWithOtp((otp) => apiModel.revokeRole(userId, assignmentId, otp)),
    onSuccess: () => { setMsg("Đã thu hồi vai trò."); setErr(""); refreshAccess(); },
    onError: (e) => { setErr(describeError(e)); setMsg(""); },
  });

  const grantPermMut = useMutation({
    mutationFn: () =>
      roleOtp.runWithOtp((otp) =>
        apiModel.grantPermission(
          userId,
          {
            permissionId: effectivePermId,
            scope: effectivePermDept ? "DEPARTMENT" : "CLUB",
            clubId: effectivePermDept ? undefined : clubId,
            departmentId: effectivePermDept || undefined,
          },
          otp
        )
      ),
    onSuccess: () => { setMsg("Đã cấp quyền trực tiếp tại CLB / Ban."); setErr(""); refreshAccess(); },
    onError: (e) => { setErr(describeError(e)); setMsg(""); },
  });

  const revokePermMut = useMutation({
    mutationFn: (p: { permissionId: string; scope: "CLUB" | "DEPARTMENT"; clubId?: string; departmentId?: string }) =>
      roleOtp.runWithOtp((otp) =>
        apiModel.revokePermission(userId, p.permissionId, { scope: p.scope, clubId: p.clubId, departmentId: p.departmentId }, otp)
      ),
    onSuccess: () => { setMsg("Đã thu hồi quyền trực tiếp."); setErr(""); refreshAccess(); },
    onError: (e) => { setErr(describeError(e)); setMsg(""); },
  });

  if (!canView && !canAssign) return null;

  const clubRoles = (userRolesQuery.data ?? []).filter((r) => inThisClub(r.clubId, r.departmentId));
  const clubPerms = (userPermsQuery.data ?? []).filter((p) => inThisClub(p.clubId, p.departmentId));

  return (
    <Section title="Vai trò & Phân quyền tại CLB / Ban" icon={<KeyRound />}>
      <div className="space-y-3">
        {canAssign && (
          <p className="rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Uỷ quyền cấp dưới: bạn chỉ có thể cấp hoặc thu hồi các vai trò và quyền hạn mà chính bạn đang nắm giữ trong phạm vi CLB / Ban phụ trách.
          </p>
        )}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vai trò đảm nhiệm</p>
          {clubRoles.length === 0 ? (
            <p className="text-xs text-muted-foreground">Chưa được gán vai trò riêng tại CLB này.</p>
          ) : (
            <div className="space-y-1">
              {clubRoles.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-2.5 py-1.5 text-xs">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-foreground">{r.roleName}</span>
                    <Badge tone={r.scope === "CLUB" ? "primary" : "neutral"} dot={false}>
                      {r.departmentId ? `Ban: ${deptMap.get(r.departmentId) ?? "Ban chuyên môn"}` : "Toàn CLB"}
                    </Badge>
                  </div>
                  {canRevokeRoleAssignment(r) && (
                    <button
                      type="button"
                      title="Thu hồi vai trò"
                      disabled={revokeRoleMut.isPending}
                      onClick={() => revokeRoleMut.mutate(r.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {canAssign && grantableRoles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Select aria-label="Chọn vai trò CLB" value={effectiveRoleId} onChange={(e) => setRoleId(e.target.value)} className="h-8 flex-1 text-xs">
                {grantableRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
              {selectedRole?.scope === "DEPARTMENT" && (
                <Select aria-label="Phạm vi vai trò" value={effectiveRoleDept} onChange={(e) => setRoleDeptId(e.target.value)} className="h-8 w-40 text-xs">
                  {canGrantSelectedRoleClubWide && <option value="">Toàn CLB</option>}
                  {allowedRoleDepts.map((d) => <option key={d.id} value={d.id}>Ban: {d.name}</option>)}
                </Select>
              )}
              <Button size="sm" className="h-8" disabled={!effectiveRoleId || (selectedRole?.scope === "DEPARTMENT" && !canGrantSelectedRoleClubWide && !effectiveRoleDept) || assignRoleMut.isPending} onClick={() => assignRoleMut.mutate()}>
                <Plus size={13} /> Gán vai trò
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-1.5 border-t border-border/60 pt-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quyền trực tiếp bổ sung</p>
          {clubPerms.length === 0 ? (
            <p className="text-xs text-muted-foreground">Không có quyền lẻ bổ sung ngoài vai trò.</p>
          ) : (
            <div className="space-y-1">
              {clubPerms.map((p) => {
                const meta = permByKey.get(p.permissionKey);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-2.5 py-1.5 text-xs">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="truncate font-medium text-foreground">{meta ? permissionTitle(meta) : p.permissionKey}</span>
                      <Badge tone={p.scope === "CLUB" ? "primary" : "neutral"} dot={false}>
                        {p.departmentId ? `Ban: ${deptMap.get(p.departmentId) ?? "Ban chuyên môn"}` : "Toàn CLB"}
                      </Badge>
                    </div>
                    {canRevokePermGrant(p) && (
                      <button
                        type="button"
                        title="Thu hồi quyền"
                        disabled={revokePermMut.isPending}
                        onClick={() => revokePermMut.mutate({ permissionId: p.permissionId, scope: p.scope as "CLUB" | "DEPARTMENT", clubId: p.clubId, departmentId: p.departmentId })}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {canAssign && grantableGroups.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Select aria-label="Chọn quyền hạn CLB" value={effectivePermId} onChange={(e) => setPermId(e.target.value)} className="h-8 min-w-[180px] flex-1 text-xs">
                {grantableGroups.map((g) => (
                  <optgroup key={g.module} label={moduleLabel(g.module)}>
                    {g.permissions.map((p) => <option key={p.id} value={p.id}>{permissionTitle(p)}</option>)}
                  </optgroup>
                ))}
              </Select>
              {selectedPerm?.scope === "DEPARTMENT" && (
                <Select aria-label="Phạm vi quyền hạn" value={effectivePermDept} onChange={(e) => setPermDeptId(e.target.value)} className="h-8 w-40 text-xs">
                  {canGrantSelectedClubWide && <option value="">Toàn CLB</option>}
                  {allowedPermDepts.map((d) => <option key={d.id} value={d.id}>Ban: {d.name}</option>)}
                </Select>
              )}
              <Button size="sm" variant="outline" className="h-8" disabled={!effectivePermId || (selectedPerm?.scope === "DEPARTMENT" && !canGrantSelectedClubWide && !effectivePermDept) || grantPermMut.isPending} onClick={() => grantPermMut.mutate()}>
                <Plus size={13} /> Cấp quyền
              </Button>
            </div>
          )}
        </div>

        {msg && <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-slate-900">{msg}</p>}
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>
      <Otp2FaChallengeModal {...roleOtp.otpModalProps} />
    </Section>
  );
}
