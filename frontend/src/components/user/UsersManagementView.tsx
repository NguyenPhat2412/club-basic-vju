"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { Ban, CheckCircle2, Eye, FilterX, KeyRound, Lock, LockOpen, Pencil, Plus, Search, ShieldAlert, Trash2, Users, X } from "lucide-react";
import { apiModel, User } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DataTable } from "@/components/shared/DataTable";
import { FilterPopover } from "@/components/shared/FilterPopover";
import { useRoleOptions } from "@/components/shared/RolePicker";
import { Pagination } from "@/components/shared/Pagination";
import { StatSummaryStrip } from "@/components/shared/StatCards";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { RowAction, TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { useGoogleSignIn } from "@/components/shared/GoogleSignInButton";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { formatDay } from "@/lib/utils";
import {
  CreateUserModal,
  DeleteUserAccountModal,
  ResetUserPasswordModal,
} from "@/components/user/UserAccountModals";
import { UserAvatar } from "@/components/user/UserAvatar";
import { UserDetailDrawer } from "@/components/user/UserDetailDrawer";
import { UserRoleClubCell } from "@/components/user/UserRoleClubCell";

const LIMIT = 20;

export function UsersManagementView() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "LOCKED" | "INACTIVE" | "MUST_CHANGE">("ALL");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(LIMIT);
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [detail, setDetail] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [notice, setNotice] = useState("");

  const users = useQuery({
    queryKey: qk.users(search, offset, limit),
    queryFn: () => apiModel.users(search, offset, limit),
    placeholderData: keepPreviousData,
    enabled: session.can("user.view"),
  });
  const sysStats = useQuery({
    queryKey: qk.systemStatistics(),
    queryFn: () => apiModel.systemStatistics(),
    enabled: session.can("user.view"),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.users() });
    queryClient.invalidateQueries({ queryKey: qk.systemStatistics() });
  };

  const canAssign = session.can("permission.assign");
  const canViewUserRoles = canAssign || session.can("permission.view");
  const canUpdateUser = session.can("user.update");
  const canDeleteUser = session.can("user.delete");
  const canLoadRoles = canAssign && (session.can("role.view") || session.can("role.manage"));
  const options = useRoleOptions({ loadClubs: canViewUserRoles, loadRoles: canLoadRoles });
  const clubsById = useMemo(() => new Map(options.clubs.map((c) => [c.id, c])), [options.clubs]);
  const google = useGoogleSignIn();
  const googleDomains = google.data?.enabled ? google.data.allowedDomains : [];
  const isGoogleEmail = (email: string) =>
    googleDomains.some((d) => email.trim().toLowerCase().endsWith(`@${d.toLowerCase()}`));

  const rawItems = useMemo(() => users.data?.items ?? [], [users.data?.items]);
  const filteredRows = useMemo(() => {
    if (statusFilter === "ACTIVE") return rawItems.filter((u) => u.status === "ACTIVE");
    if (statusFilter === "LOCKED") return rawItems.filter((u) => u.status === "LOCKED");
    if (statusFilter === "INACTIVE") return rawItems.filter((u) => u.status === "INACTIVE");
    if (statusFilter === "MUST_CHANGE") return rawItems.filter((u) => !!u.requiresPasswordChange);
    return rawItems;
  }, [rawItems, statusFilter]);

  const activeCount = rawItems.filter((u) => u.status === "ACTIVE").length;
  const lockedCount = rawItems.filter((u) => u.status === "LOCKED" || u.status === "INACTIVE").length;
  const mustChangeCount = rawItems.filter((u) => !!u.requiresPasswordChange).length;

  const lock = useMutation({
    mutationFn: ({ user, nextStatus }: { user: User; nextStatus: "ACTIVE" | "LOCKED" | "INACTIVE" }) =>
      apiModel.updateUserStatus(user.id, nextStatus),
    onSuccess: (user) => {
      setNotice(
        user.status === "ACTIVE"
          ? `Đã mở khoá / kích hoạt tài khoản ${user.email}.`
          : user.status === "LOCKED"
            ? `Đã khoá tạm thời tài khoản ${user.email} và đăng xuất mọi phiên.`
            : `Đã vô hiệu hoá tài khoản ${user.email} và đăng xuất mọi phiên.`
      );
      setDetail(user);
      refresh();
    },
  });

  const changeStatus = (user: User, nextStatus: "ACTIVE" | "LOCKED" | "INACTIVE") => {
    if (
      nextStatus !== "ACTIVE" &&
      !confirm(
        nextStatus === "LOCKED"
          ? `Khoá tạm thời tài khoản ${user.email}? Người này sẽ bị đăng xuất ngay.`
          : `Vô hiệu hoá tài khoản ${user.email}? Người này sẽ bị đăng xuất ngay.`
      )
    )
      return;
    lock.mutate({ user, nextStatus });
  };

  const actionsFor = (user: User): RowAction[] => [
    { icon: <Eye />, label: "Xem chi tiết", onClick: () => setDetail(user) },
    ...(canUpdateUser ? [{ icon: <Pencil />, label: "Sửa thông tin", onClick: () => setDetail(user) }] : []),
    ...(session.can("user.reset_password") && !isGoogleEmail(user.email)
      ? [{ icon: <KeyRound />, label: "Đặt lại mật khẩu", onClick: () => setResetFor(user) }]
      : []),
    ...(user.id !== session.user?.id && user.status === "ACTIVE" && session.can("user.inactive")
      ? [
          { icon: <Lock />, label: "Khoá tạm thời", onClick: () => changeStatus(user, "LOCKED"), disabled: lock.isPending },
          { icon: <Ban />, label: "Vô hiệu hoá", danger: true, onClick: () => changeStatus(user, "INACTIVE"), disabled: lock.isPending },
        ]
      : []),
    ...(user.id !== session.user?.id && user.status !== "ACTIVE" && session.can("user.active")
      ? [{ icon: <LockOpen />, label: user.status === "LOCKED" ? "Mở khoá tài khoản" : "Kích hoạt lại tài khoản", onClick: () => changeStatus(user, "ACTIVE"), disabled: lock.isPending }]
      : []),
    ...(user.id !== session.user?.id && canDeleteUser
      ? [{ icon: <Trash2 />, label: "Xoá tài khoản", danger: true, onClick: () => setDeletingUser(user) }]
      : []),
  ];

  if (session.ready && !session.can("user.view")) {
    return (
      <ListPage title="Quản lý tài khoản">
        <EmptyState icon={<Users />} title="Bạn không có quyền quản lý tài khoản" />
      </ListPage>
    );
  }

  const hasFilters = Boolean(search.trim() || statusFilter !== "ALL");

  return (
    <ListPage title="Hồ sơ tài khoản">
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border bg-white px-3 py-1.5 sm:px-4">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:w-auto sm:flex-1">
          <div className="relative w-full min-w-0 sm:min-w-[170px] sm:max-w-[240px] sm:flex-1">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder="Tìm email, họ tên, mã SV…" className="h-8 pl-8 pr-7 text-xs" />
            {search && (
              <button type="button" aria-label="Xoá tìm kiếm" onClick={() => { setSearch(""); setOffset(0); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>
          <FilterPopover activeCount={statusFilter !== "ALL" ? 1 : 0} onClear={() => { setStatusFilter("ALL"); setOffset(0); }} title="Lọc tài khoản">
            <FormField label="Trạng thái tài khoản" hideIndicator>
              <Select aria-label="Lọc theo trạng thái" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-8 text-xs">
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="LOCKED">Tạm khoá</option>
                <option value="INACTIVE">Vô hiệu hoá</option>
                <option value="MUST_CHANGE">Chờ đổi mật khẩu</option>
              </Select>
            </FormField>
          </FilterPopover>
          {hasFilters && (
            <Button variant="outline" size="sm" className="h-8" onClick={() => { setSearch(""); setStatusFilter("ALL"); setOffset(0); }}>
              <FilterX size={13} /> Xoá lọc
            </Button>
          )}
        </div>
        <div className="flex w-full max-w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:shrink-0">
          <CountBadge>{users.data?.total ?? 0} tài khoản</CountBadge>
          {session.can("user.create") && (
            <Button size="sm" className="h-8" onClick={() => setCreating(true)}>
              <Plus size={14} /> Tạo tài khoản
            </Button>
          )}
        </div>
      </div>

      <StatSummaryStrip
        className="shrink-0 px-3 pt-2.5 sm:px-5"
        items={[
          {
            label: "Tổng số tài khoản hệ thống",
            value: sysStats.data?.totalUsers ?? users.data?.total ?? 0,
            sub: sysStats.data ? `${sysStats.data.activeClubs}/${sysStats.data.totalClubs} CLB đang hoạt động` : undefined,
            icon: Users,
          },
          {
            label: "Tài khoản đang hoạt động",
            value: sysStats.data?.activeUsers ?? activeCount,
            sub: sysStats.data
              ? `${sysStats.data.roleBreakdown.reduce((s, r) => s + r.distinctUserCount, 0)} người giữ chức vụ`
              : undefined,
            icon: CheckCircle2,
            iconClassName: "bg-slate-100 text-slate-700",
          },
          {
            label: "Tạm khoá / Vô hiệu hoá",
            value: sysStats.data ? sysStats.data.lockedUsers + sysStats.data.inactiveUsers : lockedCount,
            sub: sysStats.data ? `${sysStats.data.anonymizedUsers} tài khoản đã ẩn danh PII` : undefined,
            icon: Lock,
            iconClassName: "bg-slate-100 text-slate-700",
          },
          {
            label: "Chờ đổi mật khẩu đầu",
            value: mustChangeCount,
            valueClassName: "text-primary",
            sub: "Trang hiện tại",
            icon: ShieldAlert,
          },
        ]}
      />

      {notice && (
        <div className="px-4 pt-3 sm:px-6">
          <Notice tone="success">{notice}</Notice>
        </div>
      )}
      {lock.error && (
        <div className="px-4 pt-3 sm:px-6">
          <Notice tone="error">{describeError(lock.error)}</Notice>
        </div>
      )}

      {users.isPending ? (
        <LoadingRows />
      ) : users.isError ? (
        <ErrorState message={describeError(users.error)} onRetry={() => users.refetch()} />
      ) : !filteredRows.length ? (
        <EmptyState icon={<Users />} title="Không tìm thấy tài khoản phù hợp" />
      ) : (
        <DataTable
          ariaLabel="Tài khoản"
          rows={filteredRows}
          rowKey={(u) => u.id}
          onRowClick={setDetail}
          columns={[
            {
              key: "user",
              header: "Người dùng",
              sortValue: (u) => u.fullName || u.email,
              render: (u) => (
                <div className="flex items-center gap-2.5">
                  <UserAvatar avatarUrl={u.avatarUrl} name={u.fullName} email={u.email} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="max-w-36 truncate font-bold text-foreground" title={u.fullName || u.email}>{u.fullName || "—"}</p>
                      {u.requiresPasswordChange && <Badge tone="pending" dot={false}>Đổi MK</Badge>}
                    </div>
                    <p className="max-w-36 truncate text-[11px] text-muted-foreground" title={u.email}>{u.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "code",
              header: "MSSV",
              className: "whitespace-nowrap",
              sortValue: (u) => u.studentCode ?? "",
              render: (u) =>
                u.studentCode ? (
                  <code className="inline-block max-w-22 truncate rounded-md bg-primary/8 px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary" title={u.studentCode}>
                    {u.studentCode}
                  </code>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            {
              key: "role",
              header: "Chức vụ",
              render: (u) => <UserRoleClubCell userId={u.id} clubsById={clubsById} canViewRoles={canViewUserRoles} mode="role" />,
            },
            {
              key: "club",
              header: "Câu lạc bộ",
              render: (u) => <UserRoleClubCell userId={u.id} clubsById={clubsById} canViewRoles={canViewUserRoles} mode="club" />,
            },
            {
              key: "phone",
              header: "Điện thoại",
              className: "whitespace-nowrap",
              render: (u) => <span className="font-mono text-muted-foreground">{u.phone || "—"}</span>,
            },
            {
              key: "created",
              header: "Ngày tạo",
              className: "whitespace-nowrap",
              sortValue: (u) => u.createdAt ?? "",
              render: (u) => <span className="font-mono text-muted-foreground">{formatDay(u.createdAt)}</span>,
            },
            {
              key: "status",
              header: "Trạng thái",
              className: "whitespace-nowrap",
              sortValue: (u) => u.status,
              render: (u) => <StatusBadge status={u.status} />,
            },
            {
              key: "actions",
              header: "Thao tác",
              className: "text-right",
              render: (u) => <TableRowActions actions={actionsFor(u)} />,
            },
          ]}
        />
      )}
      {users.data && <Pagination offset={offset} limit={limit} total={users.data.total} onOffset={setOffset} onLimit={setLimit} />}

      <CreateUserModal
        open={creating}
        onClose={() => setCreating(false)}
        canAssign={canAssign}
        roles={options.roles}
        clubs={options.clubs}
        googleDomains={googleDomains}
        onSuccess={(user, forceChange) => {
          setNotice(
            isGoogleEmail(user.email)
              ? `Đã tạo tài khoản ${user.email}. Sinh viên đăng nhập bằng nút "Đăng nhập bằng Google" với email trường, không cần mật khẩu.`
              : `Đã tạo tài khoản ${user.email}. Gửi mật khẩu ban đầu cho người dùng qua kênh riêng${forceChange ? "; họ sẽ phải đổi mật khẩu ở lần đăng nhập đầu" : ""}.`
          );
          refresh();
        }}
      />

      <ResetUserPasswordModal
        user={resetFor}
        onClose={() => setResetFor(null)}
        onSuccess={(user) => {
          setNotice(
            `Đã đặt lại mật khẩu cho ${user.email}. Mọi phiên đăng nhập cũ của người này đã bị đăng xuất.`
          );
          refresh();
        }}
      />

      <UserDetailDrawer
        key={detail?.id ?? "user-detail-none"}
        detail={detail}
        onClose={() => setDetail(null)}
        roles={options.roles}
        clubs={options.clubs}
        onUserUpdated={(updated, msg) => {
          setDetail(updated);
          setNotice(msg);
          refresh();
        }}
        onRequestDelete={(u) => setDeletingUser(u)}
      />

      <DeleteUserAccountModal
        user={deletingUser}
        onClose={() => setDeletingUser(null)}
        onSuccess={(user) => {
          setNotice(
            `Đã xử lý xoá / ẩn danh PII cho tài khoản ${user.email}. Mọi dữ liệu lịch sử câu lạc bộ vẫn được bảo toàn.`
          );
          setDetail(null);
          refresh();
        }}
      />
    </ListPage>
  );
}
