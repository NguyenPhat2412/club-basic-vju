"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle2,
  Eye,
  KeyRound,
  Lock,
  LockOpen,
  Pencil,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import { apiModel, User } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { useRoleOptions } from "@/components/shared/RolePicker";
import { Pagination } from "@/components/shared/Pagination";
import { StatSummaryStrip } from "@/components/shared/StatCards";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { RowAction, TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { useGoogleSignIn } from "@/components/shared/GoogleSignInButton";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { formatDay } from "@/lib/utils";
import {
  CreateUserModal,
  DeleteUserAccountModal,
  ResetUserPasswordModal,
} from "@/components/user/UserAccountModals";
import { UserDetailDrawer } from "@/components/user/UserDetailDrawer";

const LIMIT = 20;

export function UsersManagementView() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "LOCKED" | "INACTIVE" | "MUST_CHANGE">("ALL");
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [detail, setDetail] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [notice, setNotice] = useState("");

  const users = useQuery({
    queryKey: ["users", search, offset],
    queryFn: () => apiModel.users(search, offset, LIMIT),
    placeholderData: keepPreviousData,
    enabled: session.can("user.view"),
  });
  const sysStats = useQuery({
    queryKey: ["system-statistics"],
    queryFn: () => apiModel.systemStatistics(),
    enabled: session.can("user.view"),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["system-statistics"] });
  };

  const canAssign = session.can("permission.assign");
  const canUpdateUser = session.can("user.update");
  const canDeleteUser = session.can("user.delete");
  const options = useRoleOptions(canAssign);
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
            ? `Đã khoá tạm thời tài khoản ${user.email} (PB-05.3) và đăng xuất mọi phiên.`
            : `Đã vô hiệu hoá tài khoản ${user.email} (PB-05.4) và đăng xuất mọi phiên.`
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
          ? `Khoá tạm thời tài khoản ${user.email} (PB-05.3)? Người này sẽ bị đăng xuất ngay.`
          : `Vô hiệu hoá tài khoản ${user.email} (PB-05.4)? Người này sẽ bị đăng xuất ngay.`
      )
    )
      return;
    lock.mutate({ user, nextStatus });
  };

  const actionsFor = (user: User): RowAction[] => [
    { icon: <Eye />, label: "Xem chi tiết", onClick: () => setDetail(user) },
    ...(canUpdateUser ? [{ icon: <Pencil />, label: "Sửa thông tin", onClick: () => setDetail(user) }] : []),
    ...(session.can("user.reset_password") && !isGoogleEmail(user.email)
      ? [
          {
            icon: <KeyRound />,
            label: "Đặt lại mật khẩu",
            onClick: () => setResetFor(user),
          },
        ]
      : []),
    ...(user.id !== session.user?.id && user.status === "ACTIVE" && session.can("user.inactive")
      ? [
          {
            icon: <Lock />,
            label: "Khoá tạm thời (PB-05.3)",
            onClick: () => changeStatus(user, "LOCKED"),
            disabled: lock.isPending,
          },
          {
            icon: <Ban />,
            label: "Vô hiệu hoá (PB-05.4)",
            danger: true,
            onClick: () => changeStatus(user, "INACTIVE"),
            disabled: lock.isPending,
          },
        ]
      : []),
    ...(user.id !== session.user?.id && user.status !== "ACTIVE" && session.can("user.active")
      ? [
          {
            icon: <LockOpen />,
            label: user.status === "LOCKED" ? "Mở khoá tài khoản" : "Kích hoạt lại tài khoản",
            onClick: () => changeStatus(user, "ACTIVE"),
            disabled: lock.isPending,
          },
        ]
      : []),
    ...(user.id !== session.user?.id && canDeleteUser
      ? [
          {
            icon: <Trash2 />,
            label: "Xoá tài khoản",
            danger: true,
            onClick: () => setDeletingUser(user),
          },
        ]
      : []),
  ];

  if (session.ready && !session.can("user.view")) {
    return (
      <ListPage title="Quản lý tài khoản">
        <EmptyState icon={<Users />} title="Bạn không có quyền quản lý tài khoản" />
      </ListPage>
    );
  }

  return (
    <ListPage title="Hồ sơ tài khoản">
      <BreadcrumbToolbar
        crumbs={[
          { label: "Tổng quan", href: "/dashboard" },
          { label: "Quản trị hệ thống" },
          { label: "Hồ sơ tài khoản" },
        ]}
        titleBadge={<CountBadge>{users.data?.total ?? 0} tài khoản</CountBadge>}
        search={{
          value: search,
          onChange: (v) => {
            setSearch(v);
            setOffset(0);
          },
          placeholder: "Tìm email, họ tên, mã SV…",
        }}
        extraActions={
          <Select
            aria-label="Lọc theo trạng thái"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-9 w-44 text-xs"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Tạm khoá (PB-05.3)</option>
            <option value="INACTIVE">Vô hiệu hoá (PB-05.4)</option>
            <option value="MUST_CHANGE">Chờ đổi mật khẩu</option>
          </Select>
        }
        onRefresh={() => users.refetch()}
        addLabel="Tạo tài khoản"
        onAdd={session.can("user.create") ? () => setCreating(true) : undefined}
      />

      <StatSummaryStrip
        className="shrink-0 px-4 pt-4 sm:px-6"
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
              render: (u) => (
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary">
                    {(u.fullName ?? u.email).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="max-w-60 truncate font-bold text-foreground">{u.fullName || "—"}</p>
                    <p className="max-w-60 truncate text-[11px] text-muted-foreground">{u.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "code",
              header: "Mã sinh viên",
              render: (u) =>
                u.studentCode ? (
                  <code className="rounded-md bg-primary/8 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                    {u.studentCode}
                  </code>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            {
              key: "phone",
              header: "Điện thoại",
              render: (u) => <span className="font-mono text-muted-foreground">{u.phone || "—"}</span>,
            },
            {
              key: "security",
              header: "Bảo mật",
              render: (u) =>
                u.requiresPasswordChange ? (
                  <Badge tone="pending">Chờ đổi MK lần đầu</Badge>
                ) : (
                  <Badge tone="neutral">Đã thiết lập</Badge>
                ),
            },
            {
              key: "created",
              header: "Ngày tạo",
              render: (u) => <span className="font-mono font-semibold text-foreground">{formatDay(u.createdAt)}</span>,
            },
            { key: "status", header: "Trạng thái", render: (u) => <StatusBadge status={u.status} /> },
            {
              key: "actions",
              header: "Thao tác",
              className: "text-right",
              render: (u) => <TableRowActions actions={actionsFor(u)} />,
            },
          ]}
        />
      )}
      {users.data && <Pagination offset={offset} limit={LIMIT} total={users.data.total} onOffset={setOffset} />}

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
