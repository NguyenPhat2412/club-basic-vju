"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ClipboardCheck, ClipboardList, Compass, UsersRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiModel, ApplicationSummary, User } from "@/lib/api";
import { clubSlugFromCode } from "@/lib/media";
import { describeError } from "@/components/shared/ListPage";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { ClubAvatar, useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { StatSummaryStrip } from "@/components/shared/StatCards";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { formatDateTime, formatDay } from "@/lib/utils";
import {
  DashboardEmptyHint,
  DashboardSectionPanel,
  StudentDashboardSidebar,
  StudentUpcomingEvent,
} from "./StudentDashboardSidebar";

const DONE_TASKS = new Set(["DONE", "COMPLETED", "VERIFIED", "CANCELLED"]);

export function StudentDashboard({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [now] = useState(() => Date.now());
  const mediaCatalog = useClubMediaCatalog(true);

  const memberships = useQuery({ queryKey: ["dashboard", "memberships"], queryFn: () => apiModel.myMemberships() });
  const applications = useQuery({
    queryKey: ["dashboard", "my-applications"],
    queryFn: () => apiModel.myApplications(),
  });
  const tasks = useQuery({ queryKey: ["dashboard", "my-tasks"], queryFn: () => apiModel.myTasks() });
  const calendar = useQuery({ queryKey: ["dashboard", "my-calendar"], queryFn: () => apiModel.myCalendar() });
  const publicEvents = useQuery({
    queryKey: ["dashboard", "public-events"],
    queryFn: () => apiModel.publicEvents(0, 10),
  });
  const publicClubs = useQuery({
    queryKey: ["dashboard", "public-clubs"],
    queryFn: () => apiModel.publicClubs("", "", 0, 100),
  });
  const notifications = useQuery({
    queryKey: ["dashboard", "notifications"],
    queryFn: () => apiModel.notifications(),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => apiModel.cancelApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "my-applications"] });
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });
  const markAllRead = useMutation({
    mutationFn: () => apiModel.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const myClubs = (memberships.data?.items ?? []).filter((m) => m.status !== "LEFT");
  const activeClubs = myClubs.filter((m) => m.status === "ACTIVE");
  const myApps = applications.data?.items ?? [];
  const pendingApps = myApps.filter((a) => a.status === "PENDING");
  const openTasks = (tasks.data?.items ?? []).filter((t) => !DONE_TASKS.has(t.status));
  const notifList = notifications.data?.items ?? [];
  const unread = notifList.filter((n) => !n.read).length;

  const busyClubIds = new Set([...myClubs.map((m) => m.clubId), ...pendingApps.map((a) => a.clubId)]);
  const suggestedClubs = (publicClubs.data?.items ?? []).filter((c) => !busyClubIds.has(c.id)).slice(0, 3);

  const upcoming = new Map<string, StudentUpcomingEvent>();
  for (const item of calendar.data ?? []) {
    if (item.itemType === "EVENT" && new Date(item.endTime).getTime() > now) {
      upcoming.set(item.id, {
        id: item.id,
        title: item.title,
        clubName: item.clubName,
        location: item.location,
        startTime: item.startTime,
        mine: true,
      });
    }
  }
  for (const event of publicEvents.data?.items ?? []) {
    if (!upcoming.has(event.id) && new Date(event.endTime).getTime() > now) {
      upcoming.set(event.id, {
        id: event.id,
        title: event.title,
        clubName: event.clubName,
        location: event.location,
        startTime: event.startTime,
        mine: false,
      });
    }
  }
  const events = [...upcoming.values()].sort((a, b) => a.startTime.localeCompare(b.startTime)).slice(0, 5);

  const loading = memberships.isPending || applications.isPending;
  const nextStep = loading
    ? null
    : pendingApps.length > 0
      ? {
          text: `Đơn vào ${pendingApps[0].clubName}${pendingApps.length > 1 ? ` và ${pendingApps.length - 1} CLB khác` : ""} đang chờ CLB xét duyệt.`,
          href: "/applications",
          action: "Xem đơn của tôi",
        }
      : activeClubs.length === 0
        ? {
            text: "Bạn chưa tham gia câu lạc bộ nào. Tìm một CLB hợp với bạn và nộp đơn ngay.",
            href: "/clubs",
            action: "Tìm câu lạc bộ",
          }
        : openTasks.length > 0
          ? { text: `Bạn có ${openTasks.length} việc đang cần làm.`, href: "/schedule", action: "Xem công việc" }
          : {
              text: `Bạn đang là thành viên của ${activeClubs.length} câu lạc bộ.`,
              href: "/schedule",
              action: "Xem lịch hoạt động",
            };

  const confirmCancel = (app: ApplicationSummary) => {
    if (confirm(`Huỷ đơn đăng ký vào ${app.clubName}?`)) cancel.mutate(app.id);
  };

  const refreshAll = () =>
    [memberships, applications, tasks, calendar, publicEvents, publicClubs, notifications].forEach((q) => q.refetch());

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <BreadcrumbToolbar
        crumbs={[{ label: "Trang chủ", href: "/home" }, { label: "Tổng quan của tôi" }]}
        onRefresh={refreshAll}
      />

      <div className="mx-auto w-full max-w-[1200px] space-y-5 px-4 py-5 sm:px-6">
        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
            <Image
              src="/images/vju-logo.png"
              alt="Logo VJU"
              width={48}
              height={48}
              className="size-11 shrink-0 rounded-full bg-white p-0.5 object-contain ring-1 ring-slate-200 sm:size-12"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-base font-bold tracking-tight text-slate-900 sm:truncate sm:text-xl">
                  Xin chào, {user.fullName || user.email}
                </h1>
                {user.studentCode && <Badge tone="primary">{user.studentCode}</Badge>}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
                {nextStep?.text ?? "Đang tải…"}
              </p>
            </div>
          </div>
          {nextStep && (
            <Link
              href={nextStep.href}
              className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
            >
              {nextStep.action} <ArrowRight size={14} />
            </Link>
          )}
        </section>

        <StatSummaryStrip
          items={[
            {
              label: "CLB đang tham gia",
              value: memberships.isPending ? "—" : activeClubs.length,
              href: "/memberships",
            },
            {
              label: "Đơn chờ xét duyệt",
              value: applications.isPending ? "—" : pendingApps.length,
              valueClassName: "text-primary",
              href: "/applications",
            },
            {
              label: "Việc cần thực hiện",
              value: tasks.isPending ? "—" : openTasks.length,
              href: "/schedule",
            },
            {
              label: "Sự kiện sắp tới",
              value: calendar.isPending && publicEvents.isPending ? "—" : events.length,
              valueClassName: "text-emerald-700",
              href: "/events",
            },
          ]}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            {activeClubs.length === 0 && !memberships.isPending ? (
              <DashboardSectionPanel
                icon={<Compass size={15} />}
                title="Câu lạc bộ gợi ý cho bạn"
                href="/clubs"
                linkLabel="Xem tất cả"
              >
                {suggestedClubs.length === 0 ? (
                  <DashboardEmptyHint>
                    {publicClubs.isPending ? "Đang tải…" : "Hiện chưa có câu lạc bộ nào đang nhận thành viên."}
                  </DashboardEmptyHint>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {suggestedClubs.map((club) => {
                      const media = mediaCatalog.data?.clubs[clubSlugFromCode(club.code)];
                      return (
                        <li
                          key={club.id}
                          className="flex flex-col items-start justify-between gap-2.5 py-3 sm:flex-row sm:items-center sm:gap-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <ClubAvatar
                              name={club.name}
                              code={club.code}
                              logoUrl={club.logoUrl}
                              fallbackUrl={media?.logo}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{club.name}</p>
                              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                                {club.activityField || club.description || club.code}
                              </p>
                            </div>
                          </div>
                          <Link
                            href={`/clubs?clubId=${club.id}`}
                            className="w-full shrink-0 rounded-lg border border-primary/30 px-3 py-1.5 text-center text-[11px] font-bold text-primary hover:bg-primary/5 sm:w-auto"
                          >
                            Xem & nộp đơn
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </DashboardSectionPanel>
            ) : (
              <DashboardSectionPanel
                icon={<UsersRound size={15} />}
                title="Câu lạc bộ của tôi"
                href="/memberships"
                linkLabel="Chi tiết"
              >
                <ul className="divide-y divide-slate-100">
                  {myClubs.map((m) => {
                    const media = mediaCatalog.data?.clubs[clubSlugFromCode(m.clubCode)];
                    return (
                      <li key={m.id} className="flex items-center justify-between gap-2.5 py-3 sm:gap-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <ClubAvatar name={m.clubName} code={m.clubCode} fallbackUrl={media?.logo} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">{m.clubName}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {m.departments.length
                                ? `Ban: ${m.departments.map((d) => d.name).join(", ")}`
                                : "Chưa thuộc ban nào"}
                              {m.joinedAt && ` · Tham gia ${formatDay(m.joinedAt)}`}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <StatusBadge status={m.status} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </DashboardSectionPanel>
            )}

            {myApps.length > 0 && (
              <DashboardSectionPanel
                icon={<ClipboardList size={15} />}
                title="Đơn đăng ký của tôi"
                href="/applications"
                linkLabel="Tất cả đơn"
              >
                <ul className="divide-y divide-slate-100">
                  {myApps.slice(0, 5).map((app) => (
                    <li key={app.id} className="flex flex-wrap items-center justify-between gap-2.5 py-3 sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{app.clubName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Nộp ngày {formatDay(app.createdAt)}
                          {app.reviewedAt && ` · Xét ngày ${formatDay(app.reviewedAt)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={app.status} />
                        {app.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => confirmCancel(app)}
                            disabled={cancel.isPending}
                            className="rounded-md px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            Huỷ đơn
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {cancel.isError && (
                  <p role="alert" className="mt-2 text-xs text-rose-700">
                    {describeError(cancel.error)}
                  </p>
                )}
              </DashboardSectionPanel>
            )}

            {openTasks.length > 0 && (
              <DashboardSectionPanel
                icon={<ClipboardCheck size={15} />}
                title="Việc được giao cho tôi"
                href="/schedule"
                linkLabel="Xem tất cả"
              >
                <ul className="divide-y divide-slate-100">
                  {openTasks.slice(0, 5).map((task) => (
                    <li key={task.id} className="py-3">
                      <div className="flex min-w-0 items-center justify-between gap-4">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{task.title}</p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <StatusBadge status={task.status} />
                          {task.overdue && <StatusBadge status="OVERDUE" />}
                        </div>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {task.clubName} · Hạn {formatDateTime(task.deadline)}
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${task.progressPercent}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </DashboardSectionPanel>
            )}
          </div>

          <StudentDashboardSidebar
            events={events}
            eventsLoading={calendar.isPending || publicEvents.isPending}
            notifications={notifList}
            notificationsLoading={notifications.isPending}
            unreadCount={unread}
            markAllReadPending={markAllRead.isPending}
            onMarkAllRead={() => markAllRead.mutate()}
          />
        </div>
      </div>
    </div>
  );
}
