"use client";
import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Lock, Save, Undo2 } from "lucide-react";
import { apiModel, PermissionItem, Role, Scope } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { roleLabel, scopeLabel } from "@/components/shared/RolePicker";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROLE_ORDER = ["SYSTEM_ADMIN", "CLUB_PRESIDENT", "CLUB_VICE_PRESIDENT", "DEPARTMENT_HEAD", "CLUB_MEMBER"];
const BREADTH: Record<Scope, number> = { DEPARTMENT: 0, CLUB: 1, GLOBAL: 2 };
const MODULE_LABELS: Record<string, string> = {
  user: "Tài khoản", club: "Câu lạc bộ", department: "Ban", member: "Thành viên", "department.member": "Thành viên ban",
  permission: "Phân quyền", role: "Vai trò", audit: "Nhật ký", application: "Đơn đăng ký", document: "Tài liệu",
};

const fitsRole = (permission: PermissionItem, role: Role) => BREADTH[role.scope] >= BREADTH[permission.scope];

export default function RolesPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const canView = session.can("role.view");
  const canManage = session.can("role.manage");
  const roles = useQuery({ queryKey: ["roles"], queryFn: apiModel.roles, enabled: canView });
  const groups = useQuery({ queryKey: ["permission-groups"], queryFn: apiModel.permissionGroups, enabled: canView && session.can("permission.view") });
  const [draft, setDraft] = useState<Record<string, Set<string>>>({});
  const [notice, setNotice] = useState("");

  const columns = useMemo(() => [...(roles.data ?? [])].filter((r) => r.active)
    .sort((a, b) => (ROLE_ORDER.indexOf(a.code) + 1 || 99) - (ROLE_ORDER.indexOf(b.code) + 1 || 99) || a.code.localeCompare(b.code)), [roles.data]);
  const idByKey = useMemo(() => new Map((groups.data ?? []).flatMap((g) => g.permissions.map((p) => [p.permissionKey, p.id] as const))), [groups.data]);

  const keysOf = (role: Role) => draft[role.id] ?? new Set(role.permissionKeys);
  const dirtyRoles = columns.filter((role) => {
    const current = draft[role.id];
    if (!current) return false;
    return current.size !== role.permissionKeys.length || role.permissionKeys.some((k) => !current.has(k));
  });

  const toggle = (role: Role, key: string) => setDraft((prev) => {
    const next = new Set(prev[role.id] ?? role.permissionKeys);
    if (next.has(key)) next.delete(key); else next.add(key);
    return { ...prev, [role.id]: next };
  });

  const save = useMutation({
    mutationFn: async () => {
      for (const role of dirtyRoles) {
        const ids = [...keysOf(role)].map((k) => idByKey.get(k)).filter((id): id is string => !!id);
        await apiModel.updateRolePermissions(role.id, ids);
      }
    },
    onSuccess: async () => {
      setNotice(`Đã lưu quyền cho ${dirtyRoles.map(roleLabel).join(", ")}. Người dùng có vai trò này nhận quyền mới ngay ở thao tác tiếp theo.`);
      setDraft({});
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      await queryClient.invalidateQueries({ queryKey: ["me", "permissions"] });
    },
  });

  if (session.ready && !canView) {
    return <ListPage title="Vai trò & phân quyền"><EmptyState icon={<KeyRound />} title="Bạn không có quyền xem vai trò" /></ListPage>;
  }

  const editable = (role: Role) => canManage && role.code !== "SYSTEM_ADMIN";
  const emptyRole = dirtyRoles.find((role) => keysOf(role).size === 0);

  return (
    <ListPage title="Vai trò & phân quyền">
      <BreadcrumbToolbar crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Hệ thống" }, { label: "Vai trò & phân quyền" }]}
        onRefresh={() => { roles.refetch(); groups.refetch(); }}
        extraActions={canManage ? <>
          <Button variant="outline" size="sm" disabled={!dirtyRoles.length || save.isPending} onClick={() => { setDraft({}); save.reset(); }}><Undo2 size={14} /> Huỷ thay đổi</Button>
          <Button size="sm" disabled={!dirtyRoles.length || !!emptyRole || save.isPending} onClick={() => save.mutate()}><Save size={14} /> {save.isPending ? "Đang lưu…" : `Lưu thay đổi${dirtyRoles.length ? ` (${dirtyRoles.length})` : ""}`}</Button>
        </> : undefined} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <p className="text-sm text-muted-foreground">
        Quyền được gắn vào vai trò; người dùng nhận quyền qua vai trò được gán ở trang Tài khoản.
        Cột <b>Quản trị hệ thống</b> luôn có toàn quyền và không sửa được. Ô bị mờ là quyền rộng hơn phạm vi của vai trò.
      </p>
      {notice && <Notice tone="success">{notice}</Notice>}
      {emptyRole && <Notice tone="error">Vai trò {roleLabel(emptyRole)} phải còn ít nhất một quyền.</Notice>}
      {save.error && <Notice tone="error">{describeError(save.error)}</Notice>}
      {roles.isPending || groups.isPending ? <LoadingRows /> : roles.isError || groups.isError
        ? <ErrorState message={describeError(roles.error ?? groups.error)} onRetry={() => { roles.refetch(); groups.refetch(); }} />
        : (
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[960px] border-collapse text-sm" aria-label="Ma trận phân quyền">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border/60">
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">Quyền</th>
                  {columns.map((role) => (
                    <th key={role.id} className="px-2 py-2.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="flex items-center gap-1 text-xs font-bold">{role.code === "SYSTEM_ADMIN" && <Lock size={12} />}{roleLabel(role)}</span>
                        <Badge tone={dirtyRoles.includes(role) ? "primary" : "neutral"} dot={false}>{scopeLabel(role.scope)}{dirtyRoles.includes(role) ? " · đã sửa" : ""}</Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.data.map((group) => (
                  <Fragment key={group.module}>
                    <tr className="bg-muted/40">
                      <td colSpan={columns.length + 1} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">{MODULE_LABELS[group.module] ?? group.module}</td>
                    </tr>
                    {group.permissions.filter((p) => p.active).map((permission) => (
                      <tr key={permission.id} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <p className="font-mono text-xs font-semibold">{permission.permissionKey}</p>
                          {permission.description && <p className="text-xs text-muted-foreground">{permission.description}</p>}
                        </td>
                        {columns.map((role) => {
                          const fits = fitsRole(permission, role);
                          const checked = keysOf(role).has(permission.permissionKey);
                          const disabled = !editable(role) || !fits || save.isPending;
                          return (
                            <td key={role.id} className={cn("px-2 py-2 text-center", !fits && "bg-muted/30")}>
                              <input type="checkbox" className="size-4 accent-primary disabled:opacity-40"
                                aria-label={`${roleLabel(role)} · ${permission.permissionKey}`}
                                title={!fits ? `Quyền ${scopeLabel(permission.scope).toLowerCase()} không gán được cho vai trò ${scopeLabel(role.scope).toLowerCase()}` : undefined}
                                checked={checked} disabled={disabled} onChange={() => toggle(role, permission.permissionKey)} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ListPage>
  );
}
