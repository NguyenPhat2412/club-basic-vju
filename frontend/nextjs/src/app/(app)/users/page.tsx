"use client";
import { useState } from "react";
import { keepFetchData, useFetchMutation, useFetchQuery, useFetchClient } from "@/lib/fetch-hooks";
import { Eye, KeyRound, Lock, LockOpen, Plus, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { apiModel, User, UserRole } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import { EMPTY_ROLE_DRAFT, RoleDraft, RolePicker, roleLabel, scopeLabel, toAssignment, useRoleOptions } from "@/components/shared/RolePicker";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { RowAction, TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";

const LIMIT = 20;
const EMPTY_FORM = { email: "", fullName: "", studentCode: "", phone: "", password: "" };

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export default function UsersPage() {
  const session = useSession();
  const queryClient = useFetchClient();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [forceChange, setForceChange] = useState(true);
  const [roleDrafts, setRoleDrafts] = useState<RoleDraft[]>([]);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetForceChange, setResetForceChange] = useState(true);
  const [assignDraft, setAssignDraft] = useState<RoleDraft>(EMPTY_ROLE_DRAFT);
  const [detail, setDetail] = useState<User | null>(null);
  const [notice, setNotice] = useState("");

  const users = useFetchQuery({ queryKey: ["users", search, offset], queryFn: () => apiModel.users(search, offset, LIMIT), placeholderData: keepFetchData, enabled: session.can("user.view") });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });
  const canAssign = session.can("permission.assign");
  const options = useRoleOptions(canAssign);
  const pendingRoles = roleDrafts.map((d) => toAssignment(d, options.roles));
  const rolesIncomplete = pendingRoles.some((r) => r === null);
  const detailRoles = useFetchQuery({ queryKey: ["user-roles", detail?.id], queryFn: () => apiModel.userRoles(detail!.id), enabled: !!detail && session.can("permission.view") });
  const clubName = (id?: string) => options.clubs.find((c) => c.id === id)?.name ?? id;

  const create = useFetchMutation({
    mutationFn: () => apiModel.createUser({
      email: form.email, fullName: form.fullName, password: form.password, studentCode: form.studentCode || undefined, phone: form.phone || undefined,
      requiresPasswordChange: forceChange, roles: pendingRoles.filter((r) => r !== null),
    }),
    onSuccess: (user) => {
      setNotice(`Đã tạo tài khoản ${user.email}. Gửi mật khẩu ban đầu cho người dùng qua kênh riêng${forceChange ? "; họ sẽ phải đổi mật khẩu ở lần đăng nhập đầu" : ""}.`);
      setCreating(false); setForm(EMPTY_FORM); setRoleDrafts([]); setForceChange(true); refresh();
    },
  });
  const reset = useFetchMutation({
    mutationFn: () => apiModel.resetPassword(resetFor!.id, newPassword, resetForceChange),
    onSuccess: () => { setNotice(`Đã đặt lại mật khẩu cho ${resetFor!.email}. Mọi phiên đăng nhập cũ của người này đã bị đăng xuất.`); setResetFor(null); setNewPassword(""); setResetForceChange(true); },
  });
  const lock = useFetchMutation({
    mutationFn: (user: User) => apiModel.updateUserStatus(user.id, user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"),
    onSuccess: (user) => { setNotice(user.status === "ACTIVE" ? `Đã mở khoá ${user.email}.` : `Đã khoá ${user.email} và đăng xuất mọi phiên.`); setDetail(null); refresh(); },
  });

  const assign = useFetchMutation({
    mutationFn: () => apiModel.assignRole(detail!.id, toAssignment(assignDraft, options.roles)!),
    onSuccess: () => { setAssignDraft(EMPTY_ROLE_DRAFT); detailRoles.refetch(); },
  });
  const revoke = useFetchMutation({
    mutationFn: (assignment: UserRole) => apiModel.revokeRole(assignment.userId, assignment.id),
    onSuccess: () => detailRoles.refetch(),
  });
  const removeRole = (assignment: UserRole) => {
    if (confirm(`Thu hồi vai trò ${roleLabel(assignment)} của ${detail?.email}?`)) revoke.mutate(assignment);
  };
  const assignmentTarget = (a: UserRole) => a.scope === "GLOBAL" ? scopeLabel("GLOBAL") : a.scope === "CLUB" ? `CLB ${clubName(a.clubId)}` : "Một ban";

  const toggleLock = (user: User) => {
    if (user.status === "ACTIVE" && !confirm(`Khoá tài khoản ${user.email}? Người này sẽ bị đăng xuất ngay.`)) return;
    lock.mutate(user);
  };
  const actionsFor = (user: User): RowAction[] => [
    { icon: <Eye />, label: "Xem chi tiết", onClick: () => setDetail(user) },
    ...(session.can("user.reset_password") ? [{ icon: <KeyRound />, label: "Đặt lại mật khẩu", onClick: () => { setResetFor(user); setNewPassword(""); reset.reset(); } }] : []),
    ...(user.id !== session.user?.id && session.can(user.status === "ACTIVE" ? "user.inactive" : "user.active")
      ? [{ icon: user.status === "ACTIVE" ? <Lock /> : <LockOpen />, label: user.status === "ACTIVE" ? "Khoá tài khoản" : "Mở khoá", danger: user.status === "ACTIVE", onClick: () => toggleLock(user), disabled: lock.isPending }]
      : []),
  ];
  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  if (session.ready && !session.can("user.view")) {
    return <ListPage title="Tài khoản"><EmptyState icon={<Users />} title="Bạn không có quyền quản lý tài khoản" /></ListPage>;
  }

  return (
    <ListPage title="Tài khoản">
      <BreadcrumbToolbar crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Hệ thống" }, { label: "Tài khoản" }]}
        titleBadge={<CountBadge>{users.data?.total ?? 0}</CountBadge>}
        search={{ value: search, onChange: (v) => { setSearch(v); setOffset(0); }, placeholder: "Tìm email, họ tên, mã SV…" }}
        onRefresh={() => users.refetch()}
        addLabel="Tạo tài khoản" onAdd={session.can("user.create") ? () => { setCreating(true); create.reset(); setRoleDrafts(canAssign ? [EMPTY_ROLE_DRAFT] : []); } : undefined} />
      {notice && <Notice tone="success">{notice}</Notice>}
      {lock.error && <Notice tone="error">{describeError(lock.error)}</Notice>}
      {users.isPending ? <LoadingRows /> : users.isError ? <ErrorState message={describeError(users.error)} onRetry={() => users.refetch()} />
        : !users.data.items.length ? <EmptyState icon={<Users />} title="Không tìm thấy tài khoản" />
          : <DataTable ariaLabel="Tài khoản" rows={users.data.items} rowKey={(u) => u.id} onRowClick={setDetail} columns={[
            { key: "user", header: "Người dùng", render: (u) => (
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">{(u.fullName ?? u.email).slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0"><p className="max-w-60 truncate font-bold">{u.fullName}</p><p className="max-w-60 truncate text-[10.5px] text-muted-foreground">{u.email}</p></div>
              </div>) },
            { key: "code", header: "Mã sinh viên", render: (u) => u.studentCode ? <code className="font-mono font-semibold text-primary">{u.studentCode}</code> : <span className="text-muted-foreground">—</span> },
            { key: "phone", header: "Điện thoại", render: (u) => <span className="font-mono text-muted-foreground">{u.phone || "—"}</span> },
            { key: "created", header: "Ngày tạo", render: (u) => <span className="font-mono font-bold text-primary">{formatDay(u.createdAt)}</span> },
            { key: "status", header: "Trạng thái", render: (u) => <StatusBadge status={u.status} /> },
            { key: "actions", header: "Thao tác", className: "text-right", render: (u) => <TableRowActions actions={actionsFor(u)} /> },
          ]} />}
      {users.data && <Pagination offset={offset} limit={LIMIT} total={users.data.total} onOffset={setOffset} />}

      <ModalShell open={creating} onClose={() => setCreating(false)} title="Tạo tài khoản" icon={<UserPlus />} onSubmit={() => create.mutate()}
        submitLabel="Tạo tài khoản" submitLoading={create.isPending} submitDisabled={!form.email || !form.fullName || form.password.length < 8 || rolesIncomplete}>
        <FormField label="Email" required><Input type="email" autoComplete="off" value={form.email} onChange={set("email")} placeholder="sinhvien@vju.ac.vn" /></FormField>
        <FormField label="Họ và tên" required><Input value={form.fullName} onChange={set("fullName")} /></FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Mã sinh viên"><Input value={form.studentCode} onChange={set("studentCode")} /></FormField>
          <FormField label="Điện thoại"><Input value={form.phone} onChange={set("phone")} /></FormField>
        </div>
        <FormField label="Mật khẩu ban đầu" required hint="Tối thiểu 8 ký tự. Gửi cho người dùng qua kênh riêng."><Input type="text" autoComplete="new-password" value={form.password} onChange={set("password")} /></FormField>
        <Checkbox checked={forceChange} onChange={setForceChange} label="Bắt buộc người dùng đổi mật khẩu ở lần đăng nhập đầu (khuyến nghị)" />
        {canAssign && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Vai trò</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setRoleDrafts((d) => [...d, EMPTY_ROLE_DRAFT])}><Plus size={14} /> Thêm vai trò</Button>
            </div>
            {roleDrafts.length === 0 && <p className="text-xs text-muted-foreground">Chưa gán vai trò: tài khoản sẽ chưa có quyền gì cho tới khi được gán.</p>}
            {roleDrafts.map((draft, index) => (
              <RolePicker key={index} value={draft} roles={options.roles} clubs={options.clubs}
                onChange={(value) => setRoleDrafts((d) => d.map((x, i) => i === index ? value : x))}
                onRemove={() => setRoleDrafts((d) => d.filter((_, i) => i !== index))} />
            ))}
            <p className="text-xs text-muted-foreground">Bạn chỉ gán được vai trò gồm các quyền mà chính bạn đang có.</p>
          </div>
        )}
        {create.error && <p className="text-xs text-destructive">{describeError(create.error)}</p>}
      </ModalShell>

      <ModalShell open={!!resetFor} onClose={() => setResetFor(null)} title="Đặt lại mật khẩu" icon={<KeyRound />} size="sm" onSubmit={() => reset.mutate()}
        submitLabel="Đặt lại" submitLoading={reset.isPending} submitDisabled={newPassword.length < 8}>
        <p className="text-sm">Tài khoản: <b>{resetFor?.email}</b></p>
        <FormField label="Mật khẩu mới" required hint="Mọi phiên đăng nhập hiện có của người này sẽ bị đăng xuất."><Input type="text" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></FormField>
        <Checkbox checked={resetForceChange} onChange={setResetForceChange} label="Bắt buộc đổi lại mật khẩu ở lần đăng nhập tiếp theo" />
        {reset.error && <p className="text-xs text-destructive">{describeError(reset.error)}</p>}
      </ModalShell>

      <EntityDrawer open={!!detail} onClose={() => { setDetail(null); setAssignDraft(EMPTY_ROLE_DRAFT); assign.reset(); revoke.reset(); }} title={detail?.fullName ?? ""} subtitle={detail?.email} icon={<Users />}>
        {detail && <DetailList rows={[
          ["Email", <span key="e" className="font-mono">{detail.email}</span>],
          ["Họ và tên", detail.fullName || "—"],
          ["Mã sinh viên", detail.studentCode || "—"],
          ["Điện thoại", detail.phone || "—"],
          ["Trạng thái", <StatusBadge key="s" status={detail.status} />],
          ["Mật khẩu", detail.requiresPasswordChange ? <Badge key="p" tone="pending">Chờ người dùng đổi mật khẩu</Badge> : "Đã tự đặt"],
          ["Ngày tạo", formatDateTime(detail.createdAt)],
          ["Cập nhật", formatDateTime(detail.updatedAt)],
        ]} />}
        {detail && session.can("permission.view") && (
          <Section title="Vai trò" icon={<ShieldCheck />}>
            {detailRoles.isPending ? <LoadingRows rows={2} /> : detailRoles.isError ? <ErrorState message={describeError(detailRoles.error)} />
              : !detailRoles.data.length ? <p className="text-sm text-muted-foreground">Chưa có vai trò nào.</p>
                : <ul className="grid gap-2">
                  {detailRoles.data.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
                      <div className="min-w-0"><p className="truncate text-sm font-bold">{roleLabel(a)}</p><p className="truncate text-xs text-muted-foreground">{assignmentTarget(a)} · từ {formatDay(a.grantedAt)}</p></div>
                      {session.can("permission.revoke") && (
                        <button aria-label="Thu hồi vai trò" onClick={() => removeRole(a)} disabled={revoke.isPending}
                          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={15} /></button>
                      )}
                    </li>
                  ))}
                </ul>}
            {revoke.error && <p className="mt-2 text-xs text-destructive">{describeError(revoke.error)}</p>}
            {canAssign && (
              <div className="mt-3 space-y-2">
                <RolePicker value={assignDraft} onChange={setAssignDraft} roles={options.roles} clubs={options.clubs} />
                <Button size="sm" disabled={!toAssignment(assignDraft, options.roles) || assign.isPending} onClick={() => assign.mutate()}><Plus size={14} /> Gán vai trò</Button>
                {assign.error && <p className="text-xs text-destructive">{describeError(assign.error)}</p>}
              </div>
            )}
          </Section>
        )}
      </EntityDrawer>
    </ListPage>
  );
}
