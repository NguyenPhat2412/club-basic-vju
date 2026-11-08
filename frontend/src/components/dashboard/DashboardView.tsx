"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  Building2,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Users,
  UsersRound,
} from "lucide-react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiModel, ApplicationSummary } from "@/lib/api";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { CLUB_MANAGEMENT_KEYS } from "@/hooks/useSession";
import { FirstLoginPassword } from "@/components/layout/FirstLoginPassword";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { StatKpiGrid } from "@/components/shared/StatCards";
import { LoadingRows } from "@/components/shared/States";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { DashboardAnalyticsCards } from "@/components/dashboard/DashboardAnalyticsCards";
import { DashboardActivitySection } from "@/components/dashboard/DashboardActivitySection";
import { DashboardSystemAuditSection } from "@/components/dashboard/DashboardSystemAuditSection";

const APPLICATION_PERMISSIONS = [
  "application.view",
  "application.review",
  "application.approve",
  "application.reject",
];

export function DashboardView() {
  const queryClient = useQueryClient();
  const session = useOptionalSession();
  const [activeFeedTab, setActiveFeedTab] = useState<"applications" | "tasks" | "clubs">("applications");
  const mediaCatalog = useClubMediaCatalog(true);

  const canQuery = !!session.user && !session.mustChangePassword;
  const canReviewApps = APPLICATION_PERMISSIONS.some(session.can);
  const canManageClubs = CLUB_MANAGEMENT_KEYS.some(session.can);
  const canAdminUsers = session.can("user.view");
  const canAudit = session.can("audit.view");

  const publicClubs = useQuery({
    queryKey: ["dashboard", "public-clubs"],
    queryFn: () => apiModel.publicClubs("", "", 0, 100),
    enabled: canQuery,
  });
  const publicEvents = useQuery({
    queryKey: ["dashboard", "public-events"],
    queryFn: () => apiModel.publicEvents(0, 10),
    enabled: canQuery,
  });
  const memberships = useQuery({
    queryKey: ["dashboard", "memberships"],
    queryFn: () => apiModel.myMemberships(),
    enabled: canQuery,
  });
  const myApplications = useQuery({
    queryKey: ["dashboard", "my-applications"],
    queryFn: () => apiModel.myApplications(),
    enabled: canQuery,
  });
  const myTasks = useQuery({
    queryKey: ["dashboard", "my-tasks"],
    queryFn: () => apiModel.myTasks(),
    enabled: canQuery,
  });
  const myCalendar = useQuery({
    queryKey: ["dashboard", "my-calendar"],
    queryFn: () => apiModel.myCalendar(),
    enabled: canQuery,
  });
  const notifications = useQuery({
    queryKey: ["dashboard", "notifications"],
    queryFn: () => apiModel.notifications(),
    enabled: canQuery,
  });

  const managedClubScope = session.clubsWith(CLUB_MANAGEMENT_KEYS);
  const managedClubs = useQuery({
    queryKey: ["dashboard", "manageable-clubs"],
    queryFn: () => apiModel.clubs("", "", 0, 100),
    enabled: canQuery && (canManageClubs || canAdminUsers),
  });
  const visibleManagedClubs = (managedClubs.data?.items ?? []).filter(
    (club) => managedClubScope.global || managedClubScope.ids.has(club.id),
  );
  const appReviewScope = session.clubsWith(APPLICATION_PERMISSIONS);
  const reviewableClubs = (managedClubs.data?.items ?? []).filter(
    (club) => appReviewScope.global || appReviewScope.ids.has(club.id),
  );
  const reviewQueues = useQueries({
    queries: reviewableClubs.map((club) => ({
      queryKey: ["dashboard", "club-applications", club.id],
      queryFn: () => apiModel.clubApplications(club.id),
      enabled: canQuery && canReviewApps,
    })),
  });

  const systemUsers = useQuery({
    queryKey: ["dashboard", "system-users-count"],
    queryFn: () => apiModel.users("", 0, 1),
    enabled: canQuery && canAdminUsers,
  });
  const systemStats = useQuery({
    queryKey: ["dashboard", "system-statistics"],
    queryFn: apiModel.systemStatistics,
    enabled: canQuery && canAdminUsers,
  });
  const auditLogs = useQuery({
    queryKey: ["dashboard", "audit-logs"],
    queryFn: () => apiModel.auditLogs({ limit: 6 }),
    enabled: canQuery && canAudit,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiModel.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (!session.settled) {
    return <LoadingRows />;
  }

  if (!session.user) {
    return (
      <main className="grid min-h-[calc(100svh-48px)] place-items-center bg-background px-5 py-12">
        <section className="w-full max-w-lg rounded-2xl border border-border bg-card px-7 py-10 text-center shadow-xs sm:px-10">
          <Image
            src="/images/vju-logo.png"
            alt="Logo Trường Đại học Việt Nhật (VJU)"
            width={56}
            height={56}
            className="mx-auto mb-4 size-14 rounded-full bg-white p-0.5 object-contain shadow-xs ring-1 ring-border"
          />
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            CỔNG THÔNG TIN CÂU LẠC BỘ · VJU CLUBHUB
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Đăng nhập để xem bảng điều khiển
          </h1>
          <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">
            Bảng điều khiển tổng hợp số liệu câu lạc bộ, hồ sơ ứng tuyển, tiến độ công việc, lịch sự kiện và thông báo của bạn.
          </p>
          <div className="mt-6 flex justify-center gap-2.5">
            <Link
              href="/home?auth=login"
              className="rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Đăng nhập
            </Link>
            <Link
              href="/home"
              className="rounded-lg border border-border px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted"
            >
              Về trang chủ
            </Link>
          </div>
        </section>
      </main>
    );
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
  const managedAppsList = reviewQueues.flatMap((q) => q.data?.items ?? []);
  const relevantApps: ApplicationSummary[] =
    canReviewApps && managedAppsList.length > 0 ? managedAppsList : myAppsList;

  const pendingAppsCount = relevantApps.filter((a) => a.status === "PENDING").length;
  const approvedAppsCount = relevantApps.filter((a) => a.status === "APPROVED").length;
  const rejectedAppsCount = relevantApps.filter((a) => a.status === "REJECTED").length;

  const tasksList = myTasks.data?.items ?? [];
  const totalTasksCount = myTasks.data?.total ?? tasksList.length;
  const completedTasksCount = tasksList.filter(
    (t) => t.status === "COMPLETED" || t.status === "DONE" || t.status === "VERIFIED",
  ).length;
  const inProgressTasksCount = tasksList.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "OPEN" || t.status === "TODO",
  ).length;
  const avgTaskProgress =
    tasksList.length > 0
      ? Math.round(tasksList.reduce((acc, t) => acc + (t.progressPercent || 0), 0) / tasksList.length)
      : 0;

  const calendarEvents = myCalendar.data ?? [];
  const upcomingPublicEvents = publicEvents.data?.items ?? [];
  const totalUpcomingEvents = calendarEvents.length || upcomingPublicEvents.length;

  const notifList = notifications.data?.items ?? [];
  const unreadNotifCount = notifList.filter((n) => !n.read).length;

  const categoryCounts = allClubs.reduce<Record<string, number>>((acc, club) => {
    const cat = club.activityField?.trim() || "Khác";
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  const refreshAll = () => {
    publicClubs.refetch();
    publicEvents.refetch();
    memberships.refetch();
    myApplications.refetch();
    myTasks.refetch();
    myCalendar.refetch();
    notifications.refetch();
    if (canManageClubs || canAdminUsers) {
      managedClubs.refetch();
      reviewQueues.forEach((q) => q.refetch());
    }
    if (canAdminUsers) {
      systemUsers.refetch();
      systemStats.refetch();
    }
    mediaCatalog.refetch();
    if (canAudit) auditLogs.refetch();
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
      value: canReviewApps && managedClubs.isPending ? "—" : pendingAppsCount,
      sub: `${approvedAppsCount} đã duyệt · ${relevantApps.length} tổng đơn`,
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
      value: publicEvents.isPending && myCalendar.isPending ? "—" : totalUpcomingEvents,
      sub: `${upcomingPublicEvents.length} sự kiện toàn trường`,
      icon: Calendar,
      href: "/schedule",
      accent: "text-primary bg-primary/8 border-primary/20",
    },
    {
      label: canAdminUsers ? "Tài khoản hệ thống" : "Thông báo chưa đọc",
      value: canAdminUsers
        ? systemUsers.isPending
          ? "—"
          : (systemUsers.data?.total ?? 0)
        : notifications.isPending
          ? "—"
          : unreadNotifCount,
      sub: canAdminUsers ? `${unreadNotifCount} thông báo chưa đọc` : `${notifList.length} thông báo gần đây`,
      icon: canAdminUsers ? Users : Bell,
      href: canAdminUsers ? "/users" : "/notifications",
      accent: "text-slate-700 bg-slate-100 border-slate-200",
    },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <BreadcrumbToolbar
        crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Tổng quan hệ thống" }]}
        titleBadge={<CountBadge>Trực tiếp</CountBadge>}
        onRefresh={refreshAll}
      />

      <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-5 sm:px-6">
        <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-center gap-3.5">
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
              <h1 className="mt-1 truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Xin chào, {session.user.fullName || session.user.email}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Theo dõi số liệu câu lạc bộ, tiến độ công việc, đơn ứng tuyển và các hoạt động mới nhất trong thời gian thực.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">CLB đang quản lý</p>
              <p className="mt-0.5 text-base font-extrabold text-primary">{visibleManagedClubs.length} CLB</p>
            </div>
          </div>
        </section>

        <StatKpiGrid items={kpiCards} />

        <DashboardAnalyticsCards
          publicClubsPending={publicClubs.isPending}
          totalClubsCount={totalClubsCount}
          sortedCategories={sortedCategories}
          canReviewApps={canReviewApps}
          relevantAppsCount={relevantApps.length}
          pendingAppsCount={pendingAppsCount}
          approvedAppsCount={approvedAppsCount}
          rejectedAppsCount={rejectedAppsCount}
          myAppsCount={myAppsList.length}
          visibleManagedClubsCount={visibleManagedClubs.length}
          avgTaskProgress={avgTaskProgress}
          inProgressTasksCount={inProgressTasksCount}
          completedTasksCount={completedTasksCount}
          totalUpcomingEvents={totalUpcomingEvents}
        />

        <DashboardActivitySection
          activeFeedTab={activeFeedTab}
          setActiveFeedTab={setActiveFeedTab}
          canReviewApps={canReviewApps}
          relevantApps={relevantApps}
          tasksList={tasksList}
          myClubList={myClubList}
          allClubs={allClubs}
          mediaCatalog={mediaCatalog.data}
          upcomingPublicEvents={upcomingPublicEvents}
          calendarEvents={calendarEvents}
          unreadNotifCount={unreadNotifCount}
          notifList={notifList}
          notificationsPending={notifications.isPending}
          markAllReadPending={markAllRead.isPending}
          onMarkAllRead={() => markAllRead.mutate()}
        />

        <DashboardSystemAuditSection
          canAdminUsers={canAdminUsers}
          systemStats={systemStats.data}
          canAudit={canAudit}
          auditLogsPending={auditLogs.isPending}
          auditLogs={auditLogs.data?.items ?? []}
        />
      </div>
    </div>
  );
}
