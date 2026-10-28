"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode, useState } from "react";
import { ArrowRight, Bell, Calendar, ClipboardCheck, ClipboardList, Compass, MapPin, UsersRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiModel, ApplicationSummary, User } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { formatDateTime, formatDay } from "@/lib/utils";

const DONE_TASKS = new Set(["DONE", "COMPLETED", "VERIFIED", "CANCELLED"]);

type UpcomingEvent = { id: string; title: string; clubName: string; location?: string; startTime: string; mine: boolean };

export function StudentDashboard({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [now] = useState(() => Date.now());

  // Same keys as the manager view so both share the cache.
  const memberships = useQuery({ queryKey: ["dashboard", "memberships"], queryFn: apiModel.myMemberships });
  const applications = useQuery({ queryKey: ["dashboard", "my-applications"], queryFn: apiModel.myApplications });
  const tasks = useQuery({ queryKey: ["dashboard", "my-tasks"], queryFn: () => apiModel.myTasks() });
  const calendar = useQuery({ queryKey: ["dashboard", "my-calendar"], queryFn: () => apiModel.myCalendar() });
  const publicEvents = useQuery({ queryKey: ["dashboard", "public-events"], queryFn: () => apiModel.publicEvents(0, 10) });
  const publicClubs = useQuery({ queryKey: ["dashboard", "public-clubs"], queryFn: () => apiModel.publicClubs("", "", 0, 100) });
  const notifications = useQuery({ queryKey: ["dashboard", "notifications"], queryFn: apiModel.notifications });

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

  const upcoming = new Map<string, UpcomingEvent>();
  for (const item of calendar.data ?? []) {
    if (item.itemType === "EVENT" && new Date(item.endTime).getTime() > now) {
      upcoming.set(item.id, { id: item.id, title: item.title, clubName: item.clubName, location: item.location, startTime: item.startTime, mine: true });
    }
  }
  for (const event of publicEvents.data?.items ?? []) {
    if (!upcoming.has(event.id) && new Date(event.endTime).getTime() > now) {
      upcoming.set(event.id, { id: event.id, title: event.title, clubName: event.clubName, location: event.location, startTime: event.startTime, mine: false });
    }
  }
  const events = [...upcoming.values()].sort((a, b) => a.startTime.localeCompare(b.startTime)).slice(0, 5);

  const loading = memberships.isPending || applications.isPending;
  const nextStep = loading
    ? null
    : pendingApps.length > 0
      ? { text: `Đơn vào ${pendingApps[0].clubName}${pendingApps.length > 1 ? ` và ${pendingApps.length - 1} CLB khác` : ""} đang chờ CLB xét duyệt.`, href: "/applications", action: "Xem đơn của tôi" }
      : activeClubs.length === 0
        ? { text: "Bạn chưa tham gia câu lạc bộ nào. Tìm một CLB hợp với bạn và nộp đơn ngay.", href: "/clubs", action: "Tìm câu lạc bộ" }
        : openTasks.length > 0
          ? { text: `Bạn có ${openTasks.length} việc đang cần làm.`, href: "/schedule", action: "Xem công việc" }
          : { text: `Bạn đang là thành viên của ${activeClubs.length} câu lạc bộ.`, href: "/schedule", action: "Xem lịch hoạt động" };

  const confirmCancel = (app: ApplicationSummary) => {
    if (confirm(`Huỷ đơn đăng ký vào ${app.clubName}?`)) cancel.mutate(app.id);
  };

  const refreshAll = () => [memberships, applications, tasks, calendar, publicEvents, publicClubs, notifications].forEach((q) => q.refetch());

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <BreadcrumbToolbar crumbs={[{ label: "Trang chủ", href: "/home" }, { label: "Tổng quan của tôi" }]} onRefresh={refreshAll} />

      <div className="mx-auto w-full max-w-[1200px] space-y-5 px-4 py-5 sm:px-6">
        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <Image src="/images/vju-logo.png" alt="Logo VJU" width={48} height={48} className="size-12 shrink-0 rounded-full bg-white p-0.5 object-contain ring-1 ring-slate-200" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Xin chào, {user.fullName || user.email}</h1>
                {user.studentCode && <Badge tone="primary">{user.studentCode}</Badge>}
              </div>
              <p className="mt-1 text-sm text-slate-600">{nextStep?.text ?? "Đang tải…"}</p>
            </div>
          </div>
          {nextStep && (
            <Link href={nextStep.href} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90">
              {nextStep.action} <ArrowRight size={14} />
            </Link>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <div className="space-y-5">
            {activeClubs.length === 0 && !memberships.isPending ? (
              <Panel icon={<Compass size={15} />} title="Câu lạc bộ gợi ý cho bạn" href="/clubs" linkLabel="Xem tất cả">
                {suggestedClubs.length === 0 ? (
                  <Empty>{publicClubs.isPending ? "Đang tải…" : "Hiện chưa có câu lạc bộ nào đang nhận thành viên."}</Empty>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {suggestedClubs.map((club) => (
                      <li key={club.id} className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{club.name}</p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{club.activityField || club.description || club.code}</p>
                        </div>
                        <Link href="/clubs" className="shrink-0 rounded-lg border border-primary/30 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5">Xem & nộp đơn</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            ) : (
              <Panel icon={<UsersRound size={15} />} title="Câu lạc bộ của tôi" href="/memberships" linkLabel="Chi tiết">
                <ul className="divide-y divide-slate-100">
                  {myClubs.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{m.clubName}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {m.departments.length ? `Ban: ${m.departments.map((d) => d.name).join(", ")}` : "Chưa thuộc ban nào"}
                          {m.joinedAt && ` · Tham gia ${formatDay(m.joinedAt)}`}
                        </p>
                      </div>
                      <StatusBadge status={m.status} />
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {myApps.length > 0 && (
              <Panel icon={<ClipboardList size={15} />} title="Đơn đăng ký của tôi" href="/applications" linkLabel="Tất cả đơn">
                <ul className="divide-y divide-slate-100">
                  {myApps.slice(0, 5).map((app) => (
                    <li key={app.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{app.clubName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">Nộp ngày {formatDay(app.createdAt)}{app.reviewedAt && ` · Xét ngày ${formatDay(app.reviewedAt)}`}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={app.status} />
                        {app.status === "PENDING" && (
                          <button type="button" onClick={() => confirmCancel(app)} disabled={cancel.isPending} className="rounded-md px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Huỷ đơn</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {cancel.isError && <p role="alert" className="mt-2 text-xs text-rose-700">{describeError(cancel.error)}</p>}
              </Panel>
            )}

            {openTasks.length > 0 && (
              <Panel icon={<ClipboardCheck size={15} />} title="Việc được giao cho tôi" href="/schedule" linkLabel="Xem tất cả">
                <ul className="divide-y divide-slate-100">
                  {openTasks.slice(0, 5).map((task) => (
                    <li key={task.id} className="py-3">
                      <div className="flex items-center justify-between gap-4">
                        <p className="truncate text-sm font-semibold text-slate-900">{task.title}</p>
                        <StatusBadge status={task.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{task.clubName} · Hạn {formatDateTime(task.deadline)}</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary" style={{ width: `${task.progressPercent}%` }} /></div>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>

          <div className="space-y-5">
            <Panel icon={<Calendar size={15} />} title="Sự kiện sắp tới" href="/schedule" linkLabel="Xem lịch">
              {events.length === 0 ? (
                <Empty>{calendar.isPending || publicEvents.isPending ? "Đang tải…" : "Chưa có sự kiện nào sắp diễn ra."}</Empty>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {events.map((event) => (
                    <li key={event.id} className="flex gap-3 py-3">
                      <DateTile iso={event.startTime} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{event.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{event.clubName} · {new Date(event.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {event.location && <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><MapPin size={11} /> {event.location}</span>}
                          {event.mine && <Badge tone="primary">Trong lịch của tôi</Badge>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              icon={<Bell size={15} />}
              title={unread ? `Thông báo (${unread} chưa đọc)` : "Thông báo"}
              href="/notifications"
              linkLabel="Tất cả"
              extra={unread > 0 && (
                <button type="button" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending} className="text-[11px] font-semibold text-slate-500 hover:text-primary disabled:opacity-50">Đánh dấu đã đọc</button>
              )}
            >
              {notifList.length === 0 ? (
                <Empty>{notifications.isPending ? "Đang tải…" : "Bạn chưa có thông báo nào."}</Empty>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {notifList.slice(0, 5).map((n) => (
                    <li key={n.id} className="flex gap-2.5 py-3">
                      <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${n.read ? "bg-slate-200" : "bg-primary"}`} />
                      <div className="min-w-0">
                        <p className={`truncate text-sm ${n.read ? "text-slate-600" : "font-semibold text-slate-900"}`}>{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(n.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ icon, title, href, linkLabel, extra, children }: { icon: ReactNode; title: string; href: string; linkLabel: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900"><span className="text-primary">{icon}</span>{title}</h2>
        <div className="flex items-center gap-3">
          {extra}
          <Link href={href} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">{linkLabel} <ArrowRight size={12} /></Link>
        </div>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-xs text-slate-500">{children}</p>;
}

function DateTile({ iso }: { iso: string }) {
  const date = new Date(iso);
  return (
    <div className="grid w-11 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/5 py-1.5 text-primary">
      <span className="text-base font-extrabold leading-none">{date.getDate()}</span>
      <span className="mt-0.5 text-[9px] font-bold uppercase">Th{date.getMonth() + 1}</span>
    </div>
  );
}
