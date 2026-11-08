"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Calendar,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  Clock,
  MapPin,
} from "lucide-react";
import { ClubMediaCatalog, clubSlugFromCode } from "@/lib/media";
import { ClubAvatar } from "@/components/shared/ClubMedia";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatDay } from "@/lib/utils";
import {
  ApplicationSummary,
  CalendarItem,
  ClubItem,
  Membership,
  NotificationItem,
  PublicEvent,
  TaskItem,
} from "@/types";

interface DashboardActivitySectionProps {
  activeFeedTab: "applications" | "tasks" | "clubs";
  setActiveFeedTab: (tab: "applications" | "tasks" | "clubs") => void;
  canReviewApps: boolean;
  relevantApps: ApplicationSummary[];
  tasksList: TaskItem[];
  myClubList: Membership[];
  allClubs: ClubItem[];
  mediaCatalog?: ClubMediaCatalog;
  upcomingPublicEvents: PublicEvent[];
  calendarEvents: CalendarItem[];
  unreadNotifCount: number;
  notifList: NotificationItem[];
  notificationsPending: boolean;
  markAllReadPending: boolean;
  onMarkAllRead: () => void;
}

export function DashboardActivitySection({
  activeFeedTab,
  setActiveFeedTab,
  canReviewApps,
  relevantApps,
  tasksList,
  myClubList,
  allClubs,
  mediaCatalog,
  upcomingPublicEvents,
  calendarEvents,
  unreadNotifCount,
  notifList,
  notificationsPending,
  markAllReadPending,
  onMarkAllRead,
}: DashboardActivitySectionProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
      <div className="flex min-w-0 flex-col rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-secondary/70 p-1">
            <button
              type="button"
              onClick={() => setActiveFeedTab("applications")}
              className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
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
              className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
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
              className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                activeFeedTab === "clubs"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Câu lạc bộ ({allClubs.length || myClubList.length})
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
                  : canReviewApps
                    ? "/management?tab=clubs"
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
                          <span className="truncate text-xs font-bold text-foreground">{app.clubName}</span>
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
                          {task.overdue && <StatusBadge status="OVERDUE" />}
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
            <div className="space-y-3">
              {myClubList.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">
                    Đang tham gia <strong className="text-foreground">{myClubList.length}</strong> câu lạc bộ trên tổng số{" "}
                    <strong className="text-foreground">{allClubs.length || myClubList.length}</strong> CLB toàn trường.
                  </span>
                  <div className="flex items-center gap-3">
                    <Link href="/memberships" className="font-semibold text-primary hover:underline">
                      CLB đang tham gia ({myClubList.length})
                    </Link>
                    {canReviewApps && (
                      <Link href="/management?tab=clubs" className="font-semibold text-primary hover:underline">
                        Quản lý toàn bộ CLB
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {(allClubs.length > 0 ? allClubs : myClubList).slice(0, 6).map((item) => {
                  const isMembershipItem = "clubId" in item;
                  const clubId = isMembershipItem ? item.clubId : item.id;
                  const clubName = isMembershipItem ? item.clubName : item.name;
                  const clubCode = isMembershipItem ? item.clubCode : item.code;
                  const logoUrl = isMembershipItem ? undefined : item.logoUrl;
                  const matchedMembership = isMembershipItem
                    ? item
                    : myClubList.find((m) => m.clubId === item.id || m.clubCode === item.code);
                  const media = mediaCatalog?.clubs[clubSlugFromCode(clubCode)];
                  const status = item.status;
                  const targetHref = canReviewApps
                    ? `/management?clubId=${clubId}&tab=overview`
                    : matchedMembership
                      ? "/memberships"
                      : `/clubs?clubId=${clubId}`;

                  return (
                    <Link
                      key={item.id}
                      href={targetHref}
                      className="flex min-w-0 flex-col justify-between rounded-xl border border-border bg-background/60 p-3.5 transition-colors hover:border-primary/40 hover:bg-card"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <ClubAvatar name={clubName} code={clubCode} logoUrl={logoUrl} fallbackUrl={media?.logo} size="sm" />
                            <Badge tone="primary">{clubCode}</Badge>
                            {matchedMembership && <Badge tone="neutral" dot={false}>Đã tham gia</Badge>}
                          </div>
                          <StatusBadge status={status} />
                        </div>
                        <p className="mt-2 truncate text-xs font-bold text-foreground">{clubName}</p>
                        {matchedMembership && matchedMembership.departments?.length > 0 ? (
                          <p className="mt-1 truncate text-[11px] text-muted-foreground">
                            Ban: {matchedMembership.departments.map((d) => d.name).join(", ")}
                          </p>
                        ) : !isMembershipItem && item.activityField ? (
                          <p className="mt-1 truncate text-[11px] text-muted-foreground">Lĩnh vực: {item.activityField}</p>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Calendar size={15} />
              </span>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Sự kiện & Lịch sinh hoạt</h2>
                <p className="text-[11px] text-muted-foreground">Hoạt động CLB sắp diễn ra</p>
              </div>
            </div>
            <Link href="/events" className="text-[11px] font-semibold text-primary hover:underline">Sự kiện & CTV</Link>
          </div>
          {upcomingPublicEvents.length === 0 && calendarEvents.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Chưa có sự kiện nào sắp diễn ra.</p>
          ) : (
            <div className="mt-3 divide-y divide-border">
              {(upcomingPublicEvents.length > 0 ? upcomingPublicEvents : calendarEvents).slice(0, 4).map((ev) => (
                <div key={ev.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-foreground">{ev.title}</p>
                    <StatusBadge status={ev.status} />
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-primary">{ev.clubName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> {formatDateTime(ev.startTime)}</span>
                    {ev.location && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {ev.location}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary"><Bell size={15} /></span>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Thông báo mới nhất</h2>
                <p className="text-[11px] text-muted-foreground">
                  {unreadNotifCount > 0 ? `${unreadNotifCount} thông báo chưa đọc` : "Đã đọc tất cả thông báo"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadNotifCount > 0 && (
                <Button size="sm" variant="outline" disabled={markAllReadPending} onClick={onMarkAllRead}>
                  <CheckCheck size={12} /> Đọc hết
                </Button>
              )}
              <Link href="/notifications" className="text-[11px] font-semibold text-primary hover:underline">Tất cả</Link>
            </div>
          </div>
          {notificationsPending ? (
            <div className="mt-3 space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : notifList.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Bạn chưa có thông báo mới.</p>
          ) : (
            <div className="mt-3 divide-y divide-border">
              {notifList.slice(0, 4).map((item) => (
                <Link href="/notifications" key={item.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0 hover:opacity-85">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read ? "bg-muted-foreground/35" : "bg-primary"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-foreground">{item.title}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">{formatDay(item.createdAt)}</span>
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
  );
}
