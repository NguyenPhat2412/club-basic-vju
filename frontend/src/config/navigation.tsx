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

export function buildNavigationSections(params: {
  authenticated: boolean;
  mustChangePassword: boolean;
  can: (permissionKey: string) => boolean;
}): NavSection[] {
  const { authenticated, mustChangePassword, can } = params;
  const hasAnyPerm = (keys: string[]) => keys.some(can);

  const canManageClub = CLUB_MANAGEMENT_KEYS.some(can);
  const canSystemAdmin = hasAnyPerm([
    "user.view",
    "role.view",
    "audit.view",
    "setting.view",
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
                id: "grp-personal",
                label: "Cá nhân",
                icon: <UserRound size={15} />,
                items: [
                  { href: "/memberships", label: "CLB đang tham gia", visible: authenticated },
                  { href: "/clubs", label: "Khám phá câu lạc bộ", visible: true },
                  { href: "/applications", label: "Đơn đăng ký của tôi", visible: authenticated },
                  { href: "/schedule", label: "Lịch & Công việc của tôi", visible: authenticated },
                  { href: "/events", label: "Sự kiện & Cộng tác viên", visible: true },
                  { href: "/documents", label: "Quy chế & Tài liệu", visible: authenticated && can("document.view") },
                  { href: "/notifications", label: "Thông báo của tôi", visible: authenticated },
                  { href: "/profile", label: "Hồ sơ cá nhân", visible: authenticated },
                ],
              },
              {
                id: "grp-club",
                label: "Câu lạc bộ",
                icon: <Building2 size={15} />,
                items: [
                  mgmt("clubs", "Danh sách CLB", canClubOrg),
                  mgmt("overview", "Tổng quan CLB", canClubOrg),
                  mgmt("settings", "Cài đặt CLB", canClubOrg),
                ],
              },
              {
                id: "grp-members",
                label: "Thành viên & Tuyển quân",
                icon: <UsersRound size={15} />,
                items: [
                  mgmt("members", "Thành viên", canClubMembers),
                  mgmt("departments", "Ban chuyên môn", canClubOrg || canClubMembers),
                  mgmt("applications", "Đơn ứng tuyển", canClubRecruitment),
                  mgmt("forms", "Biểu mẫu", canClubRecruitment),
                ],
              },
              {
                id: "grp-activities",
                label: "Hoạt động CLB",
                icon: <CalendarCheck2 size={15} />,
                items: [
                  mgmt("events", "Sự kiện", canClubOps),
                  mgmt("tasks", "Công việc", canClubOps),
                  mgmt("chat", "Chat & AI", canClubOps),
                ],
              },
              {
                id: "grp-sys",
                label: "Quản trị hệ thống",
                icon: <ShieldCheck size={15} />,
                items: [
                  { href: "/users", label: "Tài khoản người dùng", visible: can("user.view") },
                  { href: "/roles", label: "Vai trò & Phân quyền", visible: can("role.view") },
                  { href: "/audit-logs", label: "Nhật ký hệ thống", visible: can("audit.view") },
                  { href: "/settings", label: "Cài đặt hệ thống", visible: can("setting.view") },
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
                    tabs: ["clubs", "overview", "members", "departments", "events", "tasks", "chat"],
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
                label: "Sự kiện & Công việc",
                icon: <CalendarCheck2 size={15} />,
                items: [
                  { href: "/events", label: "Sự kiện & Cộng tác viên", visible: true },
                  { href: "/schedule", label: "Lịch & Việc của tôi", visible: authenticated },
                  { href: "/documents", label: "Quy chế & Tài liệu", visible: true },
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
  const tr = (text: string) => translateUiText(text, locale);

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

export function isNavItemActive(item: SubNavItem, pathname: string, currentTab: string | null): boolean {
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
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const MANAGEMENT_TAB_TITLES: Record<string, string> = {
  clubs: "Danh sách & Quản lý CLB",
  overview: "Thống kê hoạt động CLB",
  departments: "Phòng ban chuyên môn",
  settings: "Thông tin & Cài đặt CLB",
  members: "Thành viên & Phân ban",
  applications: "Hồ sơ ứng tuyển",
  forms: "Biểu mẫu tuyển thành viên",
  events: "Sự kiện & Điểm danh",
  tasks: "Báo cáo công việc",
  chat: "Kênh trao đổi & AI",
};

export function resolveActiveNavMeta(
  sections: NavSection[],
  pathname: string,
  currentTab: string | null
): { groupLabel: string; pageTitle: string } {
  const locale = getPresentationLocale();
  const tr = (text: string) => translateUiText(text, locale);

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
        if (isNavItemActive(item, pathname, currentTab)) {
          return { groupLabel: grp.label, pageTitle: item.label };
        }
      }
    }
  }
  if (pathname === "/notifications") {
    return { groupLabel: tr("Cổng cá nhân"), pageTitle: tr("Thông báo của tôi") };
  }
  if (pathname === "/profile") {
    return { groupLabel: tr("Cổng cá nhân"), pageTitle: tr("Hồ sơ cá nhân") };
  }
  return { groupLabel: tr("Cổng thông tin"), pageTitle: tr("Hệ thống CLB sinh viên") };
}
