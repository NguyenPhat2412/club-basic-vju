"use client";

import Link from "next/link";
import { Activity, ArrowRight, BarChart3, ClipboardList } from "lucide-react";

export function DashboardAnalyticsCards({
  publicClubsPending,
  totalClubsCount,
  sortedCategories,
  canReviewApps,
  relevantAppsCount,
  pendingAppsCount,
  approvedAppsCount,
  rejectedAppsCount,
  myAppsCount,
  visibleManagedClubsCount,
  avgTaskProgress,
  inProgressTasksCount,
  completedTasksCount,
  totalUpcomingEvents,
}: {
  publicClubsPending: boolean;
  totalClubsCount: number;
  sortedCategories: [string, number][];
  canReviewApps: boolean;
  relevantAppsCount: number;
  pendingAppsCount: number;
  approvedAppsCount: number;
  rejectedAppsCount: number;
  myAppsCount: number;
  visibleManagedClubsCount: number;
  avgTaskProgress: number;
  inProgressTasksCount: number;
  completedTasksCount: number;
  totalUpcomingEvents: number;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
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

        {publicClubsPending ? (
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

      <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
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
                Tổng cộng {relevantAppsCount} hồ sơ ứng tuyển
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
              {relevantAppsCount > 0
                ? Math.round(((approvedAppsCount + rejectedAppsCount) / relevantAppsCount) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            {relevantAppsCount > 0 && (
              <>
                <div
                  className="bg-emerald-500 transition-all"
                  style={{ width: `${(approvedAppsCount / relevantAppsCount) * 100}%` }}
                  title={`Đã duyệt: ${approvedAppsCount}`}
                />
                <div
                  className="bg-amber-500 transition-all"
                  style={{ width: `${(pendingAppsCount / relevantAppsCount) * 100}%` }}
                  title={`Chờ duyệt: ${pendingAppsCount}`}
                />
                <div
                  className="bg-rose-500 transition-all"
                  style={{ width: `${(rejectedAppsCount / relevantAppsCount) * 100}%` }}
                  title={`Từ chối: ${rejectedAppsCount}`}
                />
              </>
            )}
          </div>
          <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
            <span>Đơn của cá nhân bạn: {myAppsCount}</span>
            {canReviewApps && <span>CLB quản lý: {visibleManagedClubsCount} CLB</span>}
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Activity size={15} />
            </span>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Tiến độ Công việc cá nhân
              </h2>
              <p className="text-[11px] text-muted-foreground">Hoàn thành trung bình {avgTaskProgress}%</p>
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
  );
}
