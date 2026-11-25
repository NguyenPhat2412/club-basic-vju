"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, CalendarRange, PieChart, TrendingUp } from "lucide-react";
import { apiModel, type Club, type TimelineEventItem } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type DonutSegment,
  SvgDonutChart,
  SvgGroupedColumnChart,
  type VerticalBarDatum,
} from "./DashboardSvgPrimitives";

function buildRecentMonths(count = 6) {
  const now = new Date();
  const months: Array<{ key: string; label: string }> = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}` });
  }
  return months;
}

function summarizeEventStatuses(events: TimelineEventItem[]): DonutSegment[] {
  const counts = { completed: 0, open: 0, closed: 0, other: 0 };
  for (const ev of events) {
    if (ev.status === "COMPLETED") counts.completed += 1;
    else if (ev.status === "OPEN_REGISTRATION") counts.open += 1;
    else if (ev.status === "CLOSED_REGISTRATION") counts.closed += 1;
    else counts.other += 1;
  }
  return [
    { key: "completed", label: "Đã hoàn thành", value: counts.completed, strokeClass: "stroke-primary", dotClass: "bg-primary" },
    { key: "open", label: "Đang mở ĐK", value: counts.open, strokeClass: "stroke-slate-800", dotClass: "bg-slate-800" },
    { key: "closed", label: "Đã đóng ĐK", value: counts.closed, strokeClass: "stroke-slate-400", dotClass: "bg-slate-400" },
    { key: "other", label: "Nháp / Huỷ", value: counts.other, strokeClass: "stroke-rose-300", dotClass: "bg-rose-300" },
  ];
}

export function DashboardChartsSection({
  canViewTimeline,
  primaryClub,
}: {
  canViewTimeline: boolean;
  primaryClub?: Club;
}) {
  const [barMode, setBarMode] = useState<"units" | "monthly">("units");
  const [donutMode, setDonutMode] = useState<"attendance" | "status">("attendance");

  const timelineQuery = useQuery({
    queryKey: qk.eventsTimeline("dashboard-charts"),
    queryFn: () => apiModel.eventsTimeline({}),
    enabled: canViewTimeline,
    staleTime: 60_000,
  });

  const clubStatsQuery = useQuery({
    queryKey: qk.clubStatistics(primaryClub?.id ?? "", "dashboard-charts"),
    queryFn: () => apiModel.clubStatistics(primaryClub!.id, {}),
    enabled: !canViewTimeline && Boolean(primaryClub?.id),
    staleTime: 60_000,
  });

  const units = useMemo(() => timelineQuery.data?.units ?? [], [timelineQuery.data?.units]);
  const allEvents = useMemo(() => units.flatMap((u) => u.events), [units]);

  const unitBarData = useMemo<VerticalBarDatum[]>(() => {
    if (canViewTimeline) {
      return [...units]
        .sort((a, b) => b.totalRegistrations - a.totalRegistrations || b.eventCount - a.eventCount)
        .slice(0, 10)
        .map((u) => ({
          key: u.clubId,
          label: u.clubCode,
          subLabel: `${u.clubCode} · ${u.clubName}`,
          primary: u.totalPresent,
          secondary: u.totalRegistrations,
          badgeText: `${Math.round(u.participationRate)}% tham gia (${u.eventCount} SK)`,
        }));
    }
    const depts = clubStatsQuery.data?.departmentBreakdown ?? [];
    return depts.slice(0, 8).map((dep) => ({
      key: dep.departmentId,
      label: dep.departmentName,
      subLabel: dep.departmentName,
      primary: dep.completedTasks,
      secondary: dep.openTasks + dep.completedTasks,
      badgeText: `${dep.activeMembers} TV`,
    }));
  }, [canViewTimeline, units, clubStatsQuery.data?.departmentBreakdown]);

  const monthlyBarData = useMemo<VerticalBarDatum[]>(() => {
    const months = buildRecentMonths(6);
    const map = new Map(months.map((m) => [m.key, { ...m, events: 0, present: 0, reg: 0 }]));
    for (const ev of allEvents) {
      const k = ev.startTime?.slice(0, 7);
      const bucket = k ? map.get(k) : undefined;
      if (bucket) {
        bucket.events += 1;
        bucket.present += ev.presentCount;
        bucket.reg += ev.registrationCount;
      }
    }
    return months.map((m) => {
      const b = map.get(m.key)!;
      return {
        key: m.key,
        label: m.label,
        subLabel: `Tháng ${m.label}`,
        primary: b.present,
        secondary: b.reg,
        badgeText: `${b.events} sự kiện`,
      };
    });
  }, [allEvents]);

  const totals = useMemo(() => {
    if (canViewTimeline) {
      const totalReg = units.reduce((s, u) => s + u.totalRegistrations, 0);
      const totalPresent = units.reduce((s, u) => s + u.totalPresent, 0);
      const rate = totalReg > 0 ? Math.round((totalPresent / totalReg) * 100) : 0;
      return {
        totalEvents: timelineQuery.data?.totalEvents ?? allEvents.length,
        totalUnits: timelineQuery.data?.totalUnits ?? units.length,
        totalReg,
        totalPresent,
        absent: Math.max(0, totalReg - totalPresent),
        rate,
      };
    }
    const cs = clubStatsQuery.data;
    const totalReg = cs?.activeRegistrations ?? 0;
    const totalPresent = cs?.attendedCount ?? 0;
    return {
      totalEvents: cs?.totalEvents ?? 0,
      totalUnits: cs?.activeDepartments ?? 0,
      totalReg,
      totalPresent,
      absent: Math.max(0, totalReg - totalPresent),
      rate: Math.round(cs?.attendanceRate ?? (totalReg > 0 ? (totalPresent / totalReg) * 100 : 0)),
    };
  }, [canViewTimeline, units, timelineQuery.data, allEvents.length, clubStatsQuery.data]);

  const statusSegments = useMemo<DonutSegment[]>(() => {
    if (canViewTimeline) return summarizeEventStatuses(allEvents);
    const cs = clubStatsQuery.data;
    return [
      { key: "completed", label: "Đã hoàn thành", value: cs?.completedEvents ?? 0, strokeClass: "stroke-primary", dotClass: "bg-primary" },
      { key: "open", label: "Đang mở ĐK", value: cs?.openEvents ?? 0, strokeClass: "stroke-slate-800", dotClass: "bg-slate-800" },
      { key: "closed", label: "Đã đóng ĐK", value: cs?.closedRegistrationEvents ?? 0, strokeClass: "stroke-slate-400", dotClass: "bg-slate-400" },
      { key: "other", label: "Nháp / Huỷ", value: (cs?.draftEvents ?? 0) + (cs?.cancelledEvents ?? 0), strokeClass: "stroke-rose-300", dotClass: "bg-rose-300" },
    ];
  }, [canViewTimeline, allEvents, clubStatsQuery.data]);

  const attendanceSegments = useMemo<DonutSegment[]>(
    () => [
      { key: "present", label: "Có mặt", value: totals.totalPresent, strokeClass: "stroke-primary", dotClass: "bg-primary" },
      { key: "absent", label: "Chưa điểm danh", value: totals.absent, strokeClass: "stroke-slate-300", dotClass: "bg-slate-300" },
    ],
    [totals.totalPresent, totals.absent],
  );

  const loading = canViewTimeline ? timelineQuery.isPending : clubStatsQuery.isPending;
  if (!canViewTimeline && !primaryClub) return null;

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* Left: Grouped Column Chart — Participation by Unit or 6-Month Trend */}
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5 xl:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              {barMode === "monthly" ? <TrendingUp size={15} /> : <BarChart3 size={15} />}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xs font-bold uppercase tracking-wider text-slate-900">
                {canViewTimeline
                  ? barMode === "units"
                    ? "Biểu đồ Mức độ tham gia theo 13 Đơn vị"
                    : "Xu hướng Tham gia Sự kiện 6 tháng gần nhất"
                  : `Biểu đồ Hiệu suất theo Ban · ${primaryClub?.code ?? ""}`}
              </h2>
              <p className="truncate text-[11px] text-slate-500">
                {canViewTimeline
                  ? `${totals.totalEvents} sự kiện · ${totals.totalPresent}/${totals.totalReg} lượt điểm danh thực tế (${totals.rate}%)`
                  : `So sánh công việc hoàn thành trên tổng việc từng ban chuyên môn`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {canViewTimeline && (
              <div className="inline-flex h-7 items-center rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Chế độ biểu đồ cột">
                <button
                  type="button"
                  onClick={() => setBarMode("units")}
                  className={cn(
                    "h-full rounded-md px-2 text-[11px] font-semibold transition-colors",
                    barMode === "units" ? "bg-white text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Theo CLB
                </button>
                <button
                  type="button"
                  onClick={() => setBarMode("monthly")}
                  className={cn(
                    "h-full rounded-md px-2 text-[11px] font-semibold transition-colors",
                    barMode === "monthly" ? "bg-white text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  6 tháng
                </button>
              </div>
            )}
            <Link
              href="/management?tab=events"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <CalendarRange size={12} /> GANTT <ArrowRight size={11} />
            </Link>
          </div>
        </div>

        <div className="mt-3">
          {loading ? (
            <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <SvgGroupedColumnChart
              data={canViewTimeline && barMode === "monthly" ? monthlyBarData : unitBarData}
              primaryLabel={canViewTimeline ? "Có mặt thực tế" : "Việc hoàn thành"}
              secondaryLabel={canViewTimeline ? "Lượt đăng ký" : "Tổng công việc"}
              emptyText="Chưa có dữ liệu sự kiện để vẽ biểu đồ."
            />
          )}
        </div>
      </div>

      {/* Right: Interactive Donut Chart — Participation Rate & Event Status Breakdown */}
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5 xl:col-span-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <PieChart size={15} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xs font-bold uppercase tracking-wider text-slate-900">
                {donutMode === "attendance" ? "Tỷ lệ Điểm danh Sự kiện" : "Cơ cấu Trạng thái Sự kiện"}
              </h2>
              <p className="truncate text-[11px] text-slate-500">
                {canViewTimeline ? `Tổng hợp toàn trường (${totals.totalUnits} đơn vị)` : primaryClub?.name}
              </p>
            </div>
          </div>

          <div className="inline-flex h-7 items-center rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Chế độ biểu đồ tròn">
            <button
              type="button"
              onClick={() => setDonutMode("attendance")}
              className={cn(
                "h-full rounded-md px-2 text-[11px] font-semibold transition-colors",
                donutMode === "attendance" ? "bg-white text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Tham gia
            </button>
            <button
              type="button"
              onClick={() => setDonutMode("status")}
              className={cn(
                "h-full rounded-md px-2 text-[11px] font-semibold transition-colors",
                donutMode === "status" ? "bg-white text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Trạng thái
            </button>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="h-44 animate-pulse rounded-lg bg-slate-100" />
          ) : donutMode === "attendance" ? (
            <div className="space-y-3">
              <SvgDonutChart
                segments={attendanceSegments}
                centerValue={`${totals.rate}%`}
                centerLabel="Tỷ lệ có mặt"
                size={136}
                strokeWidth={20}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-muted-foreground">
                <span>Tổng lượt đăng ký: <strong className="font-mono text-foreground">{totals.totalReg}</strong></span>
                <Badge tone="primary" dot={false}>{totals.totalEvents} sự kiện</Badge>
              </div>
            </div>
          ) : (
            <SvgDonutChart
              segments={statusSegments}
              centerValue={totals.totalEvents}
              centerLabel="Tổng sự kiện"
              size={136}
              strokeWidth={20}
            />
          )}
        </div>
      </div>
    </section>
  );
}
