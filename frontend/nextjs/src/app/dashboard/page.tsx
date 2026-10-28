"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  Clock,
  MapPin,
  ScrollText,
  Users,
  UsersRound,
} from "lucide-react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiModel, ApplicationSummary } from "@/lib/api";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { FirstLoginPassword } from "@/components/layout/FirstLoginPassword";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatDay } from "@/lib/utils";

const APPLICATION_PERMISSIONS = [
  "application.view",
  "application.review",
  "application.approve",
  "application.reject",
];

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const session = useOptionalSession();
  const [activeFeedTab, setActiveFeedTab] = useState<"applications" | "tasks" | "clubs">("applications");

  const canQuery = !!session.user && !session.mustChangePassword;
  const canReviewApps = APPLICATION_PERMISSIONS.some(session.can);
  const canAdminUsers = session.can("user.view");
  const canAudit = session.can("audit.view");

  // Queries - Personal & Public
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
    queryFn: apiModel.myMemberships,
    enabled: canQuery,
  });
  const myApplications = useQuery({
    queryKey: ["dashboard", "my-applications"],
    queryFn: apiModel.myApplications,
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
    queryFn: apiModel.notifications,
    enabled: canQuery,
  });

  // Queries - Club Management & System Admin
  const managedClubScope = session.clubsWith(APPLICATION_PERMISSIONS);
  const managedClubs = useQuery({
    queryKey: ["dashboard", "manageable-clubs"],
    queryFn: () => apiModel.clubs("", "", 0, 100),
    enabled: canQuery && canReviewApps,
  });
  const visibleManagedClubs = (managedClubs.data?.items ?? []).filter(
    (club) => managedClubScope.global || managedClubScope.ids.has(club.id)
  );
  const reviewQueues = useQueries({
    queries: visibleManagedClubs.map((club) => ({
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
              href="/login"
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

  // Aggregated Metrics
  const allClubs = publicClubs.data?.items ?? [];
  const totalClubsCount = publicClubs.data?.total ?? 0;
  const myClubList = memberships.data?.items ?? [];
  const activeMembershipsCount = myClubList.filter((m) => m.status === "ACTIVE").length || (memberships.data?.total ?? 0);

  const myAppsList = myApplications.data?.items ?? [];
  const managedAppsList = reviewQueues.flatMap((q) => q.data?.items ?? []);
  const relevantApps: ApplicationSummary[] = canReviewApps && managedAppsList.length > 0 ? managedAppsList : myAppsList;

  const pendingAppsCount = relevantApps.filter((a) => a.status === "PENDING").length;
  const approvedAppsCount = relevantApps.filter((a) => a.status === "APPROVED").length;
  const rejectedAppsCount = relevantApps.filter((a) => a.status === "REJECTED").length;

  const tasksList = myTasks.data?.items ?? [];
  const totalTasksCount = myTasks.data?.total ?? tasksList.length;
  const completedTasksCount = tasksList.filter(
    (t) => t.status === "COMPLETED" || t.status === "DONE" || t.status === "VERIFIED"
  ).length;
  const inProgressTasksCount = tasksList.filter((t) => t.status === "IN_PROGRESS" || t.status === "OPEN" || t.status === "TODO").length;
  const avgTaskProgress =
    tasksList.length > 0
      ? Math.round(tasksList.reduce((acc, t) => acc + (t.progressPercent || 0), 0) / tasksList.length)
      : 0;

  const calendarEvents = myCalendar.data ?? [];
  const upcomingPublicEvents = publicEvents.data?.items ?? [];
  const totalUpcomingEvents = calendarEvents.length || upcomingPublicEvents.length;

  const notifList = notifications.data?.items ?? [];
  const unreadNotifCount = notifList.filter((n) => !n.read).length;

  // Group clubs by activityField for visual distribution chart
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
    if (canReviewApps) {
      managedClubs.refetch();
      reviewQueues.forEach((q) => q.refetch());
    }
    if (canAdminUsers) systemUsers.refetch();
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
      label: "CLB đang tham gia",
      value: memberships.isPending ? "—" : activeMembershipsCount,
      sub: myClubList.length ? `${myClubList.reduce((n, m) => n + (m.departments?.length || 0), 0)} ban chuyên môn` : "Khám phá & gia nhập ngay",
      icon: UsersRound,
      href: "/memberships",
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
        {/* 1. Banner chào mừng & thông tin phiên làm việc */}
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

        {/* 2. Lưới 6 thẻ chỉ số KPI */}
        <section
          aria-label="Chỉ số tổng quan"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          {kpiCards.map(({ label, value, sub, icon: Icon, href, accent }) => (
            <Link
              key={label}
              href={href}
              className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg border ${accent}`}>
                  <Icon size={15} />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
                  {value}
                </p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground group-hover:text-foreground/80">
                  {sub}
                </p>
              </div>
            </Link>
          ))}
        </section>

        {/* 3. Khu vực Biểu đồ & Phân tích trực quan */}
        <section className="grid gap-4 lg:grid-cols-3">
          {/* Biểu đồ 1: Phân bổ CLB theo lĩnh vực */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  <BarChart3 size={15} />
                </span>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Phân bổ CLB theo lĩnh vực
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Tổng số {totalClubsCount} câu lạc bộ đang hoạt động
                  </p>
                </div>
              </div>
              <Link href="/clubs" className="text-[11px] font-semibold text-primary hover:underline">
                Xem tất cả
              </Link>
            </div>

            {publicClubs.isPending ? (
              <div className="mt-4 space-y-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : sortedCategories.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Chưa có dữ liệu lĩnh vực CLB.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {sortedCategories.slice(0, 5).map(([cat, count]) => {
                  const pct = totalClubsCount > 0 ? Math.round((count / totalClubsCount) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate font-semibold text-foreground">{cat}</span>
                        <span className="shrink-0 font-bold text-muted-foreground tabular-nums">
                          {count} CLB ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${Math.max(pct, 6)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Biểu đồ 2: Tình trạng Đơn ứng tuyển */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ClipboardList size={15} />
                </span>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {canReviewApps ? "Thống kê Duyệt đơn CLB" : "Trạng thái Đơn đăng ký"}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Tổng cộng {relevantApps.length} hồ sơ ứng tuyển
                  </p>
                </div>
              </div>
              <Link
                href={canReviewApps ? "/management?tab=applications" : "/applications"}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Chi tiết
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">Chờ duyệt</p>
                <p className="mt-1 text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                  {pendingAppsCount}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">Đã duyệt</p>
                <p className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {approvedAppsCount}
                </p>
              </div>
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300">Từ chối</p>
                <p className="mt-1 text-xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                  {rejectedAppsCount}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Tỷ lệ xử lý hồ sơ</span>
                <span className="font-bold text-foreground tabular-nums">
                  {relevantApps.length > 0
                    ? Math.round(((approvedAppsCount + rejectedAppsCount) / relevantApps.length) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                {relevantApps.length > 0 && (
                  <>
                    <div
                      className="bg-emerald-500 transition-all"
                      style={{ width: `${(approvedAppsCount / relevantApps.length) * 100}%` }}
                      title={`Đã duyệt: ${approvedAppsCount}`}
                    />
                    <div
                      className="bg-amber-500 transition-all"
                      style={{ width: `${(pendingAppsCount / relevantApps.length) * 100}%` }}
                      title={`Chờ duyệt: ${pendingAppsCount}`}
                    />
                    <div
                      className="bg-rose-500 transition-all"
                      style={{ width: `${(rejectedAppsCount / relevantApps.length) * 100}%` }}
                      title={`Từ chối: ${rejectedAppsCount}`}
                    />
                  </>
                )}
              </div>
              <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                <span>Đơn của cá nhân bạn: {myAppsList.length}</span>
                {canReviewApps && <span>CLB quản lý: {visibleManagedClubs.length} CLB</span>}
              </div>
            </div>
          </div>

          {/* Biểu đồ 3: Tiến độ Công việc & Hiệu suất */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Activity size={15} />
                </span>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Tiến độ Công việc cá nhân
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Hoàn thành trung bình {avgTaskProgress}%
                  </p>
                </div>
              </div>
              <Link href="/schedule" className="text-[11px] font-semibold text-primary hover:underline">
                Lịch & Việc
              </Link>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-full border-4 border-primary/20 bg-primary/5">
                <span className="text-base font-extrabold text-primary tabular-nums">{avgTaskProgress}%</span>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Đang thực hiện</span>
                  <span className="font-bold text-foreground tabular-nums">{inProgressTasksCount} việc</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Đã hoàn thành / Xác nhận</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {completedTasksCount} việc
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Sự kiện trong lịch</span>
                  <span className="font-bold text-foreground tabular-nums">{totalUpcomingEvents} mục</span>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-muted-foreground">Lối tắt báo cáo tiến độ</span>
                <Link
                  href="/schedule"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  Cập nhật ngay <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Khu vực Bảng dữ liệu vận hành & Lịch trình / Thông báo */}
        <section className="grid gap-4 lg:grid-cols-[1.35fr_.95fr]">
          {/* Cột trái: Bảng Hoạt động Trọng tâm (Đơn ứng tuyển / Công việc / Câu lạc bộ) */}
          <div className="flex flex-col rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
              <div className="flex items-center gap-1 rounded-lg bg-secondary/70 p-1">
                <button
                  type="button"
                  onClick={() => setActiveFeedTab("applications")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    activeFeedTab === "applications"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {canReviewApps ? "Đơn ứng tuyển CLB" : "Đơn đăng ký của tôi"} ({relevantApps.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFeedTab("tasks")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    activeFeedTab === "tasks"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Công việc ({tasksList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFeedTab("clubs")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    activeFeedTab === "clubs"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Câu lạc bộ ({myClubList.length || allClubs.length})
                </button>
              </div>

              <Link
                href={
                  activeFeedTab === "applications"
                    ? canReviewApps
                      ? "/management?tab=applications"
                      : "/applications"
                    : activeFeedTab === "tasks"
                      ? "/schedule"
                      : "/clubs"
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Mở trang đầy đủ <ArrowRight size={13} />
              </Link>
            </div>

            <div className="flex-1 p-4 sm:p-5">
              {activeFeedTab === "applications" && (
                <>
                  {relevantApps.length === 0 ? (
                    <div className="py-10 text-center">
                      <ClipboardList className="mx-auto size-8 text-muted-foreground/60" />
                      <p className="mt-2 text-xs font-semibold text-foreground">Chưa có hồ sơ ứng tuyển nào</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Bạn có thể khám phá các câu lạc bộ và nộp đơn đăng ký trực tuyến.
                      </p>
                      <Link
                        href="/clubs"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      >
                        Khám phá CLB
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {relevantApps.slice(0, 6).map((app) => (
                        <div
                          key={app.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-xs font-bold text-foreground">
                                {app.clubName}
                              </span>
                              <Badge>{app.clubCode}</Badge>
                              {app.preferredDepartmentName && (
                                <Badge tone="primary">NV1: {app.preferredDepartmentName}</Badge>
                              )}
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {app.facultyMajor ? `${app.facultyMajor} · ` : ""}
                              Nộp lúc {formatDateTime(app.createdAt)}
                              {typeof app.attachmentCount === "number" && app.attachmentCount > 0
                                ? ` · ${app.attachmentCount} tệp đính kèm`
                                : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={app.status} />
                            <Link
                              href={canReviewApps ? "/management?tab=applications" : "/applications"}
                              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-muted"
                            >
                              Xem
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeFeedTab === "tasks" && (
                <>
                  {tasksList.length === 0 ? (
                    <div className="py-10 text-center">
                      <ClipboardCheck className="mx-auto size-8 text-muted-foreground/60" />
                      <p className="mt-2 text-xs font-semibold text-foreground">Bạn chưa có công việc nào được giao</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Các nhiệm vụ từ Ban chủ nhiệm CLB sẽ xuất hiện tại đây.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {tasksList.slice(0, 6).map((task) => (
                        <div
                          key={task.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-xs font-bold text-foreground">{task.title}</span>
                              <StatusBadge status={task.priority} />
                              <StatusBadge status={task.status} />
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {task.clubName} {task.departmentName ? `· ${task.departmentName}` : ""} · Hạn:{" "}
                              {formatDay(task.deadline)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-24">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-muted-foreground">Tiến độ</span>
                                <span className="text-primary tabular-nums">{task.progressPercent}%</span>
                              </div>
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${task.progressPercent}%` }}
                                />
                              </div>
                            </div>
                            <Link
                              href="/schedule"
                              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-muted"
                            >
                              Cập nhật
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeFeedTab === "clubs" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(myClubList.length > 0 ? myClubList : allClubs.slice(0, 6)).map((item) => {
                    const isMembership = "clubId" in item;
                    const clubName = isMembership ? item.clubName : item.name;
                    const clubCode = isMembership ? item.clubCode : item.code;
                    const status = item.status;
                    return (
                      <Link
                        key={item.id}
                        href={isMembership ? "/memberships" : "/clubs"}
                        className="flex flex-col justify-between rounded-xl border border-border bg-background/60 p-3.5 transition-colors hover:border-primary/40 hover:bg-card"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <Badge tone="primary">{clubCode}</Badge>
                            <StatusBadge status={status} />
                          </div>
                          <p className="mt-2 truncate text-xs font-bold text-foreground">{clubName}</p>
                          {isMembership && item.departments?.length > 0 ? (
                            <p className="mt-1 truncate text-[11px] text-muted-foreground">
                              Ban: {item.departments.map((d) => d.name).join(", ")}
                            </p>
                          ) : !isMembership && item.activityField ? (
                            <p className="mt-1 truncate text-[11px] text-muted-foreground">
                              Lĩnh vực: {item.activityField}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Sự kiện sắp diễn ra & Thông báo mới nhất */}
          <div className="space-y-4">
            {/* Sự kiện sắp tới */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Calendar size={15} />
                  </span>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Sự kiện & Lịch sinh hoạt
                    </h2>
                    <p className="text-[11px] text-muted-foreground">Hoạt động CLB sắp diễn ra</p>
                  </div>
                </div>
                <Link href="/schedule" className="text-[11px] font-semibold text-primary hover:underline">
                  Xem lịch
                </Link>
              </div>

              {upcomingPublicEvents.length === 0 && calendarEvents.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Chưa có sự kiện nào sắp diễn ra.
                </p>
              ) : (
                <div className="mt-3 divide-y divide-border">
                  {(upcomingPublicEvents.length > 0 ? upcomingPublicEvents : calendarEvents)
                    .slice(0, 4)
                    .map((ev) => (
                      <div key={ev.id} className="py-2.5 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-foreground">{ev.title}</p>
                          <StatusBadge status={ev.status} />
                        </div>
                        <p className="mt-0.5 text-[11px] font-medium text-primary">{ev.clubName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={11} /> {formatDateTime(ev.startTime)}
                          </span>
                          {ev.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={11} /> {ev.location}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Thông báo mới nhất */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Bell size={15} />
                  </span>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Thông báo mới nhất
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      {unreadNotifCount > 0 ? `${unreadNotifCount} thông báo chưa đọc` : "Đã đọc tất cả thông báo"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadNotifCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={markAllRead.isPending}
                      onClick={() => markAllRead.mutate()}
                    >
                      <CheckCheck size={12} /> Đọc hết
                    </Button>
                  )}
                  <Link href="/notifications" className="text-[11px] font-semibold text-primary hover:underline">
                    Tất cả
                  </Link>
                </div>
              </div>

              {notifications.isPending ? (
                <div className="mt-3 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : notifList.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Bạn chưa có thông báo mới.</p>
              ) : (
                <div className="mt-3 divide-y divide-border">
                  {notifList.slice(0, 4).map((item) => (
                    <Link
                      href="/notifications"
                      key={item.id}
                      className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0 hover:opacity-85"
                    >
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          item.read ? "bg-muted-foreground/35" : "bg-primary"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-foreground">{item.title}</p>
                          <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                            {formatDay(item.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{item.message}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 5. Nhật ký hệ thống gần đây (hiển thị khi có quyền audit) */}
        {canAudit && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ScrollText size={15} />
                </span>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Nhật ký hệ thống gần đây (Audit Logs)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Giám sát các thao tác quan trọng theo thời gian thực
                  </p>
                </div>
              </div>
              <Link href="/audit-logs" className="text-[11px] font-semibold text-primary hover:underline">
                Xem tất cả
              </Link>
            </div>

            {auditLogs.isPending ? (
              <div className="mt-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : !auditLogs.data?.items.length ? (
              <p className="py-6 text-center text-xs text-slate-500">Chưa có bản ghi nhật ký nào.</p>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {auditLogs.data.items.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge tone="primary">{log.action}</Badge>
                        <span className="truncate text-xs font-semibold text-slate-900">
                          {log.resourceType}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10.5px] text-slate-500">
                        ID: {log.resourceId}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-500 tabular-nums">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
