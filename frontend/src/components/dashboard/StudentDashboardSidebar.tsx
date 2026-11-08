"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ArrowRight, Bell, Calendar, MapPin } from "lucide-react";
import { NotificationItem } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export interface StudentUpcomingEvent {
  id: string;
  title: string;
  clubName: string;
  location?: string;
  startTime: string;
  mine: boolean;
}

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

export function StudentDashboardSidebar({
  events,
  eventsLoading,
  notifications,
  notificationsLoading,
  unreadCount,
  markAllReadPending,
  onMarkAllRead,
}: {
  events: StudentUpcomingEvent[];
  eventsLoading: boolean;
  notifications: NotificationItem[];
  notificationsLoading: boolean;
  unreadCount: number;
  markAllReadPending: boolean;
  onMarkAllRead: () => void;
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
              <li key={event.id} className="flex min-w-0 gap-3 py-3">
                <DateTile iso={event.startTime} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-slate-900">{event.title}</p>
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
                    {event.mine && <Badge tone="primary">Trong lịch của tôi</Badge>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardSectionPanel>

      <DashboardSectionPanel
        icon={<Bell size={15} />}
        title={unreadCount ? `Thông báo (${unreadCount} chưa đọc)` : "Thông báo"}
        href="/notifications"
        linkLabel="Tất cả"
        extra={
          unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={markAllReadPending}
              className="text-[11px] font-semibold text-slate-500 hover:text-primary disabled:opacity-50"
            >
              Đánh dấu đã đọc
            </button>
          )
        }
      >
        {notifications.length === 0 ? (
          <DashboardEmptyHint>{notificationsLoading ? "Đang tải…" : "Bạn chưa có thông báo nào."}</DashboardEmptyHint>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id} className="flex min-w-0 gap-2.5 py-3">
                <span
                  className={`mt-1.5 size-1.5 shrink-0 rounded-full ${n.read ? "bg-slate-200" : "bg-primary"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm ${n.read ? "text-slate-600" : "font-semibold text-slate-900"}`}>
                    {n.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 break-words text-xs text-slate-500">{n.message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(n.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardSectionPanel>
    </div>
  );
}
