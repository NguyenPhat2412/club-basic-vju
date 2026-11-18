"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ArrowRight, Bell, Calendar, CheckCheck, MapPin } from "lucide-react";
import { NotificationItem } from "@/lib/api";
import {
  buildStudentUpcomingEvents,
  type StudentUpcomingEvent,
} from "@/forms/dashboard/dashboard-events";
import {
  notificationReferenceMeta,
  targetHrefForNotification,
} from "@/forms/notification/notification-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";

export { buildStudentUpcomingEvents, type StudentUpcomingEvent };

export function DashboardSectionPanel({
  icon,
  title,
  href,
  linkLabel,
  extra,
  children,
}: {
  icon: ReactNode;
  title: string;
  href: string;
  linkLabel: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
          <span className="shrink-0 text-primary">{icon}</span>
          <span className="truncate">{title}</span>
        </h2>
        <div className="flex shrink-0 items-center gap-3">
          {extra}
          <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
            {linkLabel} <ArrowRight size={12} />
          </Link>
        </div>
      </div>
      {children}
    </section>
  );
}

export function DashboardEmptyHint({ children }: { children: ReactNode }) {
  return <p className="py-5 text-center text-xs text-slate-500">{children}</p>;
}

export function DashboardLatestNotifications({
  notifications,
  loading,
  unreadCount,
  markAllReadPending,
  onMarkAllRead,
  onMarkOneRead,
}: {
  notifications: NotificationItem[];
  loading: boolean;
  unreadCount: number;
  markAllReadPending: boolean;
  onMarkAllRead: () => void;
  onMarkOneRead?: (id: string) => void;
}) {
  return (
    <section
      aria-label="Thông báo mới nhất"
      className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Bell size={15} />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Thông báo mới nhất</h2>
          {unreadCount > 0 ? (
            <Badge tone="primary">{unreadCount} chưa đọc</Badge>
          ) : !loading && notifications.length > 0 ? (
            <Badge tone="success">Đã đọc tất cả thông báo</Badge>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={markAllReadPending}
              onClick={onMarkAllRead}
              className="h-7 gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold"
            >
              <CheckCheck size={12} /> Đánh dấu đã đọc
            </Button>
          )}
          <Link
            href="/notifications"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Xem tất cả <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="mt-3 grid gap-2.5 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <DashboardEmptyHint>Bạn chưa có thông báo mới.</DashboardEmptyHint>
      ) : (
        <div className="mt-3 grid gap-2.5 md:grid-cols-2">
          {notifications.slice(0, 4).map((item) => {
            const meta = notificationReferenceMeta(item.referenceType);
            const target = targetHrefForNotification(item);
            return (
              <Link
                key={item.id}
                href={target?.href ?? "/notifications"}
                onClick={() => {
                  if (!item.read) onMarkOneRead?.(item.id);
                }}
                className={cn(
                  "flex min-w-0 items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                  item.read
                    ? "border-slate-200/80 bg-slate-50/40 hover:border-slate-300 hover:bg-slate-50"
                    : "border-primary/25 bg-rose-50/35 hover:border-primary/45 hover:bg-rose-50/60",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    item.read ? "bg-slate-300" : "bg-primary",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Badge tone={meta.tone} dot={false}>
                        {meta.label}
                      </Badge>
                      <p
                        className={cn(
                          "truncate text-xs",
                          item.read ? "font-medium text-slate-700" : "font-bold text-slate-900",
                        )}
                      >
                        {item.title}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10.5px] text-slate-400 tabular-nums">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11.5px] text-slate-500">{item.message}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
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

export function StudentDashboardSidebar({
  events,
  eventsLoading,
}: {
  events: StudentUpcomingEvent[];
  eventsLoading: boolean;
}) {
  return (
    <div className="min-w-0 space-y-5">
      <DashboardSectionPanel icon={<Calendar size={15} />} title="Sự kiện sắp tới" href="/events" linkLabel="Khám phá & CTV">
        {events.length === 0 ? (
          <DashboardEmptyHint>
            {eventsLoading ? "Đang tải…" : "Chưa có sự kiện nào sắp diễn ra."}
          </DashboardEmptyHint>
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href="/events"
                  className="flex min-w-0 gap-3 rounded-lg py-3 transition-colors hover:bg-slate-50/80"
                >
                  <DateTile iso={event.startTime} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-slate-900">
                      {event.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {event.clubName} ·{" "}
                      {new Date(event.startTime).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {event.location && (
                        <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-slate-500">
                          <MapPin size={11} className="shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </span>
                      )}
                      {event.mine && <Badge tone="success">Trong lịch của tôi</Badge>}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DashboardSectionPanel>
    </div>
  );
}
