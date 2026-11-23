"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight, Bell, Building2, Calendar, ClipboardCheck, ClipboardList, Users, UsersRound,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { apiModel, ApplicationSummary } from "@/lib/api";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { CLUB_MANAGEMENT_KEYS } from "@/hooks/useSession";
import { useUnreadNotificationSummary } from "@/hooks/notification/useGlobalRealtimeNotifications";
import { FirstLoginPassword } from "@/components/layout/FirstLoginPassword";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { StatKpiGrid } from "@/components/shared/StatCards";
import { LoadingRows } from "@/components/shared/States";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import {
  buildStudentUpcomingEvents,
  DashboardLatestNotifications,
} from "@/components/dashboard/StudentDashboardSidebar";
import { DashboardAnalyticsCards, DashboardGuestPrompt } from "@/components/dashboard/DashboardAnalyticsCards";
import { DashboardActivitySection } from "@/components/dashboard/DashboardActivitySection";
import { DashboardSystemAuditSection } from "@/components/dashboard/DashboardSystemAuditSection";
import { UpcomingInterviewsBanner } from "@/components/application/UpcomingInterviewsBanner";

const APPLICATION_PERMISSIONS = ["application.view", "application.review", "application.approve", "application.reject"];

export function DashboardView() {
  const queryClient = useQueryClient();
  const session = useOptionalSession();
  const [now] = useState(() => Date.now());
  const [activeFeedTab, setActiveFeedTab] = useState<"applications" | "tasks" | "clubs">("applications");
  const mediaCatalog = useClubMediaCatalog(true);

  const canQuery = !!session.user && !session.mustChangePassword;
  const canReviewApps = APPLICATION_PERMISSIONS.some(session.can);
  const canManageClubs = CLUB_MANAGEMENT_KEYS.some(session.can);
  const canAdminUsers = session.can("user.view");
  const canAudit = session.can("audit.view");

  const publicClubs = useQuery({
    queryKey: qk.dashboard("public-clubs"),
    queryFn: () => apiModel.publicClubs("", "", 0, 100),
    enabled: canQuery,
  });
  const publicEvents = useQuery({
    queryKey: qk.dashboard("public-events"),
    queryFn: () => apiModel.publicEvents(0, 10),
    enabled: canQuery,
  });
  const memberships = useQuery({
    queryKey: qk.dashboard("memberships"),
    queryFn: () => apiModel.myMemberships(),
    enabled: canQuery,
  });
  const myApplications = useQuery({
    queryKey: qk.dashboard("my-applications"),
    queryFn: () => apiModel.myApplications(),
    enabled: canQuery,
  });
  const myTasks = useQuery({
    queryKey: qk.dashboard("my-tasks"),
    queryFn: () => apiModel.myTasks(),
    enabled: canQuery,
  });
  const myCalendar = useQuery({
    queryKey: qk.dashboard("my-calendar"),
    queryFn: () => apiModel.myCalendar(),
    enabled: canQuery,
  });
  const notifications = useQuery({
    queryKey: qk.notifications(),
    queryFn: () => apiModel.notifications(),
    enabled: canQuery,
  });
  const unreadSummary = useUnreadNotificationSummary(canQuery);

  const managedClubScope = session.clubsWith(CLUB_MANAGEMENT_KEYS);
  const managedClubs = useQuery({
    queryKey: qk.dashboard("manageable-clubs"),
    queryFn: () => apiModel.clubs("", "", 0, 100),
    enabled: canQuery && (canManageClubs || canAdminUsers),
  });
  const visibleManagedClubs = (managedClubs.data?.items ?? []).filter(
    (club) => managedClubScope.global || managedClubScope.ids.has(club.id),
  );
  const reviewSummary = useQuery({
    queryKey: qk.dashboard("application-review-summary"),
    queryFn: apiModel.applicationReviewSummary,
    enabled: canQuery && canReviewApps,
  });

  const systemStats = useQuery({
    queryKey: qk.dashboard("system-statistics"),
    queryFn: apiModel.systemStatistics,
    enabled: canQuery && canAdminUsers,
  });
  const auditLogs = useQuery({
    queryKey: qk.dashboard("audit-logs"),
    queryFn: () => apiModel.auditLogs({ limit: 6 }),
    enabled: canQuery && canAudit,
  });

  const invalidateNotifications = () => {
    queryClient.invalidateQueries({ queryKey: qk.dashboard("notifications") });
    queryClient.invalidateQueries({ queryKey: qk.notifications() });
    queryClient.invalidateQueries({ queryKey: qk.unreadSummary() });
  };

  const markAllRead = useMutation({
    mutationFn: () => apiModel.markAllNotificationsRead(),
    onSuccess: invalidateNotifications,
  });
  const markOneRead = useMutation({
    mutationFn: (id: string) => apiModel.markNotificationRead(id),
    onSuccess: invalidateNotifications,
  });

  if (!session.settled) {
    return <LoadingRows />;
  }

  if (!session.user) {
    return <DashboardGuestPrompt />;
  }

  if (session.mustChangePassword) {
    return (
      <main className="flex min-h-svh flex-col bg-background">
        <FirstLoginPassword email={session.user.email} />
      </main>
    );
  }

  if (!session.ready) return null;
  if (!canManageClubs && !canAdminUsers && !canAudit) return <StudentDashboard user={session.user} />;

  const allClubs = publicClubs.data?.items ?? [];
  const totalClubsCount = publicClubs.data?.total ?? 0;
  const myClubList = memberships.data?.items ?? [];
  const activeMembershipsCount =
    myClubList.filter((m) => m.status === "ACTIVE").length || (memberships.data?.total ?? 0);

  const myAppsList = myApplications.data?.items ?? [];
  const summary = canReviewApps && reviewSummary.data && reviewSummary.data.total > 0 ? reviewSummary.data : null;
  const relevantApps: ApplicationSummary[] = summary ? summary.recent : myAppsList;
  const relevantAppsTotal = summary ? summary.total : myAppsList.length;

  const pendingAppsCount = summary ? summary.pending : myAppsList.filter((a) => a.status === "PENDING").length;
  const approvedAppsCount = summary ? summary.approved : myAppsList.filter((a) => a.status === "APPROVED").length;
  const rejectedAppsCount = summary ? summary.rejected : myAppsList.filter((a) => a.status === "REJECTED").length;

  const tasksList = myTasks.data?.items ?? [];
  const totalTasksCount = myTasks.data?.total ?? tasksList.length;
  const completedTasksCount = tasksList.filter(
    (t) => t.status === "COMPLETED" || t.status === "DONE" || t.status === "VERIFIED",
  ).length;
  const avgTaskProgress =
    tasksList.length > 0
      ? Math.round(tasksList.reduce((acc, t) => acc + (t.progressPercent || 0), 0) / tasksList.length)
      : 0;

  const calendarEvents = myCalendar.data ?? [];
  const upcomingPublicEvents = publicEvents.data?.items ?? [];
  const upcomingEvents = buildStudentUpcomingEvents(calendarEvents, upcomingPublicEvents, now);
  const activePublicEventsCount = upcomingPublicEvents.filter(
    (ev) => new Date(ev.endTime).getTime() > now,
  ).length;

  const notifList = notifications.data?.items ?? [];
  const unreadNotifCount =
    unreadSummary.data?.unreadNotifications ?? notifList.filter((n) => !n.read).length;

  const categoryCounts = allClubs.reduce<Record<string, number>>((acc, club) => {
    const cat = club.activityField?.trim() || "Khác";
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  const activeQueries = [
    publicClubs,
    publicEvents,
    memberships,
    myApplications,
    myTasks,
    myCalendar,
    notifications,
    unreadSummary,
    mediaCatalog,
    ...(canManageClubs || canAdminUsers ? [managedClubs, ...(canReviewApps ? [reviewSummary] : [])] : []),
    ...(canAdminUsers ? [systemStats] : []),
    ...(canAudit ? [auditLogs] : []),
  ];
  const isRefreshing = activeQueries.some((q) => q.isFetching && !q.isPending);

  const handleRefresh = async () => {
    await Promise.all(activeQueries.map((q) => q.refetch()));
    toast.success("Đã làm mới dữ liệu tổng quan.");
  };

  const kpiCards = [
    {
      label: "CLB hoạt động",
      value: publicClubs.isPending ? "—" : totalClubsCount,
      sub: `${sortedCategories.length} lĩnh vực hoạt động`,
      icon: Building2,
      href: "/clubs",
      accent: "text-primary bg-primary/8 border-primary/20",
    },
    {
      label: canManageClubs || canAdminUsers ? "CLB đang quản lý" : "CLB đang tham gia",
      value:
        canManageClubs || canAdminUsers
          ? managedClubs.isPending
            ? "—"
            : visibleManagedClubs.length
          : memberships.isPending
            ? "—"
            : activeMembershipsCount,
      sub:
        canManageClubs || canAdminUsers
          ? `${activeMembershipsCount} CLB tham gia trực tiếp`
          : myClubList.length
            ? `${myClubList.reduce((n, m) => n + (m.departments?.length || 0), 0)} ban chuyên môn`
            : "Khám phá & gia nhập ngay",
      icon: UsersRound,
      href: canManageClubs || canAdminUsers ? "/management?tab=clubs" : "/memberships",
      accent: "text-slate-700 bg-slate-100 border-slate-200",
    },
    {
      label: canReviewApps ? "Đơn chờ xét duyệt" : "Đơn ứng tuyển chờ duyệt",
      value: canReviewApps && reviewSummary.isPending ? "—" : pendingAppsCount,
      sub: `${approvedAppsCount} đã duyệt · ${relevantAppsTotal} tổng đơn`,
      icon: ClipboardList,
      href: canReviewApps ? "/management?tab=applications" : "/applications",
      accent: "text-primary bg-primary/8 border-primary/20",
    },
    {
      label: "Công việc của tôi",
      value: myTasks.isPending ? "—" : totalTasksCount,
      sub: `${completedTasksCount} hoàn thành · TB ${avgTaskProgress}%`,
      icon: ClipboardCheck,
      href: "/schedule",
      accent: "text-slate-700 bg-slate-100 border-slate-200",
    },
    {
      label: "Lịch & Sự kiện",
      value: publicEvents.isPending && myCalendar.isPending ? "—" : upcomingEvents.length,
      sub: `${activePublicEventsCount} sự kiện toàn trường sắp tới`,
      icon: Calendar,
      href: "/events",
      accent: "text-primary bg-primary/8 border-primary/20",
    },
    {
      label: canAdminUsers ? "Tài khoản hệ thống" : "Thông báo chưa đọc",
      value: canAdminUsers
        ? systemStats.isPending
          ? "—"
          : (systemStats.data?.totalUsers ?? 0)
        : notifications.isPending && unreadSummary.isPending
          ? "—"
          : unreadNotifCount,
      sub: canAdminUsers
        ? `${systemStats.data?.activeUsers ?? 0} hoạt động · ${unreadNotifCount} TB chưa đọc`
        : `${notifList.length} thông báo gần đây`,
      icon: canAdminUsers ? Users : Bell,
      href: canAdminUsers ? "/users" : "/notifications",
      accent: "text-slate-700 bg-slate-100 border-slate-200",
    },
  ];

  return (
    <div className="flex min-h-full w-full min-w-0 max-w-full flex-1 flex-col">
      <BreadcrumbToolbar
        crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Tổng quan hệ thống" }]}
        titleBadge={<CountBadge>Trực tiếp</CountBadge>}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-5 px-4 py-5 sm:px-6">
        <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:p-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <Image
              src="/images/vju-logo.png"
              alt="Logo VJU"
              width={48}
              height={48}
              className="size-12 shrink-0 rounded-full bg-white p-0.5 object-contain ring-1 ring-slate-200"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  BẢNG ĐIỀU KHIỂN TRUNG TÂM · VJU CLUBHUB
                </span>
                <StatusBadge status={session.user.status || "ACTIVE"} />
                {session.user.studentCode && <Badge tone="primary">{session.user.studentCode}</Badge>}
              </div>
              <h1 className="mt-1 line-clamp-2 wrap-break-word text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Xin chào, {session.user.fullName || session.user.email}
              </h1>
            </div>
          </div>

          {(canManageClubs || canAdminUsers) && (
            <Link
              href="/management?tab=clubs"
              className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
            >
              Không gian CLB <ArrowRight size={13} />
            </Link>
          )}
        </section>

        <StatKpiGrid items={kpiCards} />

        <DashboardLatestNotifications
          notifications={notifList}
          loading={notifications.isPending}
          unreadCount={unreadNotifCount}
          markAllReadPending={markAllRead.isPending}
          onMarkAllRead={() => markAllRead.mutate()}
          onMarkOneRead={(id) => markOneRead.mutate(id)}
        />

        <UpcomingInterviewsBanner applications={myAppsList} nowMs={now} />

        <DashboardActivitySection
          activeFeedTab={activeFeedTab}
          setActiveFeedTab={setActiveFeedTab}
          canReviewApps={canReviewApps}
          relevantApps={relevantApps}
          relevantAppsTotal={relevantAppsTotal}
          tasksList={tasksList}
          myClubList={myClubList}
          allClubs={allClubs}
          mediaCatalog={mediaCatalog.data}
          upcomingEvents={upcomingEvents}
        />

        <DashboardAnalyticsCards
          publicClubsPending={publicClubs.isPending}
          totalClubsCount={totalClubsCount}
          sortedCategories={sortedCategories}
          canReviewApps={canReviewApps}
          relevantAppsCount={relevantAppsTotal}
          pendingAppsCount={pendingAppsCount}
          approvedAppsCount={approvedAppsCount}
          rejectedAppsCount={rejectedAppsCount}
        />

        <DashboardSystemAuditSection
          canAdminUsers={canAdminUsers}
          systemStats={systemStats.data}
          canAudit={canAudit}
          auditLogsPending={auditLogs.isPending}
          auditLogs={auditLogs.data?.items ?? []}
          allClubs={allClubs}
          currentUserId={session.user.id}
          currentUserLabel={session.user.fullName || session.user.email}
        />
      </div>
    </div>
  );
}
