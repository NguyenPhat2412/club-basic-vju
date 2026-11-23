"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck2,
  ClipboardCheck,
  ClipboardList,
  FolderArchive,
  ListChecks,
  MessageSquare,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { apiModel } from "@/lib/api";
import { useUnreadNotificationSummary } from "@/hooks/notification/useGlobalRealtimeNotifications";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { CLUB_MANAGEMENT_KEYS } from "@/hooks/useSession";
import { Badge, CountBadge } from "@/components/ui/badge";
import { cn, formatDay } from "@/lib/utils";
import { useI18n } from "@/providers/I18nContext";

const emptySubscribe = () => () => {};
const APP_PERMS = ["application.view", "application.review", "application.approve", "application.reject"];

export function QuickActionCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentClubId = searchParams.get("clubId");
  const session = useOptionalSession();
  const { tr } = useI18n();
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [open, setOpen] = useState(false);

  const canQuery = Boolean(session.user && !session.mustChangePassword);
  const canReviewApps = APP_PERMS.some(session.can);
  const canManageClubs = CLUB_MANAGEMENT_KEYS.some(session.can);
  const canAdminUsers = session.can("user.view");
  const canGlobalRoles = session.can("role.manage") || session.hasGlobal("role.view");

  const reviewSummary = useQuery({
    queryKey: qk.dashboard("application-review-summary"),
    queryFn: apiModel.applicationReviewSummary,
    enabled: canQuery && canReviewApps,
    staleTime: 30_000,
  });

  const myTasks = useQuery({
    queryKey: qk.dashboard("my-tasks"),
    queryFn: () => apiModel.myTasks(),
    enabled: canQuery,
    staleTime: 30_000,
  });

  const unreadSummary = useUnreadNotificationSummary(canQuery);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const pendingApps = canReviewApps ? (reviewSummary.data?.pending ?? 0) : 0;
  const recentPendingApps = (reviewSummary.data?.recent ?? []).filter((a) => a.status === "PENDING").slice(0, 3);
  const tasks = myTasks.data?.items ?? [];
  const openTasks = tasks.filter(
    (t) => t.status === "TODO" || t.status === "IN_PROGRESS" || t.status === "DONE" || t.overdue
  );
  const overdueTasks = tasks.filter((t) => t.overdue);
  const unreadChatCount = unreadSummary.data?.unreadChatMessages ?? 0;
  const totalActionCount = pendingApps + openTasks.length + unreadChatCount;
  const chatShortcutHref =
    unreadChatCount > 0 && unreadSummary.data?.latestUnreadClubId
      ? `/management?tab=chat&clubId=${unreadSummary.data.latestUnreadClubId}${
          unreadSummary.data.latestUnreadChannelId
            ? `&channelId=${unreadSummary.data.latestUnreadChannelId}`
            : ""
        }`
      : "/management?tab=chat";

  const withClub = (baseHref: string) => {
    if (!currentClubId || !baseHref.startsWith("/management?")) return baseHref;
    const params = new URLSearchParams(baseHref.split("?")[1] ?? "");
    if (params.has("clubId")) return baseHref;
    params.set("clubId", currentClubId);
    return `/management?${params.toString()}`;
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(withClub(href));
  };

  const quickShortcuts = [
    ...(canManageClubs
      ? [
          { label: tr("Danh sách CLB"), sub: tr("Quản lý & trạng thái"), icon: Building2, href: "/management?tab=clubs" },
          { label: tr("Thống kê CLB"), sub: tr("Số liệu & báo cáo"), icon: BarChart3, href: "/management?tab=overview" },
        ]
      : []),
    ...(canReviewApps
      ? [{ label: tr("Duyệt đơn CLB"), sub: `${pendingApps} ${tr("đơn chờ duyệt")}`, icon: ClipboardList, href: "/management?tab=applications" }]
      : [{ label: tr("Đơn của tôi"), sub: tr("Theo dõi ứng tuyển"), icon: ClipboardList, href: "/applications" }]),
    ...(canManageClubs
      ? [
          { label: tr("Thành viên & Ban"), sub: tr("Nhân sự & phân quyền"), icon: UsersRound, href: "/management?tab=members" },
          { label: tr("Sự kiện & Điểm danh"), sub: tr("Tổ chức & CTV"), icon: CalendarCheck2, href: "/management?tab=events" },
          { label: tr("Giao & Duyệt việc"), sub: tr("Tiến độ ban/CLB"), icon: ClipboardCheck, href: "/management?tab=tasks" },
          {
            label: tr("Chat & Trợ lý AI"),
            sub: unreadChatCount > 0 ? `${unreadChatCount} ${tr("tin nhắn mới")}` : tr("Trao đổi trực tuyến"),
            icon: MessageSquare,
            href: chatShortcutHref,
          },
        ]
      : [
          { label: tr("Sự kiện & CTV"), sub: tr("Đăng ký tham gia"), icon: CalendarCheck2, href: "/events" },
          { label: tr("Lịch & Công việc"), sub: `${openTasks.length} ${tr("việc đang mở")}`, icon: ClipboardCheck, href: "/schedule" },
        ]),
    { label: tr("Kho tài liệu"), sub: tr("Tài liệu CLB & Quy chế"), icon: FolderArchive, href: "/documents?tier=club" },
    ...(canAdminUsers || canGlobalRoles
      ? [{ label: tr("Quản trị hệ thống"), sub: tr("Tài khoản & Vai trò"), icon: ShieldCheck, href: canAdminUsers ? "/users" : "/roles" }]
      : []),
  ];

  const triggerLabel = tr(" Trung tâm thao tác & việc cần xử lý").trim();

  return (
    <>
      <button
        type="button"
        data-no-i18n="true"
        aria-label={triggerLabel}
        title={triggerLabel}
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
          if (canReviewApps) reviewSummary.refetch();
          myTasks.refetch();
        }}
        className={cn(
          "relative grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary",
          open && "border-primary/30 bg-primary/8 text-primary"
        )}
      >
        <ListChecks size={15} />
        {totalActionCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary-foreground px-1 text-[9.5px] font-bold leading-none text-white shadow-2xs">
            {totalActionCount > 99 ? "99+" : totalActionCount}
          </span>
        )}
      </button>

      {isClient &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[75] flex justify-end overflow-x-hidden bg-black/45 backdrop-blur-2xs"
            onMouseDown={() => setOpen(false)}
          >
            <aside
              role="dialog"
              aria-modal="true"
              aria-label={triggerLabel}
              onMouseDown={(e) => e.stopPropagation()}
              className="slide-in-right flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3.5 sm:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ListChecks size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-slate-900">{tr("Thao tác & Việc cần xử lý")}</h3>
                      <CountBadge>{totalActionCount}</CountBadge>
                    </div>
                    <p className="truncate text-[11px] text-slate-500">
                      {tr("Điều phối nhanh hồ sơ, công việc và các phân hệ quản lý")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={tr("Đóng")}
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
                {/* Summary Strip */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => go(canReviewApps ? "/management?tab=applications" : "/applications")}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-left transition-colors hover:border-primary/40 hover:bg-white"
                  >
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                      {canReviewApps ? tr("Đơn chờ xét duyệt") : tr("Đơn ứng tuyển")}
                    </p>
                    <p className="mt-1 text-xl font-extrabold text-primary tabular-nums">{pendingApps}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                      {tr("Mở hàng đợi")} <ArrowRight size={11} />
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => go("/schedule")}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-left transition-colors hover:border-primary/40 hover:bg-white"
                  >
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                      {tr("Việc cần thực hiện")}
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-slate-900 tabular-nums">{openTasks.length}</span>
                      {overdueTasks.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-destructive">
                          <AlertTriangle size={11} /> {overdueTasks.length} {tr("quá hạn")}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                      {tr("Xem lịch & việc")} <ArrowRight size={11} />
                    </p>
                  </button>
                </div>

                {/* Quick Management Grid */}
                <div>
                  <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {tr("Lối tắt chuyển trang quản lý")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {quickShortcuts.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => go(item.href)}
                          className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-all hover:border-primary/35 hover:bg-primary/[0.03] hover:shadow-2xs"
                        >
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon size={14} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-900">{item.label}</p>
                            <p className="truncate text-[10.5px] text-slate-500">{item.sub}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actionable Pending Applications Preview */}
                {canReviewApps && recentPendingApps.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {tr("Hồ sơ ứng tuyển mới chờ duyệt")}
                      </p>
                      <button
                        type="button"
                        onClick={() => go("/management?tab=applications")}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        {tr("Xử lý tất cả")}
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                      {recentPendingApps.map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => go(`/management?clubId=${app.clubId}&tab=applications`)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Badge tone="primary">{app.clubCode}</Badge>
                              <span className="truncate text-xs font-semibold text-slate-900">{app.clubName}</span>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                              {app.preferredDepartmentName ? `NV1: ${app.preferredDepartmentName} · ` : ""}
                              {formatDay(app.createdAt)}
                            </p>
                          </div>
                          <ArrowRight size={13} className="shrink-0 text-primary" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actionable Open Tasks Preview */}
                {openTasks.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {tr("Công việc cá nhân cần chú ý")}
                      </p>
                      <button
                        type="button"
                        onClick={() => go("/schedule")}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        {tr("Cập nhật tiến độ")}
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                      {openTasks.slice(0, 3).map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => go("/schedule")}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-900">{task.title}</p>
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                              {task.clubCode} · {tr("Hạn")}: {formatDay(task.deadline)} ({task.progressPercent}%)
                            </p>
                          </div>
                          {task.overdue ? (
                            <Badge tone="danger">{tr("Quá hạn")}</Badge>
                          ) : (
                            <Badge tone="pending">{task.progressPercent}%</Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
