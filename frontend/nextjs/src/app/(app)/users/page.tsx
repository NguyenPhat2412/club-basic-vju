"use client";
import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, KeyRound, Lock, LockOpen, UserPlus, Users } from "lucide-react";
import { apiModel, User } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, ModalShell } from "@/components/shared/Overlays";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { RowAction, TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { CountBadge, StatusBadge } from "@/components/ui/badge";
import { FormField, Input } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";

const LIMIT = 20;
const EMPTY_FORM = { email: "", fullName: "", studentCode: "", phone: "", password: "" };

export default function UsersPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [detail, setDetail] = useState<User | null>(null);
  const [notice, setNotice] = useState("");

  const users = useQuery({ queryKey: ["users", search, offset], queryFn: () => apiModel.users(search, offset, LIMIT), placeholderData: keepPreviousData, enabled: session.can("user.view") });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const create = useMutation({
    mutationFn: () => apiModel.createUser({ email: form.email, fullName: form.fullName, password: form.password, studentCode: form.studentCode || undefined, phone: form.phone || undefined }),
    onSuccess: (user) => { setNotice(`Đã tạo tài khoản ${user.email}. Gửi mật khẩu cho người dùng qua kênh riêng.`); setCreating(false); setForm(EMPTY_FORM); refresh(); },
  });
  const reset = useMutation({
    mutationFn: () => apiModel.resetPassword(resetFor!.id, newPassword),
    onSuccess: () => { setNotice(`Đã đặt lại mật khẩu cho ${resetFor!.email}. Mọi phiên đăng nhập cũ của người này đã bị đăng xuất.`); setResetFor(null); setNewPassword(""); },
  });
  const lock = useMutation({
    mutationFn: (user: User) => apiModel.updateUserStatus(user.id, user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"),
    onSuccess: (user) => { setNotice(user.status === "ACTIVE" ? `Đã mở khoá ${user.email}.` : `Đã khoá ${user.email} và đăng xuất mọi phiên.`); setDetail(null); refresh(); },
  });

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
        addLabel="Tạo tài khoản" onAdd={session.can("user.create") ? () => { setCreating(true); create.reset(); } : undefined} />
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
        submitLabel="Tạo tài khoản" submitLoading={create.isPending} submitDisabled={!form.email || !form.fullName || form.password.length < 8}>
        <FormField label="Email" required><Input type="email" autoComplete="off" value={form.email} onChange={set("email")} placeholder="sinhvien@vju.ac.vn" /></FormField>
        <FormField label="Họ và tên" required><Input value={form.fullName} onChange={set("fullName")} /></FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Mã sinh viên"><Input value={form.studentCode} onChange={set("studentCode")} /></FormField>
          <FormField label="Điện thoại"><Input value={form.phone} onChange={set("phone")} /></FormField>
        </div>
        <FormField label="Mật khẩu ban đầu" required hint="Tối thiểu 8 ký tự. Người dùng nên đổi sau lần đăng nhập đầu."><Input type="text" autoComplete="new-password" value={form.password} onChange={set("password")} /></FormField>
        {create.error && <p className="text-xs text-destructive">{describeError(create.error)}</p>}
      </ModalShell>

      <ModalShell open={!!resetFor} onClose={() => setResetFor(null)} title="Đặt lại mật khẩu" icon={<KeyRound />} size="sm" onSubmit={() => reset.mutate()}
        submitLabel="Đặt lại" submitLoading={reset.isPending} submitDisabled={newPassword.length < 8}>
        <p className="text-sm">Tài khoản: <b>{resetFor?.email}</b></p>
        <FormField label="Mật khẩu mới" required hint="Mọi phiên đăng nhập hiện có của người này sẽ bị đăng xuất."><Input type="text" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></FormField>
        {reset.error && <p className="text-xs text-destructive">{describeError(reset.error)}</p>}
      </ModalShell>

      <EntityDrawer open={!!detail} onClose={() => setDetail(null)} title={detail?.fullName ?? ""} subtitle={detail?.email} icon={<Users />}>
        {detail && <DetailList rows={[
          ["Email", <span key="e" className="font-mono">{detail.email}</span>],
          ["Họ và tên", detail.fullName || "—"],
          ["Mã sinh viên", detail.studentCode || "—"],
          ["Điện thoại", detail.phone || "—"],
          ["Trạng thái", <StatusBadge key="s" status={detail.status} />],
          ["Ngày tạo", formatDateTime(detail.createdAt)],
          ["Cập nhật", formatDateTime(detail.updatedAt)],
        ]} />}
      </EntityDrawer>
    </ListPage>
  );
}
