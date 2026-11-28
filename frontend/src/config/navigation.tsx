import { ReactNode } from "react";
import { Building2, CalendarCheck2, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { getPresentationLocale } from "@/i18n/config";
import { translateUiText } from "@/i18n/translator";
import { CLUB_MANAGEMENT_KEYS } from "@/hooks/useSession";

export type SubNavItem = {
  href: string;
  label: string;
  tab?: string;
  tabs?: string[];
  tier?: "club" | "system";
  visible?: boolean;
};

export type NavParentGroup = {
  id: string;
  label: string;
  icon: ReactNode;
  items: SubNavItem[];
};

export type NavSection = {
  id: string;
  title?: string;
  groups: NavParentGroup[];
};

const NAV_LABEL_FALLBACKS: Record<string, { en: string; ja: string }> = {
  "Sự kiện các CLB": { en: "Club Events", ja: "クラブイベント" },
  "Chứng nhận": { en: "Certificates", ja: "証明書管理" },
  "Quản lý & Thống kê Chứng nhận": { en: "Certificate Management & Stats", ja: "証明書管理・統計" },
  "Công việc & Lịch cá nhân": { en: "Tasks & Personal Schedule", ja: "タスク・個人スケジュール" },
  "Thành viên & Tuyển quân": { en: "Members & Recruitment", ja: "メンバー・募集" },
  "Các ban hoạt động": { en: "Departments", ja: "専門部署" },
  "Tài liệu CLB & Biểu mẫu": { en: "Club Documents & Forms", ja: "クラブ資料・応募フォーム" },
  "Không gian & Chat CLB": { en: "Club Workspace & Chat", ja: "クラブスペース・チャット" },
  "Đơn ứng tuyển của tôi": { en: "My Applications", ja: "入部申請履歴" },
  "Hoạt động & Tài liệu": { en: "Activities & Documents", ja: "活動・資料" },
  "Cổng thông tin": { en: "Information Portal", ja: "情報ポータル" },
  "Hệ thống CLB sinh viên": { en: "Student Club System", ja: "学生クラブ管理システム" },
  "Không gian quản lý CLB": { en: "Club Management Workspace", ja: "クラブ管理ワークスペース" },
  "Phát thông báo": { en: "Broadcast Center", ja: "一斉通知配信" },
  "Tài liệu hệ thống": { en: "System Documents", ja: "システム文書" },
};

function translateNavLabel(text: string, locale: ReturnType<typeof getPresentationLocale>): string {
  if (locale === "vi") return text;
  const fallback = NAV_LABEL_FALLBACKS[text]?.[locale];
  if (fallback) return fallback;
  return translateUiText(text, locale);
}

export function buildNavigationSections(params: {
  authenticated: boolean;
  mustChangePassword: boolean;
  can: (permissionKey: string) => boolean;
  hasGlobal?: (permissionKey: string) => boolean;
}): NavSection[] {
  const { authenticated, mustChangePassword, can, hasGlobal } = params;
  const hasAnyPerm = (keys: string[]) => keys.some(can);
  const canGlobalRoleView = can("role.manage") || (hasGlobal ? hasGlobal("role.view") : can("role.view"));
  const canGlobalBroadcast = hasGlobal ? hasGlobal("notification.send") : can("notification.send");
  const canSystemDocuments = hasGlobal ? hasGlobal("document.view") : can("document.view");

  const canManageClub = CLUB_MANAGEMENT_KEYS.some(can);
  const canSystemAdmin = canGlobalRoleView || hasAnyPerm(["user.view", "audit.view", "setting.view"]);
  const canClubDocs = hasAnyPerm([
    "document.view",
    "document.upload",
    "document.update",
    "document.delete",
    "document.restore",
  ]);
  const canClubOrg =
    canManageClub ||
    hasAnyPerm([
      "club.create",
      "club.update",
      "club.active",
      "club.inactive",
      "department.create",
      "department.update",
      "department.activate",
      "department.inactive",
      "notification.send",
    ]);
  const canClubMembers =
    canManageClub &&
    hasAnyPerm([
      "member.view",
      "member.view_detail",
      "member.add",
      "member.update",
      "member.remove",
      "department.member.view",
      "department.member.add",
      "department.member.remove",
      "permission.view",
      "permission.assign",
      "permission.revoke",
    ]);
  const canClubRecruitment =
    canManageClub &&
    hasAnyPerm([
      "application.view",
      "application.view_detail",
      "application.review",
      "application.approve",
      "application.reject",
      "application.manage_form",
      "application.update",
    ]);
  const canClubOps =
    canManageClub &&
    hasAnyPerm([
      "event.view",
      "event.create",
      "event.update",
      "event.attendance",
      "event.attendance_edit",
      "task.view",
      "task.create",
      "task.update",
      "task.verify",
      "chat.view",
      "chat.send",
      "chat.summarize",
    ]);
  const canStudentClubSpace = hasAnyPerm([
    "club.view",
    "member.view",
    "department.view",
    "event.view",
    "task.view",
    "chat.view",
    "chat.send",
  ]);

  // one sidebar entry per /management tab: that page has no tab bar of its own
  const mgmt = (tab: string, label: string, visible: boolean): SubNavItem => ({
    href: `/management?tab=${tab}`,
    tab,
    tabs: [tab],
    label,
    visible,
  });

  const rawSections: NavSection[] =
    canManageClub || canSystemAdmin
      ? [
          {
            id: "sec-admin",
            groups: [
              {
                id: "grp-club",
                label: "Câu lạc bộ",
                icon: <Building2 size={15} />,
                items: [
                  mgmt("clubs", "Danh sách CLB", canClubOrg),
                  mgmt("overview", "Thống kê CLB", canClubOrg),
                  mgmt("settings", "Cài đặt CLB", canClubOrg),
                ],
              },
              {
                id: "grp-members",
                label: "Thành viên & Tuyển quân",
                icon: <UsersRound size={15} />,
                items: [
                  mgmt("members", "Thành viên", canClubMembers),
                  mgmt("departments", "Các ban hoạt động", canClubOrg || canClubMembers),
                  mgmt("applications", "Đơn ứng tuyển", canClubRecruitment),
                ],
              },
              {
                id: "grp-activities",
                label: "Hoạt động CLB",
                icon: <CalendarCheck2 size={15} />,
                items: [
                  mgmt("events", "Sự kiện", canClubOps),
                  mgmt("certificates", "Chứng nhận", canClubOps),
                  mgmt("tasks", "Công việc", canClubOps),
                  {
                    href: canClubDocs ? "/management?tab=documents" : "/management?tab=forms",
                    tab: canClubDocs ? "documents" : "forms",
                    tabs: ["documents", "forms"],
                    label: "Tài liệu CLB & Biểu mẫu",
                    visible: canManageClub && (canClubDocs || canClubRecruitment),
                  },
                  mgmt("chat", "Chat & AI", canClubOps),
                ],
              },
              {
                id: "grp-sys",
                label: "Quản trị hệ thống",
                icon: <ShieldCheck size={15} />,
                items: [
                  { href: "/users", label: "Tài khoản người dùng", visible: can("user.view") },
                  { href: "/roles", label: "Vai trò & Phân quyền", visible: canGlobalRoleView },
                  { href: "/notifications?tab=campaigns", label: "Phát thông báo", visible: canGlobalBroadcast },
                  { href: "/documents?tier=system", tier: "system", label: "Tài liệu hệ thống", visible: canSystemDocuments },
                  { href: "/audit-logs", label: "Nhật ký hệ thống", visible: can("audit.view") },
                  { href: "/settings", label: "Cài đặt hệ thống", visible: can("setting.view") },
                ],
              },
              {
                id: "grp-personal",
                label: "Cá nhân",
                icon: <UserRound size={15} />,
                items: [
                  { href: "/profile", label: "Hồ sơ cá nhân", visible: authenticated },
                  { href: "/clubs", label: "Khám phá câu lạc bộ", visible: !canSystemAdmin },
                  { href: "/applications", label: "Đơn đăng ký của tôi", visible: authenticated },
                  { href: "/schedule", label: "Công việc & Lịch cá nhân", visible: authenticated },
                  { href: "/notifications", label: "Thông báo của tôi", visible: authenticated },
                ],
              },
            ],
          },
        ]
      : [
          {
            id: "sec-student-clubs",
            groups: [
              {
                id: "grp-student-clubs",
                label: "Câu lạc bộ của tôi",
                icon: <Building2 size={15} />,
                items: [
                  { href: "/clubs", label: "Khám phá câu lạc bộ", visible: true },
                  { href: "/memberships", label: "CLB đang tham gia", visible: authenticated },
                  {
                    href: "/management?tab=chat",
                    tab: "chat",
                    tabs: ["clubs", "overview", "members", "departments", "events", "tasks", "documents", "chat"],
                    label: "Không gian & Chat CLB",
                    visible: authenticated && canStudentClubSpace,
                  },
                  { href: "/applications", label: "Đơn ứng tuyển của tôi", visible: authenticated },
                ],
              },
            ],
          },
          {
            id: "sec-student-activities",
            groups: [
              {
                id: "grp-student-activities",
                label: "Hoạt động & Tài liệu",
                icon: <CalendarCheck2 size={15} />,
                items: [
                  { href: "/events", label: "Sự kiện các CLB", visible: true },
                  { href: "/schedule", label: "Công việc & Lịch cá nhân", visible: authenticated },
                  { href: "/documents", label: "Tài liệu & Quy chế", visible: authenticated },
                ],
              },
            ],
          },
          {
            id: "sec-student-personal",
            groups: [
              {
                id: "grp-student-personal",
                label: "Cá nhân",
                icon: <UserRound size={15} />,
                items: [
                  { href: "/notifications", label: "Thông báo của tôi", visible: authenticated },
                  { href: "/profile", label: "Hồ sơ cá nhân", visible: authenticated },
                ],
              },
            ],
          },
        ];

  const locale = getPresentationLocale();
  const tr = (text: string) => translateNavLabel(text, locale);

  return rawSections
    .map((sec) => ({
      ...sec,
      title: sec.title ? tr(sec.title) : undefined,
      groups: sec.groups
        .map((grp) => ({
          ...grp,
          label: tr(grp.label),
          items: grp.items
            .filter((item) => item.visible !== false && !mustChangePassword)
            .map((item) => ({ ...item, label: tr(item.label) })),
        }))
        .filter((grp) => grp.items.length > 0),
    }))
    .filter((sec) => sec.groups.length > 0);
}

export function isNavItemActive(
  item: SubNavItem,
  pathname: string,
  currentTab: string | null,
  currentTier?: string | null
): boolean {
  if (item.tabs && item.tabs.length > 0) {
    if (pathname !== "/management") return false;
    const effectiveTab = currentTab || "clubs";
    return item.tabs.includes(effectiveTab);
  }
  if (item.tab) {
    if (pathname !== "/management") return false;
    if (!currentTab) return item.tab === "clubs";
    return currentTab === item.tab;
  }
  if (item.href === "/notifications?tab=campaigns") {
    return pathname === "/notifications" && currentTab === "campaigns";
  }
  if (item.href === "/notifications") {
    return pathname === "/notifications" && currentTab !== "campaigns";
  }
  if (item.tier) {
    if (pathname !== "/documents") return false;
    return (currentTier === "system" ? "system" : "club") === item.tier;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const MANAGEMENT_TAB_TITLES: Record<string, string> = {
  clubs: "Danh sách & Quản lý CLB",
  overview: "Thống kê hoạt động CLB",
  departments: "Các ban hoạt động",
  settings: "Thông tin & Cài đặt CLB",
  members: "Thành viên & Phân ban",
  applications: "Hồ sơ ứng tuyển",
  forms: "Biểu mẫu tuyển thành viên",
  events: "Sự kiện & Điểm danh",
  certificates: "Quản lý & Thống kê Chứng nhận",
  tasks: "Báo cáo công việc",
  documents: "Tài liệu CLB & Biểu mẫu",
  chat: "Kênh trao đổi & AI",
};

export function resolveActiveNavMeta(
  sections: NavSection[],
  pathname: string,
  currentTab: string | null,
  currentTier?: string | null
): { groupLabel: string; pageTitle: string } {
  const locale = getPresentationLocale();
  const tr = (text: string) => translateNavLabel(text, locale);

  if (pathname === "/dashboard") {
    return { groupLabel: tr("Bảng điều khiển"), pageTitle: tr("Tổng quan") };
  }
  if (pathname === "/management") {
    const tabKey = currentTab || "clubs";
    return {
      groupLabel: tr("Quản lý Câu lạc bộ"),
      pageTitle: tr(MANAGEMENT_TAB_TITLES[tabKey] ?? "Không gian quản lý CLB"),
    };
  }
  for (const sec of sections) {
    for (const grp of sec.groups) {
      for (const item of grp.items) {
        if (isNavItemActive(item, pathname, currentTab, currentTier)) {
          return { groupLabel: grp.label, pageTitle: item.label };
        }
      }
    }
  }
  if (pathname === "/events") {
    return {
      groupLabel: translateNavLabel("Hoạt động & Tài liệu", locale),
      pageTitle: translateNavLabel("Sự kiện các CLB", locale),
    };
  }
  if (pathname === "/notifications") {
    return { groupLabel: tr("Cổng cá nhân"), pageTitle: tr("Thông báo của tôi") };
  }
  if (pathname === "/profile") {
    return { groupLabel: tr("Cổng cá nhân"), pageTitle: tr("Hồ sơ cá nhân") };
  }
  return { groupLabel: tr("Cổng thông tin"), pageTitle: tr("Hệ thống CLB sinh viên") };
}
