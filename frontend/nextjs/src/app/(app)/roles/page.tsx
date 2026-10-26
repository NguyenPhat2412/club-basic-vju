"use client";
import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  KeyRound,
  Layers,
  Lock,
  Plus,
  Save,
  Search,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { apiModel, PermissionItem, Role, Scope } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { roleLabel, scopeLabel } from "@/components/shared/RolePicker";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { ModalShell } from "@/components/shared/Overlays";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { Badge, CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BREADTH: Record<Scope, number> = { DEPARTMENT: 0, CLUB: 1, GLOBAL: 2 };
const MODULE_LABELS: Record<string, string> = {
  user: "Tài khoản người dùng",
  club: "Câu lạc bộ",
  department: "Ban chuyên môn",
  member: "Thành viên CLB",
  "department.member": "Thành viên ban",
  permission: "Bổ nhiệm & Phân quyền",
  role: "Vai trò & Ma trận quyền",
  audit: "Nhật ký hệ thống",
  application: "Đơn đăng ký & Tuyển quân",
  document: "Quy chế & Kho tài liệu",
  event: "Sự kiện & Lịch sinh hoạt",
  task: "Công việc & Tiến độ",
  chat: "Kênh trao đổi & AI",
  notification: "Thông báo",
};

const PERMISSION_META: Record<string, { label: string; description: string }> = {
  // Đơn đăng ký
  "application.view": { label: "Xem danh sách đơn đăng ký", description: "Xem danh sách đơn xin gia nhập câu lạc bộ" },
  "application.view_detail": { label: "Xem chi tiết đơn đăng ký", description: "Xem nội dung chi tiết từng hồ sơ đăng ký" },
  "application.create": { label: "Gửi đơn đăng ký", description: "Nộp đơn xin gia nhập câu lạc bộ" },
  "application.cancel": { label: "Huỷ đơn đăng ký", description: "Huỷ đơn đăng ký đang chờ xét duyệt" },
  "application.review": { label: "Xét duyệt đơn đăng ký", description: "Đánh giá hồ sơ ứng viên đăng ký vào câu lạc bộ" },
  "application.approve": { label: "Phê duyệt đơn đăng ký", description: "Chấp thuận đơn đăng ký và kết nạp thành viên vào CLB" },
  "application.reject": { label: "Từ chối đơn đăng ký", description: "Từ chối hồ sơ đăng ký gia nhập câu lạc bộ" },
  "application.manage_form": { label: "Quản lý biểu mẫu tuyển thành viên", description: "Tạo và cấu hình biểu mẫu đơn đăng ký câu lạc bộ" },
  "application.update": { label: "Cập nhật đơn đăng ký", description: "Chỉnh sửa thông tin hồ sơ đăng ký câu lạc bộ" },
  "application.delete": { label: "Xoá đơn đăng ký", description: "Xoá hồ sơ đăng ký khỏi danh sách" },

  // Nhật ký
  "audit.view": { label: "Xem nhật ký hệ thống", description: "Tra cứu lịch sử thao tác và thay đổi dữ liệu trên toàn hệ thống" },

  // Kênh chat & AI
  "chat.view": { label: "Xem kênh trao đổi nội bộ", description: "Truy cập các kênh thảo luận và đọc tin nhắn trong CLB / Ban" },
  "chat.send": { label: "Tạo kênh & gửi tin nhắn", description: "Tạo kênh trao đổi mới và gửi tin nhắn thảo luận" },
  "chat.summarize": { label: "Tóm tắt thảo luận bằng AI", description: "Dùng trợ lý AI tóm tắt nội dung họp, quyết định và gợi ý công việc" },

  // Câu lạc bộ
  "club.view": { label: "Xem thông tin câu lạc bộ", description: "Xem thông tin chi tiết và danh sách câu lạc bộ" },
  "club.create": { label: "Tạo câu lạc bộ mới", description: "Thành lập câu lạc bộ mới trên hệ thống" },
  "club.update": { label: "Cập nhật thông tin câu lạc bộ", description: "Chỉnh sửa tên, giới thiệu, lĩnh vực hoạt động và liên hệ của CLB" },
  "club.active": { label: "Kích hoạt câu lạc bộ", description: "Mở lại trạng thái hoạt động cho câu lạc bộ" },
  "club.inactive": { label: "Ngừng hoạt động câu lạc bộ", description: "Tạm ngừng hoạt động câu lạc bộ" },

  // Ban chuyên môn
  "department.view": { label: "Xem danh sách ban", description: "Xem cơ cấu các ban chuyên môn trong câu lạc bộ" },
  "department.create": { label: "Tạo ban chuyên môn", description: "Thêm ban chuyên môn mới vào câu lạc bộ" },
  "department.update": { label: "Cập nhật thông tin ban", description: "Chỉnh sửa tên và mô tả nhiệm vụ của ban chuyên môn" },
  "department.activate": { label: "Kích hoạt ban chuyên môn", description: "Mở lại hoạt động cho ban chuyên môn" },
  "department.inactive": { label: "Ngừng hoạt động ban chuyên môn", description: "Tạm ngừng hoạt động ban chuyên môn" },

  // Thành viên ban
  "department.member.view": { label: "Xem thành viên trong ban", description: "Xem danh sách thành viên thuộc từng ban chuyên môn" },
  "department.member.add": { label: "Phân thành viên vào ban", description: "Thêm thành viên câu lạc bộ vào ban chuyên môn" },
  "department.member.remove": { label: "Gỡ thành viên khỏi ban", description: "Đưa thành viên ra khỏi ban chuyên môn" },

  // Tài liệu
  "document.view": { label: "Xem & tải xuống tài liệu", description: "Xem danh sách và tải xuống tài liệu lưu trữ của câu lạc bộ" },
  "document.upload": { label: "Tải lên tài liệu & phiên bản mới", description: "Đăng tải tài liệu mới hoặc cập nhật phiên bản tệp tin" },
  "document.update": { label: "Chỉnh sửa thông tin tài liệu", description: "Đổi tên hiển thị và phân loại của tài liệu" },
  "document.delete": { label: "Chuyển tài liệu vào thùng rác", description: "Xoá mềm tài liệu khỏi danh sách đang sử dụng" },
  "document.restore": { label: "Khôi phục tài liệu đã xoá", description: "Xem thùng rác và khôi phục tài liệu đã xoá mềm" },

  // Sự kiện & Lịch
  "event.view": { label: "Xem sự kiện & lịch sinh hoạt", description: "Xem danh sách sự kiện, lịch sinh hoạt và người đăng ký tham gia" },
  "event.create": { label: "Tạo sự kiện & lịch sinh hoạt", description: "Lên lịch sự kiện, buổi sinh hoạt hoặc hoạt động mới cho CLB / Ban" },
  "event.update": { label: "Cập nhật thông tin & trạng thái sự kiện", description: "Chỉnh sửa nội dung, thời gian và mở/đóng đăng ký sự kiện" },
  "event.attendance": { label: "Điểm danh người tham gia sự kiện", description: "Ghi nhận trạng thái có mặt, đi muộn hoặc vắng mặt tại sự kiện" },

  // Thành viên CLB
  "member.view": { label: "Xem danh sách thành viên CLB", description: "Xem danh sách các thành viên đang tham gia câu lạc bộ" },
  "member.view_detail": { label: "Xem hồ sơ chi tiết thành viên", description: "Xem thông tin chi tiết, ngày tham gia và trạng thái thành viên" },
  "member.add": { label: "Thêm thành viên trực tiếp", description: "Kết nạp trực tiếp tài khoản người dùng vào câu lạc bộ" },
  "member.update": { label: "Cập nhật trạng thái thành viên", description: "Kích hoạt lại, tạm đình chỉ hoặc chuyển trạng thái rời CLB" },
  "member.remove": { label: "Xoá thành viên khỏi câu lạc bộ", description: "Gỡ bỏ thành viên khỏi danh sách câu lạc bộ" },

  // Thông báo
  "notification.send": { label: "Gửi thông báo hàng loạt", description: "Phát thông báo chung tới toàn bộ câu lạc bộ hoặc từng ban chuyên môn" },

  // Phân quyền
  "permission.view": { label: "Xem vai trò & quyền được gán", description: "Xem danh sách vai trò và phạm vi quyền hạn của từng tài khoản" },
  "permission.assign": { label: "Gán vai trò cho tài khoản", description: "Bổ nhiệm vai trò cho người dùng theo toàn hệ thống, CLB hoặc ban" },
  "permission.revoke": { label: "Thu hồi vai trò đã gán", description: "Gỡ bỏ vai trò hiện có của người dùng" },

  // Vai trò
  "role.view": { label: "Xem bảng vai trò & phân quyền", description: "Xem danh sách vai trò và bảng ma trận phân quyền hệ thống" },
  "role.manage": { label: "Quản lý vai trò & phân quyền", description: "Tạo vai trò mới và thay đổi các ô tích quyền của từng vai trò" },

  // Công việc
  "task.view": { label: "Xem danh sách công việc", description: "Theo dõi danh sách công việc và tiến độ thực hiện trong CLB / Ban" },
  "task.create": { label: "Tạo & giao công việc", description: "Tạo đầu việc mới, đặt hạn hoàn thành và phân công cho thành viên" },
  "task.verify": { label: "Nghiệm thu công việc hoàn thành", description: "Kiểm tra và xác nhận hoàn thành đối với công việc đã báo cáo xong" },

  // Tài khoản
  "user.view": { label: "Xem danh sách tài khoản", description: "Tra cứu danh sách và hồ sơ tài khoản người dùng trên hệ thống" },
  "user.create": { label: "Tạo tài khoản mới", description: "Tạo tài khoản người dùng mới và gán vai trò ban đầu" },
  "user.update": { label: "Cập nhật thông tin tài khoản", description: "Chỉnh sửa họ tên, mã sinh viên và số điện thoại của người dùng" },
  "user.reset_password": { label: "Đặt lại mật khẩu tài khoản", description: "Cấp lại mật khẩu mới cho tài khoản người dùng" },
  "user.active": { label: "Mở khoá tài khoản", description: "Kích hoạt lại tài khoản người dùng đang bị khoá" },
  "user.inactive": { label: "Khoá tài khoản", description: "Vô hiệu hoá tài khoản và đăng xuất mọi phiên đăng nhập" },
  "user.delete": { label: "Xoá tài khoản", description: "Xoá tài khoản người dùng khỏi hệ thống" },
};

const ACTION_FALLBACK: Record<string, string> = {
  view: "Xem danh sách",
  view_detail: "Xem chi tiết",
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xoá",
  active: "Kích hoạt",
  activate: "Kích hoạt",
  inactive: "Ngừng hoạt động",
  approve: "Phê duyệt",
  reject: "Từ chối",
  review: "Xét duyệt",
  assign: "Gán quyền",
  revoke: "Thu hồi",
  manage: "Quản lý",
  send: "Gửi",
  upload: "Tải lên",
  restore: "Khôi phục",
  verify: "Nghiệm thu",
  attendance: "Điểm danh",
  summarize: "Tóm tắt AI",
};

function permissionTitle(permission: PermissionItem) {
  const known = PERMISSION_META[permission.permissionKey];
  if (known) return known.label;
  const mod = MODULE_LABELS[permission.module] ?? permission.module;
  const act = ACTION_FALLBACK[permission.action] ?? permission.action;
  return `${act} ${mod.toLowerCase()}`;
}

function permissionDesc(permission: PermissionItem) {
  return PERMISSION_META[permission.permissionKey]?.description ?? `Phạm vi áp dụng: ${scopeLabel(permission.scope)}`;
}

const fitsRole = (permission: PermissionItem, role: Pick<Role, "scope">) =>
  BREADTH[role.scope] >= BREADTH[permission.scope];
const EMPTY_NEW_ROLE = { name: "", scope: "CLUB" as Scope, description: "" };

function codeFromName(name: string) {
  const code = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return /^[A-Z]/.test(code) ? code : code ? `ROLE_${code}` : "";
}

export default function RolesPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const canView = session.can("role.view");
  const canManage = session.can("role.manage");
  const roles = useQuery({ queryKey: ["roles"], queryFn: apiModel.roles, enabled: canView });
  const groups = useQuery({
    queryKey: ["permission-groups"],
    queryFn: apiModel.permissionGroups,
    enabled: canView && session.can("permission.view"),
  });
  const [draft, setDraft] = useState<Record<string, Set<string>>>({});
  const [moduleFilter, setModuleFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"" | Scope>("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState(EMPTY_NEW_ROLE);
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());
  const newCode = codeFromName(newRole.name);
  const allPermissions = (groups.data ?? []).flatMap((g) => g.permissions.filter((p) => p.active));

  const create = useMutation({
    mutationFn: () =>
      apiModel.createRole({
        code: newCode,
        name: newRole.name.trim(),
        description: newRole.description.trim() || undefined,
        scope: newRole.scope,
        permissionIds: allPermissions
          .filter((p) => newKeys.has(p.permissionKey) && fitsRole(p, newRole))
          .map((p) => p.id),
      }),
    onSuccess: async (role) => {
      setNotice(`Đã tạo chức vụ / vai trò "${role.name}". Bạn có thể bổ nhiệm ngay ở trang Hồ sơ tài khoản.`);
      setCreating(false);
      setNewRole(EMPTY_NEW_ROLE);
      setNewKeys(new Set());
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
  const toggleNew = (key: string) =>
    setNewKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const newFitting = allPermissions.filter((p) => newKeys.has(p.permissionKey) && fitsRole(p, newRole));

  const columns = useMemo(
    () =>
      [...(roles.data ?? [])]
        .filter((r) => r.active)
        .sort(
          (a, b) =>
            Number(b.locked) - Number(a.locked) ||
            BREADTH[b.scope] - BREADTH[a.scope] ||
            Number(b.system) - Number(a.system) ||
            a.name.localeCompare(b.name, "vi")
        ),
    [roles.data]
  );
  const idByKey = useMemo(
    () => new Map((groups.data ?? []).flatMap((g) => g.permissions.map((p) => [p.permissionKey, p.id] as const))),
    [groups.data]
  );

  const keysOf = (role: Role) => draft[role.id] ?? new Set(role.permissionKeys);
  const dirtyRoles = columns.filter((role) => {
    const current = draft[role.id];
    if (!current) return false;
    return current.size !== role.permissionKeys.length || role.permissionKeys.some((k) => !current.has(k));
  });

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (groups.data ?? [])
      .filter((g) => !moduleFilter || g.module === moduleFilter)
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter((p) => {
          if (!p.active) return false;
          if (scopeFilter && p.scope !== scopeFilter) return false;
          if (!q) return true;
          const t = permissionTitle(p).toLowerCase();
          const d = permissionDesc(p).toLowerCase();
          return t.includes(q) || d.includes(q);
        }),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [groups.data, moduleFilter, scopeFilter, search]);

  const toggle = (role: Role, key: string) =>
    setDraft((prev) => {
      const next = new Set(prev[role.id] ?? role.permissionKeys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
      setNotice(
        `Đã lưu phân quyền cho ${dirtyRoles.map(roleLabel).join(", ")}. Giao diện của các tài khoản mang vai trò này đã được cập nhật ngay.`
      );
      setDraft({});
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      await queryClient.invalidateQueries({ queryKey: ["me", "permissions"] });
      await queryClient.invalidateQueries({ queryKey: ["optional-me", "permissions"] });
    },
  });

  if (session.ready && !canView) {
    return (
      <ListPage title="Chức vụ & Phân quyền">
        <EmptyState icon={<KeyRound />} title="Bạn không có quyền xem bảng phân quyền" />
      </ListPage>
    );
  }

  const editable = (role: Role) => canManage && !role.locked;
  const emptyRole = dirtyRoles.find((role) => keysOf(role).size === 0);

  return (
    <ListPage title="Chức vụ & Phân quyền">
      <BreadcrumbToolbar
        crumbs={[
          { label: "Tổng quan", href: "/dashboard" },
          { label: "Quản trị hệ thống" },
          { label: "Chức vụ & Phân quyền" },
        ]}
        titleBadge={<CountBadge>{columns.length} vai trò</CountBadge>}
        onRefresh={() => {
          roles.refetch();
          groups.refetch();
        }}
        extraActions={
          canManage ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCreating(true);
                  create.reset();
                }}
              >
                <Plus size={14} /> Tạo vai trò mới
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!dirtyRoles.length || save.isPending}
                onClick={() => {
                  setDraft({});
                  save.reset();
                }}
              >
                <Undo2 size={14} /> Hoàn tác
              </Button>
              <Button
                size="sm"
                disabled={!dirtyRoles.length || !!emptyRole || save.isPending}
                onClick={() => save.mutate()}
              >
                <Save size={14} />{" "}
                {save.isPending ? "Đang lưu…" : `Lưu thay đổi${dirtyRoles.length ? ` (${dirtyRoles.length})` : ""}`}
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4 sm:px-6">
        {/* Thanh KPI cân đối & Thanh lọc ma trận */}
        <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-2xs">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Chức vụ & Vai trò</p>
              <p className="mt-1 font-mono text-xl font-extrabold text-foreground">{columns.length}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck size={17} />
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-2xs">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Tổng quyền chức năng</p>
              <p className="mt-1 font-mono text-xl font-extrabold text-foreground">{allPermissions.length}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CheckSquare size={17} />
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-2xs">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Phân hệ nghiệp vụ</p>
              <p className="mt-1 font-mono text-xl font-extrabold text-foreground">
                {(groups.data ?? []).length}
              </p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers size={17} />
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-2xs">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Vai trò đang chỉnh sửa</p>
              <p className="mt-1 font-mono text-xl font-extrabold text-primary">{dirtyRoles.length}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles size={17} />
            </span>
          </div>
        </div>

        {/* Thanh tìm kiếm & lọc theo phân hệ / phạm vi */}
        <div className="flex shrink-0 flex-col justify-between gap-2.5 rounded-xl border border-border bg-card px-4 py-3 shadow-2xs lg:flex-row lg:items-center">
          <p className="text-xs leading-5 text-muted-foreground">
            Tích chọn ô quyền để cấp chức năng cho từng vai trò. Cột <b>Quản trị hệ thống</b> luôn có toàn quyền; các ô mờ là quyền vượt quá phạm vi của vai trò.
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <div className="relative w-full sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên quyền chức năng…"
                className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-7 text-xs focus:border-primary focus:outline-hidden"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <Select
              aria-label="Lọc theo phân hệ"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="h-9 w-full text-xs sm:w-48"
            >
              <option value="">Tất cả phân hệ ({(groups.data ?? []).length})</option>
              {(groups.data ?? []).map((g) => (
                <option key={g.module} value={g.module}>
                  {MODULE_LABELS[g.module] ?? g.module}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Lọc theo phạm vi"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as "" | Scope)}
              className="h-9 w-full text-xs sm:w-40"
            >
              <option value="">Mọi phạm vi</option>
              <option value="GLOBAL">{scopeLabel("GLOBAL")}</option>
              <option value="CLUB">{scopeLabel("CLUB")}</option>
              <option value="DEPARTMENT">{scopeLabel("DEPARTMENT")}</option>
            </Select>
          </div>
        </div>

        {notice && <Notice tone="success">{notice}</Notice>}
        {emptyRole && (
          <Notice tone="error">Vai trò {roleLabel(emptyRole)} phải được tích ít nhất một quyền chức năng.</Notice>
        )}
        {save.error && <Notice tone="error">{describeError(save.error)}</Notice>}

        {roles.isPending || groups.isPending ? (
          <LoadingRows />
        ) : roles.isError || groups.isError ? (
          <ErrorState
            message={describeError(roles.error ?? groups.error)}
            onRetry={() => {
              roles.refetch();
              groups.refetch();
            }}
          />
        ) : !filteredGroups.length ? (
          <EmptyState icon={<KeyRound />} title="Không tìm thấy quyền chức năng phù hợp bộ lọc" />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-card shadow-2xs [scrollbar-gutter:stable]">
            <table className="w-full min-w-[960px] border-collapse text-sm" aria-label="Ma trận phân quyền">
              <thead className="sticky top-0 z-20 border-b border-border bg-muted/85 backdrop-blur-xs">
                <tr>
                  <th className="sticky left-0 z-20 min-w-[310px] max-w-[380px] border-r border-border/70 bg-muted/95 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Quyền chức năng & Mô tả
                  </th>
                  {columns.map((role) => {
                    const isDirty = dirtyRoles.includes(role);
                    const count = keysOf(role).size;
                    return (
                      <th key={role.id} className="w-36 min-w-[136px] px-3 py-3 text-center align-top">
                        <div className="flex flex-col items-center gap-1">
                          <span className="flex items-center gap-1 text-xs font-extrabold text-foreground">
                            {role.locked && <Lock size={12} className="text-primary" />}
                            {roleLabel(role)}
                          </span>
                          <Badge tone={isDirty ? "primary" : "neutral"} dot={false}>
                            {scopeLabel(role.scope)}
                            {isDirty ? " · đã sửa" : ""}
                          </Badge>
                          <span className="font-mono text-[10px] font-medium text-muted-foreground">
                            {count} quyền
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((group) => (
                  <Fragment key={group.module}>
                    <tr className="border-y border-border/70 bg-secondary/65">
                      <td
                        colSpan={columns.length + 1}
                        className="px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-primary"
                      >
                        <div className="flex items-center gap-2">
                          <span>{MODULE_LABELS[group.module] ?? group.module}</span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                            {group.permissions.length} quyền
                          </span>
                        </div>
                      </td>
                    </tr>
                    {group.permissions.map((permission) => {
                      const title = permissionTitle(permission);
                      const desc = permissionDesc(permission);
                      return (
                        <tr
                          key={permission.id}
                          className="border-b border-border/40 transition-colors hover:bg-muted/35"
                        >
                          <td className="sticky left-0 z-10 min-w-[310px] max-w-[380px] border-r border-border/60 bg-card px-4 py-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-bold text-foreground">{title}</p>
                              <span className="rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {scopeLabel(permission.scope)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11.5px] leading-4 text-muted-foreground">{desc}</p>
                          </td>
                          {columns.map((role) => {
                            const fits = fitsRole(permission, role);
                            const checked = keysOf(role).has(permission.permissionKey);
                            const originallyChecked = role.permissionKeys.includes(permission.permissionKey);
                            const changed = checked !== originallyChecked;
                            const disabled = !editable(role) || !fits || save.isPending;
                            return (
                              <td
                                key={role.id}
                                className={cn(
                                  "w-36 min-w-[136px] px-2 py-2.5 text-center transition-colors",
                                  !fits && "bg-muted/35",
                                  changed && "bg-primary/8"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-35"
                                  aria-label={`${roleLabel(role)} · ${title}`}
                                  title={
                                    !fits
                                      ? `Quyền ${scopeLabel(permission.scope).toLowerCase()} không gán được cho vai trò ${scopeLabel(role.scope).toLowerCase()}`
                                      : `${roleLabel(role)} — ${title}`
                                  }
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => toggle(role, permission.permissionKey)}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalShell
        open={creating}
        onClose={() => setCreating(false)}
        title="Tạo chức vụ / vai trò mới"
        icon={<ShieldPlus />}
        onSubmit={() => create.mutate()}
        submitLabel="Tạo vai trò"
        submitLoading={create.isPending}
        submitDisabled={!newRole.name.trim() || !newCode || newFitting.length === 0}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tên vai trò" required hint="Ví dụ: Trưởng ban Truyền thông, Thủ quỹ, Cộng tác viên.">
            <Input
              value={newRole.name}
              onChange={(e) => setNewRole((r) => ({ ...r, name: e.target.value }))}
              placeholder="Nhập tên chức vụ / vai trò…"
            />
          </FormField>
          <FormField label="Phạm vi áp dụng" required hint="Chọn Theo CLB nếu cần duyệt đơn hoặc quản lý toàn CLB.">
            <Select
              value={newRole.scope}
              onChange={(e) => setNewRole((r) => ({ ...r, scope: e.target.value as Scope }))}
            >
              <option value="DEPARTMENT">{scopeLabel("DEPARTMENT")}</option>
              <option value="CLUB">{scopeLabel("CLUB")}</option>
              <option value="GLOBAL">{scopeLabel("GLOBAL")}</option>
            </Select>
          </FormField>
        </div>
        <FormField label="Mô tả trách nhiệm">
          <Textarea
            value={newRole.description}
            onChange={(e) => setNewRole((r) => ({ ...r, description: e.target.value }))}
            placeholder="Mô tả ngắn gọn nhiệm vụ của vai trò này…"
          />
        </FormField>
        <div className="space-y-2">
          <p className="text-sm font-bold">Quyền chức năng ({newFitting.length} đã tích chọn)</p>
          <div className="max-h-72 space-y-3 overflow-auto rounded-lg border border-border/60 p-3">
            {(groups.data ?? []).map((group) => {
              const items = group.permissions.filter((p) => p.active && fitsRole(p, newRole));
              if (!items.length) return null;
              return (
                <div key={group.module}>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">
                    {MODULE_LABELS[group.module] ?? group.module}
                  </p>
                  {items.map((p) => (
                    <label key={p.id} className="flex items-start gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted/50">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 accent-primary"
                        checked={newKeys.has(p.permissionKey)}
                        onChange={() => toggleNew(p.permissionKey)}
                      />
                      <span>
                        <span className="text-xs font-semibold text-foreground">{permissionTitle(p)}</span>
                        <span className="block text-xs text-muted-foreground">{permissionDesc(p)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        {create.error && <p className="text-xs text-destructive">{describeError(create.error)}</p>}
      </ModalShell>
    </ListPage>
  );
}
