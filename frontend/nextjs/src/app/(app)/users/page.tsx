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
  Plus,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { apiModel, PermissionItem, Scope, User, UserPermission, UserRole } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import {
  EMPTY_ROLE_DRAFT,
  RoleDraft,
  RolePicker,
  roleLabel,
  scopeLabel,
  toAssignment,
  useRoleOptions,
} from "@/components/shared/RolePicker";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { RowAction, TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { useGoogleSignIn } from "@/components/shared/GoogleSignInButton";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";

const LIMIT = 20;
const EMPTY_FORM = { email: "", fullName: "", studentCode: "", phone: "", password: "" };

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-4 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export default function UsersPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "LOCKED" | "INACTIVE" | "MUST_CHANGE">("ALL");
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [forceChange, setForceChange] = useState(true);
  const [roleDrafts, setRoleDrafts] = useState<RoleDraft[]>([]);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetForceChange, setResetForceChange] = useState(true);
  const [assignDraft, setAssignDraft] = useState<RoleDraft>(EMPTY_ROLE_DRAFT);
  const [permId, setPermId] = useState("");
  const [permScope, setPermScope] = useState<Scope>("CLUB");
  const [permClubId, setPermClubId] = useState("");
  const [permDeptId, setPermDeptId] = useState("");
  const [permReason, setPermReason] = useState("");
  const [detail, setDetail] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editStudentCode, setEditStudentCode] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [notice, setNotice] = useState("");

  const openDetail = (user: User) => {
    setDetail(user);
    setEditFullName(user.fullName ?? "");
    setEditStudentCode(user.studentCode ?? "");
    setEditPhone(user.phone ?? "");
  };

  const users = useQuery({
    queryKey: ["users", search, offset],
    queryFn: () => apiModel.users(search, offset, LIMIT),
    placeholderData: keepPreviousData,
    enabled: session.can("user.view"),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });
  const canAssign = session.can("permission.assign");
  const canUpdateUser = session.can("user.update");
  const canDeleteUser = session.can("user.delete");
  const options = useRoleOptions(canAssign);
  const pendingRoles = roleDrafts.map((d) => toAssignment(d, options.roles));
  const rolesIncomplete = pendingRoles.some((r) => r === null);
  const detailRoles = useQuery({
    queryKey: ["user-roles", detail?.id],
    queryFn: () => apiModel.userRoles(detail!.id),
    enabled: !!detail && session.can("permission.view"),
  });
  const detailPermissions = useQuery({
    queryKey: ["user-permissions", detail?.id],
    queryFn: () => apiModel.userPermissions(detail!.id),
    enabled: !!detail && session.can("permission.view"),
  });
  const detailEffective = useQuery({
    queryKey: ["user-effective-permissions", detail?.id],
    queryFn: () => apiModel.userEffectivePermissions(detail!.id),
    enabled: !!detail && session.can("permission.view"),
  });
  const permGroups = useQuery({
    queryKey: ["permission-groups"],
    queryFn: () => apiModel.permissionGroups(),
    enabled: !!detail && session.can("permission.view"),
  });
  const permDepartments = useQuery({
    queryKey: ["perm-departments", permClubId],
    queryFn: () => apiModel.departments(permClubId),
    enabled: !!detail && permScope === "DEPARTMENT" && !!permClubId,
  });
  const allPermissions = useMemo<PermissionItem[]>(
    () => (permGroups.data ?? []).flatMap((g) => g.permissions).filter((p) => p.active),
    [permGroups.data]
  );
  const selectedPerm = allPermissions.find((p) => p.id === permId);
  const clubName = (id?: string) => options.clubs.find((c) => c.id === id)?.name ?? id;
  const google = useGoogleSignIn();
  const googleDomains = google.data?.enabled ? google.data.allowedDomains : [];
  const isGoogleEmail = (email: string) =>
    googleDomains.some((d) => email.trim().toLowerCase().endsWith(`@${d.toLowerCase()}`));
  const googleAccount = isGoogleEmail(form.email);
  const studentNeedsSchoolEmail =
    googleDomains.length > 0 && !!form.studentCode.trim() && !!form.email && !googleAccount;

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

  const create = useMutation({
    mutationFn: () =>
      apiModel.createUser({
        email: form.email,
        fullName: form.fullName,
        password: googleAccount ? undefined : form.password,
        studentCode: form.studentCode || undefined,
        phone: form.phone || undefined,
        requiresPasswordChange: googleAccount ? false : forceChange,
        roles: pendingRoles.filter((r) => r !== null),
      }),
    onSuccess: (user) => {
      setNotice(
        isGoogleEmail(user.email)
          ? `Đã tạo tài khoản ${user.email}. Sinh viên đăng nhập bằng nút "Đăng nhập bằng Google" với email trường, không cần mật khẩu.`
          : `Đã tạo tài khoản ${user.email}. Gửi mật khẩu ban đầu cho người dùng qua kênh riêng${forceChange ? "; họ sẽ phải đổi mật khẩu ở lần đăng nhập đầu" : ""}.`
      );
      setCreating(false);
      setForm(EMPTY_FORM);
      setRoleDrafts([]);
      setForceChange(true);
      refresh();
    },
  });
  const updateProfile = useMutation({
    mutationFn: () =>
      apiModel.updateUser(detail!.id, {
        fullName: editFullName.trim() || undefined,
        studentCode: editStudentCode.trim() || undefined,
        phone: editPhone.trim() || undefined,
      }),
    onSuccess: (updated) => {
      setNotice(`Đã cập nhật thông tin tài khoản ${updated.email}.`);
      setDetail(updated);
      refresh();
    },
  });
  const deleteAccount = useMutation({
    mutationFn: (user: User) => apiModel.deleteUser(user.id),
    onSuccess: (_, user) => {
      setNotice(`Đã xoá tài khoản ${user.email}.`);
      setDetail(null);
      refresh();
    },
  });
  const reset = useMutation({
    mutationFn: () => apiModel.resetPassword(resetFor!.id, newPassword, resetForceChange),
    onSuccess: () => {
      setNotice(
        `Đã đặt lại mật khẩu cho ${resetFor!.email}. Mọi phiên đăng nhập cũ của người này đã bị đăng xuất.`
      );
      setResetFor(null);
      setNewPassword("");
      setResetForceChange(true);
      refresh();
    },
  });
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

  const assign = useMutation({
    mutationFn: () => apiModel.assignRole(detail!.id, toAssignment(assignDraft, options.roles)!),
    onSuccess: () => {
      setAssignDraft(EMPTY_ROLE_DRAFT);
      detailRoles.refetch();
      detailEffective.refetch();
    },
  });
  const revoke = useMutation({
    mutationFn: (assignment: UserRole) => apiModel.revokeRole(assignment.userId, assignment.id),
    onSuccess: () => {
      detailRoles.refetch();
      detailEffective.refetch();
    },
  });
  const grantDirectPerm = useMutation({
    mutationFn: () =>
      apiModel.grantPermission(detail!.id, {
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
    },
  });
  const revokeDirectPerm = useMutation({
    mutationFn: (perm: UserPermission) =>
      apiModel.revokePermission(detail!.id, perm.permissionId, {
        scope: perm.scope,
        clubId: perm.clubId,
        departmentId: perm.departmentId,
      }),
    onSuccess: () => {
      detailPermissions.refetch();
      detailEffective.refetch();
    },
  });
  const removeRole = (assignment: UserRole) => {
    if (confirm(`Thu hồi vai trò ${roleLabel(assignment)} của ${detail?.email}?`)) revoke.mutate(assignment);
  };
  const assignmentTarget = (a: { scope: string; clubId?: string; departmentId?: string }) =>
    a.scope === "GLOBAL"
      ? scopeLabel("GLOBAL")
      : a.scope === "CLUB"
        ? `CLB ${clubName(a.clubId)}`
        : "Theo ban chuyên môn";

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
  const confirmDelete = (user: User) => {
    if (confirm(`Xoá vĩnh viễn tài khoản ${user.email}? Thao tác này không thể hoàn tác.`))
      deleteAccount.mutate(user);
  };
  const actionsFor = (user: User): RowAction[] => [
    { icon: <Eye />, label: "Xem chi tiết", onClick: () => openDetail(user) },
    ...(canUpdateUser ? [{ icon: <Pencil />, label: "Sửa thông tin", onClick: () => openDetail(user) }] : []),
    ...(session.can("user.reset_password") && !isGoogleEmail(user.email)
      ? [
          {
            icon: <KeyRound />,
            label: "Đặt lại mật khẩu",
            onClick: () => {
              setResetFor(user);
              setNewPassword("");
              reset.reset();
            },
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
            onClick: () => confirmDelete(user),
            disabled: deleteAccount.isPending,
          },
        ]
      : []),
  ];
  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

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
        onAdd={
          session.can("user.create")
            ? () => {
                setCreating(true);
                create.reset();
                setRoleDrafts(canAssign ? [EMPTY_ROLE_DRAFT] : []);
              }
            : undefined
        }
      />

      {/* Thanh chỉ số tổng quan cân đối */}
      <div className="grid shrink-0 grid-cols-2 gap-3 px-4 pt-4 sm:px-6 lg:grid-cols-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Tổng số tài khoản</p>
            <p className="mt-1 font-mono text-xl font-extrabold text-slate-900">{users.data?.total ?? 0}</p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users size={17} />
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Đang hoạt động (trang này)</p>
            <p className="mt-1 font-mono text-xl font-extrabold text-slate-900">
              {activeCount}
            </p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <CheckCircle2 size={17} />
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Tạm khoá / Ngừng HĐ</p>
            <p className="mt-1 font-mono text-xl font-extrabold text-slate-900">
              {lockedCount}
            </p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Lock size={17} />
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Chờ đổi mật khẩu đầu</p>
            <p className="mt-1 font-mono text-xl font-extrabold text-primary">{mustChangeCount}</p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldAlert size={17} />
          </span>
        </div>
      </div>

      {notice && (
        <div className="px-4 pt-3 sm:px-6">
          <Notice tone="success">{notice}</Notice>
        </div>
      )}
      {(lock.error || deleteAccount.error || updateProfile.error) && (
        <div className="px-4 pt-3 sm:px-6">
          <Notice tone="error">
            {describeError(lock.error || deleteAccount.error || updateProfile.error)}
          </Notice>
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
          onRowClick={openDetail}
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

      <ModalShell
        open={creating}
        onClose={() => setCreating(false)}
        title="Tạo tài khoản mới"
        icon={<UserPlus />}
        onSubmit={() => create.mutate()}
        submitLabel="Tạo tài khoản"
        submitLoading={create.isPending}
        submitDisabled={
          !form.email ||
          !form.fullName ||
          (!googleAccount && form.password.length < 8) ||
          studentNeedsSchoolEmail ||
          rolesIncomplete
        }
      >
        <FormField label="Email" required>
          <Input
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={set("email")}
            placeholder={googleDomains[0] ? `masv@${googleDomains[0]}` : "sinhvien@vju.ac.vn"}
          />
        </FormField>
        <FormField label="Họ và tên" required>
          <Input value={form.fullName} onChange={set("fullName")} placeholder="Nguyễn Văn A" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Mã sinh viên">
            <Input value={form.studentCode} onChange={set("studentCode")} placeholder="22110001" />
          </FormField>
          <FormField label="Điện thoại">
            <Input value={form.phone} onChange={set("phone")} placeholder="0901234567" />
          </FormField>
        </div>
        {studentNeedsSchoolEmail && (
          <p className="text-xs text-destructive">
            Tài khoản sinh viên (có mã sinh viên) phải dùng email @{googleDomains[0]}.
          </p>
        )}
        {googleAccount ? (
          <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs leading-5">
            Sinh viên này sẽ đăng nhập bằng <b>tài khoản Google của trường</b> ({form.email.trim()}), không
            cần mật khẩu. Chỉ cần báo cho sinh viên vào trang đăng nhập và bấm &quot;Đăng nhập bằng
            Google&quot;.
          </p>
        ) : (
          <>
            <FormField
              label="Mật khẩu ban đầu"
              required
              hint="Tối thiểu 8 ký tự. Gửi cho người dùng qua kênh riêng."
            >
              <Input type="text" autoComplete="new-password" value={form.password} onChange={set("password")} />
            </FormField>
            <Checkbox
              checked={forceChange}
              onChange={setForceChange}
              label="Bắt buộc người dùng đổi mật khẩu ở lần đăng nhập đầu (khuyến nghị)"
            />
          </>
        )}
        {canAssign && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Vai trò & Phạm vi</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRoleDrafts((d) => [...d, EMPTY_ROLE_DRAFT])}
              >
                <Plus size={14} /> Thêm vai trò
              </Button>
            </div>
            {roleDrafts.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Chưa gán vai trò: tài khoản sẽ là tài khoản sinh viên mặc định cho tới khi được bổ nhiệm.
              </p>
            )}
            {roleDrafts.map((draft, index) => (
              <RolePicker
                key={index}
                value={draft}
                roles={options.roles}
                clubs={options.clubs}
                onChange={(value) => setRoleDrafts((d) => d.map((x, i) => (i === index ? value : x)))}
                onRemove={() => setRoleDrafts((d) => d.filter((_, i) => i !== index))}
              />
            ))}
            <p className="text-xs text-muted-foreground">
              Bạn chỉ gán được vai trò gồm các quyền mà chính bạn đang có.
            </p>
          </div>
        )}
        {create.error && <p className="text-xs text-destructive">{describeError(create.error)}</p>}
      </ModalShell>

      <ModalShell
        open={!!resetFor}
        onClose={() => setResetFor(null)}
        title="Đặt lại mật khẩu"
        icon={<KeyRound />}
        size="sm"
        onSubmit={() => reset.mutate()}
        submitLabel="Đặt lại"
        submitLoading={reset.isPending}
        submitDisabled={newPassword.length < 8}
      >
        <p className="text-sm">
          Tài khoản: <b>{resetFor?.email}</b>
        </p>
        <FormField label="Mật khẩu mới" required hint="Mọi phiên đăng nhập hiện có của người này sẽ bị đăng xuất.">
          <Input
            type="text"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </FormField>
        <Checkbox
          checked={resetForceChange}
          onChange={setResetForceChange}
          label="Bắt buộc đổi lại mật khẩu ở lần đăng nhập tiếp theo"
        />
        {reset.error && <p className="text-xs text-destructive">{describeError(reset.error)}</p>}
      </ModalShell>

      <EntityDrawer
        open={!!detail}
        onClose={() => {
          setDetail(null);
          setAssignDraft(EMPTY_ROLE_DRAFT);
          assign.reset();
          revoke.reset();
          updateProfile.reset();
        }}
        title={detail?.fullName ?? ""}
        subtitle={detail?.email}
        icon={<Users />}
        footer={
          detail && detail.id !== session.user?.id && canDeleteUser ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteAccount.isPending}
              onClick={() => confirmDelete(detail)}
            >
              <Trash2 size={14} /> Xoá tài khoản
            </Button>
          ) : undefined
        }
      >
        {detail && (
          <DetailList
            rows={[
              ["Email", <span key="e" className="font-mono">{detail.email}</span>],
              ["Họ và tên", detail.fullName || "—"],
              ["Mã sinh viên", detail.studentCode || "—"],
              ["Điện thoại", detail.phone || "—"],
              ["Trạng thái", <StatusBadge key="s" status={detail.status} />],
              [
                "Mật khẩu",
                detail.requiresPasswordChange ? (
                  <Badge key="p" tone="pending">
                    Chờ người dùng đổi mật khẩu
                  </Badge>
                ) : (
                  "Đã tự đặt"
                ),
              ],
              ["Ngày tạo", formatDateTime(detail.createdAt)],
              ["Cập nhật", formatDateTime(detail.updatedAt)],
            ]}
          />
        )}
        {detail && canUpdateUser && (
          <Section title="Cập nhật thông tin tài khoản" icon={<Pencil />}>
            <FormField label="Họ và tên" required>
              <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Mã sinh viên">
                <Input value={editStudentCode} onChange={(e) => setEditStudentCode(e.target.value)} />
              </FormField>
              <FormField label="Điện thoại">
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </FormField>
            </div>
            <Button
              size="sm"
              className="justify-self-end"
              disabled={!editFullName.trim() || updateProfile.isPending}
              onClick={() => updateProfile.mutate()}
            >
              <Save size={14} /> {updateProfile.isPending ? "Đang lưu…" : "Lưu thay đổi"}
            </Button>
          </Section>
        )}
        {detail && session.can("permission.view") && (
          <Section title="Vai trò được bổ nhiệm" icon={<ShieldCheck />}>
            {detailRoles.isPending ? (
              <LoadingRows rows={2} />
            ) : detailRoles.isError ? (
              <ErrorState message={describeError(detailRoles.error)} />
            ) : !detailRoles.data.length ? (
              <p className="text-sm text-muted-foreground">Chưa có vai trò nào được gán.</p>
            ) : (
              <ul className="grid gap-2">
                {detailRoles.data.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{roleLabel(a)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {assignmentTarget(a)} · từ {formatDay(a.grantedAt)}
                      </p>
                    </div>
                    {session.can("permission.revoke") && (
                      <button
                        type="button"
                        aria-label="Thu hồi vai trò"
                        onClick={() => removeRole(a)}
                        disabled={revoke.isPending}
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {revoke.error && <p className="mt-2 text-xs text-destructive">{describeError(revoke.error)}</p>}
            {canAssign && (
              <div className="mt-3 space-y-2">
                <RolePicker
                  value={assignDraft}
                  onChange={setAssignDraft}
                  roles={options.roles}
                  clubs={options.clubs}
                />
                <Button
                  size="sm"
                  disabled={!toAssignment(assignDraft, options.roles) || assign.isPending}
                  onClick={() => assign.mutate()}
                >
                  <Plus size={14} /> Gán vai trò
                </Button>
                {assign.error && <p className="text-xs text-destructive">{describeError(assign.error)}</p>}
              </div>
            )}
          </Section>
        )}
        {detail && session.can("permission.view") && (
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
                    {session.can("permission.revoke") && (
                      <button
                        type="button"
                        aria-label="Thu hồi quyền trực tiếp"
                        onClick={() => {
                          if (confirm(`Thu hồi quyền trực tiếp ${p.permissionKey} của ${detail.email}?`)) {
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
                        {options.clubs.map((c) => (
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
        )}
        {detail && session.can("permission.view") && (
          <Section title="Quyền hiệu lực tổng hợp (PB-09.1, PB-09.2)" icon={<Sparkles />}>
            {detailEffective.isPending ? (
              <LoadingRows rows={2} />
            ) : detailEffective.isError ? (
              <ErrorState message={describeError(detailEffective.error)} />
            ) : !detailEffective.data.length ? (
              <p className="text-sm text-muted-foreground">Tài khoản hiện chưa có quyền hiệu lực nào.</p>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-border/60 divide-y divide-border/50">
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
        )}
      </EntityDrawer>
    </ListPage>
  );
}
