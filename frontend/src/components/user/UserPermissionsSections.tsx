"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound, Plus, Sparkles, Trash2 } from "lucide-react";
import { apiModel, Club, PermissionItem, Scope, User, UserPermission } from "@/lib/api";
import { Section } from "@/components/shared/Overlays";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { formatDay } from "@/lib/utils";

export function UserPermissionsSections({
  user,
  clubs,
  canAssign,
  canRevoke,
  assignmentTarget,
  onRefreshEffective,
}: {
  user: User;
  clubs: Club[];
  canAssign: boolean;
  canRevoke: boolean;
  assignmentTarget: (a: { scope: string; clubId?: string; departmentId?: string }) => string;
  onRefreshEffective?: () => void;
}) {
  const [permId, setPermId] = useState("");
  const [permScope, setPermScope] = useState<Scope>("CLUB");
  const [permClubId, setPermClubId] = useState("");
  const [permDeptId, setPermDeptId] = useState("");
  const [permReason, setPermReason] = useState("");

  const detailPermissions = useQuery({
    queryKey: ["user-permissions", user.id],
    queryFn: () => apiModel.userPermissions(user.id),
  });
  const detailEffective = useQuery({
    queryKey: ["user-effective-permissions", user.id],
    queryFn: () => apiModel.userEffectivePermissions(user.id),
  });
  const permGroups = useQuery({
    queryKey: ["permission-groups"],
    queryFn: () => apiModel.permissionGroups(),
  });
  const permDepartments = useQuery({
    queryKey: ["perm-departments", permClubId],
    queryFn: () => apiModel.departments(permClubId),
    enabled: permScope === "DEPARTMENT" && !!permClubId,
  });

  const allPermissions = useMemo<PermissionItem[]>(
    () => (permGroups.data ?? []).flatMap((g) => g.permissions).filter((p) => p.active),
    [permGroups.data]
  );
  const selectedPerm = allPermissions.find((p) => p.id === permId);

  const grantDirectPerm = useMutation({
    mutationFn: () =>
      apiModel.grantPermission(user.id, {
        permissionId: permId,
        scope: permScope,
        clubId: permScope === "CLUB" ? permClubId : undefined,
        departmentId: permScope === "DEPARTMENT" ? permDeptId : undefined,
        reason: permReason.trim() || undefined,
      }),
    onSuccess: () => {
      setPermId("");
      setPermReason("");
      detailPermissions.refetch();
      detailEffective.refetch();
      onRefreshEffective?.();
    },
  });

  const revokeDirectPerm = useMutation({
    mutationFn: (perm: UserPermission) =>
      apiModel.revokePermission(user.id, perm.permissionId, {
        scope: perm.scope,
        clubId: perm.clubId,
        departmentId: perm.departmentId,
      }),
    onSuccess: () => {
      detailPermissions.refetch();
      detailEffective.refetch();
      onRefreshEffective?.();
    },
  });

  return (
    <>
      <Section title="Quyền trực tiếp (PB-07.1, PB-07.2)" icon={<KeyRound />}>
        {detailPermissions.isPending ? (
          <LoadingRows rows={2} />
        ) : detailPermissions.isError ? (
          <ErrorState message={describeError(detailPermissions.error)} />
        ) : !detailPermissions.data.length ? (
          <p className="text-sm text-muted-foreground">Chưa có quyền lẻ nào được cấp trực tiếp.</p>
        ) : (
          <ul className="grid gap-2">
            {detailPermissions.data.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-bold text-primary">{p.permissionKey}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {assignmentTarget(p)} · từ {formatDay(p.grantedAt)}
                  </p>
                </div>
                {canRevoke && (
                  <button
                    type="button"
                    aria-label="Thu hồi quyền trực tiếp"
                    onClick={() => {
                      if (confirm(`Thu hồi quyền trực tiếp ${p.permissionKey} của ${user.email}?`)) {
                        revokeDirectPerm.mutate(p);
                      }
                    }}
                    disabled={revokeDirectPerm.isPending}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {revokeDirectPerm.error && (
          <p className="mt-2 text-xs text-destructive">{describeError(revokeDirectPerm.error)}</p>
        )}
        {canAssign && (
          <div className="mt-3 grid gap-2.5 rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Cấp quyền trực tiếp mới
            </p>
            <FormField label="Quyền nghiệp vụ">
              <Select
                value={permId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setPermId(nextId);
                  const found = allPermissions.find((item) => item.id === nextId);
                  if (found) setPermScope(found.scope);
                }}
              >
                <option value="">-- Chọn quyền cần cấp --</option>
                {allPermissions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.permissionKey} ({item.scope}) — {item.description || item.action}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <FormField label="Phạm vi áp dụng">
                <Select
                  value={permScope}
                  onChange={(e) => {
                    setPermScope(e.target.value as Scope);
                    setPermClubId("");
                    setPermDeptId("");
                  }}
                >
                  <option value="GLOBAL">Toàn hệ thống (GLOBAL)</option>
                  <option value="CLUB" disabled={selectedPerm?.scope === "GLOBAL"}>
                    Theo CLB (CLUB)
                  </option>
                  <option
                    value="DEPARTMENT"
                    disabled={selectedPerm?.scope === "GLOBAL" || selectedPerm?.scope === "CLUB"}
                  >
                    Theo Ban (DEPARTMENT)
                  </option>
                </Select>
              </FormField>
              {(permScope === "CLUB" || permScope === "DEPARTMENT") && (
                <FormField label="Câu lạc bộ">
                  <Select
                    value={permClubId}
                    onChange={(e) => {
                      setPermClubId(e.target.value);
                      setPermDeptId("");
                    }}
                  >
                    <option value="">-- Chọn CLB --</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}
            </div>
            {permScope === "DEPARTMENT" && permClubId && (
              <FormField label="Ban chuyên môn">
                <Select value={permDeptId} onChange={(e) => setPermDeptId(e.target.value)}>
                  <option value="">-- Chọn ban --</option>
                  {(permDepartments.data?.items ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField label="Lý do cấp quyền (audit)">
              <Input
                value={permReason}
                onChange={(e) => setPermReason(e.target.value)}
                placeholder="VD: Phân quyền phụ trách duyệt đơn tuyển thành viên"
              />
            </FormField>
            <Button
              size="sm"
              className="justify-self-start"
              disabled={
                !permId ||
                (permScope === "CLUB" && !permClubId) ||
                (permScope === "DEPARTMENT" && !permDeptId) ||
                grantDirectPerm.isPending
              }
              onClick={() => grantDirectPerm.mutate()}
            >
              <Plus size={14} /> {grantDirectPerm.isPending ? "Đang cấp…" : "Cấp quyền trực tiếp"}
            </Button>
            {grantDirectPerm.error && (
              <p className="text-xs text-destructive">{describeError(grantDirectPerm.error)}</p>
            )}
          </div>
        )}
      </Section>

      <Section title="Quyền hiệu lực tổng hợp (PB-09.1, PB-09.2)" icon={<Sparkles />}>
        {detailEffective.isPending ? (
          <LoadingRows rows={2} />
        ) : detailEffective.isError ? (
          <ErrorState message={describeError(detailEffective.error)} />
        ) : !detailEffective.data.length ? (
          <p className="text-sm text-muted-foreground">Tài khoản hiện chưa có quyền hiệu lực nào.</p>
        ) : (
          <div className="max-h-56 divide-y divide-border/50 overflow-y-auto rounded-lg border border-border/60">
            {detailEffective.data.map((ep, idx) => (
              <div
                key={`${ep.permissionKey}-${ep.scope}-${ep.clubId || ""}-${ep.departmentId || ""}-${ep.source}-${ep.roleCode || ""}-${idx}`}
                className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-mono font-bold text-foreground">{ep.permissionKey}</span>
                  <p className="truncate text-[11px] text-muted-foreground">{assignmentTarget(ep)}</p>
                </div>
                <Badge tone={ep.source === "DIRECT" ? "primary" : "neutral"}>
                  {ep.source === "DIRECT" ? "Trực tiếp (DIRECT)" : `Vai trò: ${ep.roleCode}`}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
