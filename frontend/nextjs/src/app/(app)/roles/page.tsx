"use client";
import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Lock, Plus, Save, ShieldPlus, Undo2 } from "lucide-react";
import { apiModel, PermissionItem, Role, Scope } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { roleLabel, scopeLabel } from "@/components/shared/RolePicker";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { ModalShell } from "@/components/shared/Overlays";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BREADTH: Record<Scope, number> = { DEPARTMENT: 0, CLUB: 1, GLOBAL: 2 };
const MODULE_LABELS: Record<string, string> = {
  user: "Tài khoản", club: "Câu lạc bộ", department: "Ban", member: "Thành viên", "department.member": "Thành viên ban",
  permission: "Phân quyền", role: "Vai trò", audit: "Nhật ký", application: "Đơn đăng ký", document: "Tài liệu",
  event: "Sự kiện & lịch", task: "Công việc", chat: "Kênh chat & AI", notification: "Thông báo",
};

const fitsRole = (permission: PermissionItem, role: Pick<Role, "scope">) => BREADTH[role.scope] >= BREADTH[permission.scope];
const EMPTY_NEW_ROLE = { name: "", code: "", scope: "CLUB" as Scope, description: "" };

function codeFromName(name: string) {
  const code = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d")
    .toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  return /^[A-Z]/.test(code) ? code : code ? `ROLE_${code}` : "";
}

export default function RolesPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const canView = session.can("role.view");
  const canManage = session.can("role.manage");
  const roles = useQuery({ queryKey: ["roles"], queryFn: apiModel.roles, enabled: canView });
  const groups = useQuery({ queryKey: ["permission-groups"], queryFn: apiModel.permissionGroups, enabled: canView && session.can("permission.view") });
  const [draft, setDraft] = useState<Record<string, Set<string>>>({});
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState(EMPTY_NEW_ROLE);
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());
  const newCode = newRole.code.trim() || codeFromName(newRole.name);
  const allPermissions = (groups.data ?? []).flatMap((g) => g.permissions.filter((p) => p.active));
  const create = useMutation({
    mutationFn: () => apiModel.createRole({
      code: newCode, name: newRole.name.trim(), description: newRole.description.trim() || undefined, scope: newRole.scope,
      permissionIds: allPermissions.filter((p) => newKeys.has(p.permissionKey) && fitsRole(p, newRole)).map((p) => p.id),
    }),
    onSuccess: async (role) => {
      setNotice(`Đã tạo vai trò ${role.name}. Gán vai trò này cho người dùng ở trang Tài khoản.`);
      setCreating(false); setNewRole(EMPTY_NEW_ROLE); setNewKeys(new Set());
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
  const toggleNew = (key: string) => setNewKeys((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const newFitting = allPermissions.filter((p) => newKeys.has(p.permissionKey) && fitsRole(p, newRole));

  const columns = useMemo(() => [...(roles.data ?? [])].filter((r) => r.active)
    .sort((a, b) => Number(b.locked) - Number(a.locked) || BREADTH[b.scope] - BREADTH[a.scope]
      || Number(b.system) - Number(a.system) || a.name.localeCompare(b.name, "vi")), [roles.data]);
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

  const editable = (role: Role) => canManage && !role.locked;
  const emptyRole = dirtyRoles.find((role) => keysOf(role).size === 0);

  return (
    <ListPage title="Vai trò & phân quyền">
      <BreadcrumbToolbar crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Hệ thống" }, { label: "Vai trò & phân quyền" }]}
        onRefresh={() => { roles.refetch(); groups.refetch(); }}
        extraActions={canManage ? <>
          <Button variant="outline" size="sm" onClick={() => { setCreating(true); create.reset(); }}><Plus size={14} /> Tạo vai trò</Button>
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
                        <span className="flex items-center gap-1 text-xs font-bold">{role.locked && <Lock size={12} />}{roleLabel(role)}</span>
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
      <ModalShell open={creating} onClose={() => setCreating(false)} title="Tạo vai trò" icon={<ShieldPlus />} onSubmit={() => create.mutate()}
        submitLabel="Tạo vai trò" submitLoading={create.isPending} submitDisabled={!newRole.name.trim() || !newCode || newFitting.length === 0}>
        <FormField label="Tên vai trò" required hint="Ví dụ: Trưởng ban Truyền thông, Thủ quỹ, Cộng tác viên."><Input value={newRole.name} onChange={(e) => setNewRole((r) => ({ ...r, name: e.target.value }))} /></FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Phạm vi" required hint="Vai trò theo ban chỉ chứa được quyền theo ban. Muốn duyệt đơn hay quản lý thành viên CLB thì chọn Theo CLB.">
            <Select value={newRole.scope} onChange={(e) => setNewRole((r) => ({ ...r, scope: e.target.value as Scope }))}>
              <option value="DEPARTMENT">{scopeLabel("DEPARTMENT")}</option>
              <option value="CLUB">{scopeLabel("CLUB")}</option>
              <option value="GLOBAL">{scopeLabel("GLOBAL")}</option>
            </Select>
          </FormField>
          <FormField label="Mã vai trò" hint="Tự sinh từ tên nếu để trống."><Input value={newRole.code} placeholder={codeFromName(newRole.name) || "TRUONG_BAN"} onChange={(e) => setNewRole((r) => ({ ...r, code: e.target.value }))} /></FormField>
        </div>
        <FormField label="Mô tả"><Textarea value={newRole.description} onChange={(e) => setNewRole((r) => ({ ...r, description: e.target.value }))} /></FormField>
        <div className="space-y-2">
          <p className="text-sm font-bold">Quyền ({newFitting.length} đã chọn)</p>
          <div className="max-h-72 space-y-3 overflow-auto rounded-lg border border-border/60 p-3">
            {(groups.data ?? []).map((group) => {
              const items = group.permissions.filter((p) => p.active && fitsRole(p, newRole));
              if (!items.length) return null;
              return <div key={group.module}>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">{MODULE_LABELS[group.module] ?? group.module}</p>
                {items.map((p) => (
                  <label key={p.id} className="flex items-start gap-2 py-0.5 text-sm">
                    <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={newKeys.has(p.permissionKey)} onChange={() => toggleNew(p.permissionKey)} />
                    <span><span className="font-mono text-xs font-semibold">{p.permissionKey}</span>{p.description && <span className="block text-xs text-muted-foreground">{p.description}</span>}</span>
                  </label>
                ))}
              </div>;
            })}
          </div>
        </div>
        {create.error && <p className="text-xs text-destructive">{describeError(create.error)}</p>}
      </ModalShell>
    </ListPage>
  );
}
