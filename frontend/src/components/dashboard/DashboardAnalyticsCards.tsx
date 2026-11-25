"use client";

import Image from "next/image";
import Link from "next/link";
import { BarChart3, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type DonutSegment, SvgDonutChart } from "./DashboardSvgPrimitives";

const CATEGORY_PALETTE = [
  { strokeClass: "stroke-primary", dotClass: "bg-primary" },
  { strokeClass: "stroke-slate-800", dotClass: "bg-slate-800" },
  { strokeClass: "stroke-slate-500", dotClass: "bg-slate-500" },
  { strokeClass: "stroke-rose-400", dotClass: "bg-rose-400" },
  { strokeClass: "stroke-slate-300", dotClass: "bg-slate-300" },
];

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

  const topCategories = sortedCategories.slice(0, 4);
  const otherCategoryCount = sortedCategories.slice(4).reduce((sum, [, n]) => sum + n, 0);
  const categorySegments: DonutSegment[] = [
    ...topCategories.map(([cat, count], idx) => ({
      key: cat,
      label: cat,
      value: count,
      strokeClass: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length].strokeClass,
      dotClass: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length].dotClass,
    })),
    ...(otherCategoryCount > 0
      ? [{ key: "__other__", label: "Lĩnh vực khác", value: otherCategoryCount, strokeClass: "stroke-slate-300", dotClass: "bg-slate-300" }]
      : []),
  ];

  const appSegments: DonutSegment[] = [
    { key: "approved", label: "Đã duyệt", value: approvedAppsCount, strokeClass: "stroke-primary", dotClass: "bg-primary" },
    { key: "pending", label: "Chờ duyệt", value: pendingAppsCount, strokeClass: "stroke-slate-500", dotClass: "bg-slate-500" },
    { key: "rejected", label: "Từ chối", value: rejectedAppsCount, strokeClass: "stroke-rose-300", dotClass: "bg-rose-300" },
  ];

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
                Biểu đồ Phân bổ CLB theo lĩnh vực
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Tổng số {totalClubsCount} câu lạc bộ · {sortedCategories.length} lĩnh vực
              </p>
            </div>
          </div>
          <Link href="/clubs" className="text-[11px] font-semibold text-primary hover:underline">
            Xem tất cả
          </Link>
        </div>

        {publicClubsPending ? (
          <div className="mt-4 h-40 animate-pulse rounded-lg bg-muted" />
        ) : sortedCategories.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Chưa có dữ liệu lĩnh vực CLB.</p>
        ) : (
          <div className="mt-4">
            <SvgDonutChart
              segments={categorySegments}
              centerValue={totalClubsCount}
              centerLabel="Tổng CLB"
              size={142}
              strokeWidth={20}
            />
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
                {canReviewApps ? "Biểu đồ Duyệt đơn Tuyển quân" : "Trạng thái Đơn đăng ký"}
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
          <SvgDonutChart
            segments={appSegments}
            centerValue={`${processedRate}%`}
            centerLabel="Đã xử lý"
            size={142}
            strokeWidth={20}
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5">
            <Badge tone="success">Đã duyệt: {approvedAppsCount}</Badge>
            <Badge tone="pending">Chờ duyệt: {pendingAppsCount}</Badge>
            <Badge tone="danger">Từ chối: {rejectedAppsCount}</Badge>
          </div>
        </div>
      </div>
    </section>
  );
}
