"use client";

import Image from "next/image";
import Link from "next/link";
import { BarChart3, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DashboardGuestPrompt() {
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

export function DashboardAnalyticsCards({
  publicClubsPending,
  totalClubsCount,
  sortedCategories,
  canReviewApps,
  relevantAppsCount,
  pendingAppsCount,
  approvedAppsCount,
  rejectedAppsCount,
}: {
  publicClubsPending: boolean;
  totalClubsCount: number;
  sortedCategories: [string, number][];
  canReviewApps: boolean;
  relevantAppsCount: number;
  pendingAppsCount: number;
  approvedAppsCount: number;
  rejectedAppsCount: number;
}) {
  const processedRate =
    relevantAppsCount > 0
      ? Math.round(((approvedAppsCount + rejectedAppsCount) / relevantAppsCount) * 100)
      : 0;

  return (
    <section className="grid gap-4 @3xl:grid-cols-2">
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
          <div className="mt-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-7 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : sortedCategories.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Chưa có dữ liệu lĩnh vực CLB.</p>
        ) : (
          <div className="mt-3 space-y-2.5">
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
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
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
            <span className="grid size-7 place-items-center rounded-lg bg-secondary text-secondary-foreground">
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

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Tỷ lệ xử lý hồ sơ</span>
            <span className="font-bold text-foreground tabular-nums">{processedRate}%</span>
          </div>

          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            {relevantAppsCount > 0 && (
              <>
                <div
                  className="bg-primary transition-all"
                  style={{ width: `${(approvedAppsCount / relevantAppsCount) * 100}%` }}
                  title={`Đã duyệt: ${approvedAppsCount}`}
                />
                <div
                  className="bg-slate-400 transition-all"
                  style={{ width: `${(pendingAppsCount / relevantAppsCount) * 100}%` }}
                  title={`Chờ duyệt: ${pendingAppsCount}`}
                />
                <div
                  className="bg-rose-300 transition-all"
                  style={{ width: `${(rejectedAppsCount / relevantAppsCount) * 100}%` }}
                  title={`Từ chối: ${rejectedAppsCount}`}
                />
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge tone="success">Đã duyệt: {approvedAppsCount}</Badge>
            <Badge tone="pending">Chờ duyệt: {pendingAppsCount}</Badge>
            <Badge tone="danger">Từ chối: {rejectedAppsCount}</Badge>
          </div>
        </div>
      </div>
    </section>
  );
}
