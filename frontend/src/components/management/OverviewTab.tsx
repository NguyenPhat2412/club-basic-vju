"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCheck,
  ClipboardCheck,
  FilterX,
  SlidersHorizontal,
  UserCheck,
  Users,
} from "lucide-react";
import { apiModel, Club } from "@/lib/api";
import { formatBytesCompact, normalizeClubOverviewConfig } from "@/forms/club/club-overview-config";
import { SvgDonutChart, type DonutSegment } from "@/components/dashboard/DashboardSvgPrimitives";
import { ClubCertificatesOverviewSection } from "@/components/management/ClubCertificatesOverviewSection";
import { ClubFacebookInsightsCard } from "@/components/management/ClubFacebookInsightsCard";
import { OverviewDepartmentPanel } from "@/components/management/OverviewDepartmentPanel";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function toStartIso(dateStr: string) {
  return dateStr ? new Date(`${dateStr}T00:00:00`).toISOString() : undefined;
}

function toEndIso(dateStr: string) {
  return dateStr ? new Date(`${dateStr}T23:59:59`).toISOString() : undefined;
}

function daysAgoYmd(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function OverviewTab({
  clubId,
  club,
  canCustomize = false,
  canManageFacebook,
  onOpenCustomize,
  onOpenFacebookSettings,
}: {
  clubId: string;
  club?: Club;
  canCustomize?: boolean;
  canManageFacebook?: boolean;
  onOpenCustomize?: () => void;
  onOpenFacebookSettings?: () => void;
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [presetKey, setPresetKey] = useState<"all" | "30d" | "term" | "custom">("all");

  const isValidRange = !fromDate || !toDate || fromDate <= toDate;

  const stats = useQuery({
    queryKey: qk.clubStatistics(clubId, fromDate, toDate),
    queryFn: () =>
      apiModel.clubStatistics(clubId, {
        from: toStartIso(fromDate),
        to: toEndIso(toDate),
      }),
    enabled: !!clubId && isValidRange,
  });

  const selectAll = () => {
    setFromDate("");
    setToDate("");
    setPresetKey("all");
  };
  const selectRange = (days: number, key: "30d" | "term") => {
    setFromDate(daysAgoYmd(days));
    setToDate(daysAgoYmd(0));
    setPresetKey(key);
  };

  if (stats.isPending) return <LoadingRows rows={4} />;
  if (stats.isError) return <ErrorState message={describeError(stats.error)} onRetry={() => stats.refetch()} />;
  if (!stats.data) return <EmptyState icon={<BarChart3 />} title="Chưa có dữ liệu thống kê câu lạc bộ" />;

  const d = stats.data;
  const cfg = normalizeClubOverviewConfig(club?.overviewConfig);
  const showDepartmentsBlock = cfg.enabledBlocks.includes("departments");

  const attendanceSegments: DonutSegment[] = [
    { key: "member", label: "Có mặt (TV)", value: d.memberAttended ?? 0, strokeClass: "stroke-primary", dotClass: "bg-primary" },
    { key: "ctv", label: "Có mặt (CTV)", value: d.ctvAttended ?? 0, strokeClass: "stroke-slate-800", dotClass: "bg-slate-800" },
    { key: "absent", label: "Vắng / Có phép", value: d.absentOrExcusedCount ?? 0, strokeClass: "stroke-slate-400", dotClass: "bg-slate-400" },
    { key: "cancelled", label: "Đã huỷ ĐK", value: d.cancelledRegistrations ?? 0, strokeClass: "stroke-rose-300", dotClass: "bg-rose-300" },
  ];

  const taskSegments: DonutSegment[] = [
    { key: "done", label: "Đã nghiệm thu", value: d.completedTasks ?? 0, strokeClass: "stroke-primary", dotClass: "bg-primary" },
    { key: "progress", label: "Đang làm", value: d.inProgressTasks ?? 0, strokeClass: "stroke-slate-800", dotClass: "bg-slate-800" },
    { key: "review", label: "Chờ duyệt", value: d.reviewPendingTasks ?? 0, strokeClass: "stroke-slate-500", dotClass: "bg-slate-500" },
    { key: "todo", label: "Cần làm", value: d.todoTasks ?? 0, strokeClass: "stroke-slate-300", dotClass: "bg-slate-300" },
    { key: "overdue", label: "Quá hạn", value: d.overdueTasks ?? 0, strokeClass: "stroke-rose-400", dotClass: "bg-rose-400" },
  ];

  const recruitmentSegments: DonutSegment[] = [
    { key: "approved", label: "Trúng tuyển", value: d.approvedApplications ?? 0, strokeClass: "stroke-primary", dotClass: "bg-primary" },
    { key: "pending", label: "Chờ duyệt", value: d.periodPendingApplications ?? 0, strokeClass: "stroke-slate-500", dotClass: "bg-slate-500" },
    { key: "rejected", label: "Từ chối", value: d.rejectedApplications ?? 0, strokeClass: "stroke-rose-300", dotClass: "bg-rose-300" },
    { key: "withdrawn", label: "Ứng viên rút", value: d.cancelledApplications ?? 0, strokeClass: "stroke-slate-300", dotClass: "bg-slate-300" },
  ];

  const eventSegments: DonutSegment[] = [
    { key: "completed", label: "Hoàn thành", value: d.completedEvents ?? 0, strokeClass: "stroke-primary", dotClass: "bg-primary" },
    { key: "open", label: "Đang mở ĐK", value: d.openEvents ?? 0, strokeClass: "stroke-slate-800", dotClass: "bg-slate-800" },
    { key: "closed", label: "Đã đóng ĐK", value: d.closedRegistrationEvents ?? 0, strokeClass: "stroke-slate-400", dotClass: "bg-slate-400" },
    { key: "other", label: "Nháp / Huỷ", value: (d.draftEvents ?? 0) + (d.cancelledEvents ?? 0), strokeClass: "stroke-rose-300", dotClass: "bg-rose-300" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      {/* Unified 1-row white top toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border bg-white px-3 py-1.5 sm:px-4">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:w-auto sm:flex-1">
          <Badge tone="primary" dot={false}>{d.clubCode}</Badge>
          <div className="inline-flex h-8 items-center rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Kỳ thống kê">
            {(
              [
                { key: "all", label: "Toàn bộ", onClick: selectAll },
                { key: "30d", label: "30 ngày", onClick: () => selectRange(30, "30d") },
                { key: "term", label: "Học kỳ", onClick: () => selectRange(120, "term") },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={opt.onClick}
                className={cn(
                  "h-full rounded-md px-2.5 text-xs font-semibold transition-colors",
                  presetKey === opt.key ? "bg-white text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex w-full items-center gap-1.5 sm:w-auto">
            <Input
              type="date"
              aria-label="Từ ngày"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPresetKey("custom");
              }}
              className="h-8 min-w-0 flex-1 text-xs sm:w-[126px] sm:flex-none"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              type="date"
              aria-label="Đến ngày"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => {
                setToDate(e.target.value);
                setPresetKey("custom");
              }}
              className="h-8 min-w-0 flex-1 text-xs sm:w-[126px] sm:flex-none"
            />
          </div>
          {(fromDate || toDate) && (
            <Button size="sm" variant="outline" onClick={selectAll} className="h-8">
              <FilterX size={13} /> Xoá lọc
            </Button>
          )}
        </div>

        <div className="flex w-full max-w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:shrink-0">
          {canCustomize && onOpenCustomize && (
            <Button size="sm" variant="outline" onClick={onOpenCustomize} className="h-8 text-xs">
              <SlidersHorizontal size={13} /> Tùy biến giới thiệu
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4 px-3 py-3 sm:px-5 sm:py-4">
        {/* 4 Concise Top KPI Cards */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard
            label="Thành viên hoạt động"
            value={d.activeMembers}
            sub={`${d.activeDepartments} ban · ${d.liveDocuments ?? 0} tài liệu (${formatBytesCompact(d.totalDocumentBytes)})`}
            icon={<Users size={15} />}
          />
          <MetricCard
            label="Tỷ lệ điểm danh"
            value={`${d.attendanceRate ?? 0}%`}
            sub={`${d.attendedCount}/${d.activeRegistrations} lượt · ${d.uniqueParticipants} người`}
            icon={<CheckCheck size={15} />}
          />
          <MetricCard
            label="Tỷ lệ duyệt đơn"
            value={`${d.approvalRate ?? 0}%`}
            sub={`${d.pendingApplications} chờ duyệt · ${d.applicationsSubmitted ?? 0} tổng đơn`}
            icon={<UserCheck size={15} />}
          />
          <MetricCard
            label="Nghiệm thu công việc"
            value={`${d.taskCompletionRate ?? 0}%`}
            sub={`${d.completedTasks} xong · ${d.overdueTasks} quá hạn`}
            icon={<ClipboardCheck size={15} />}
          />
        </div>

        {/* 2x2 Visual Donut Charts Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            icon={<CheckCheck size={15} />}
            title="Đăng ký & Điểm danh"
            badge={<Badge tone="primary" dot={false}>{d.uniqueParticipants} người tham gia</Badge>}
          >
            <SvgDonutChart
              segments={attendanceSegments}
              centerValue={`${d.attendanceRate ?? 0}%`}
              centerLabel="Có mặt"
              size={134}
              strokeWidth={19}
            />
          </ChartCard>

          <ChartCard
            icon={<ClipboardCheck size={15} />}
            title="Tiến độ Nhiệm vụ nội bộ"
            badge={
              d.overdueTasks > 0 ? (
                <Badge tone="danger" dot={false}>
                  <AlertTriangle size={11} /> {d.overdueTasks} quá hạn
                </Badge>
              ) : (
                <Badge tone="primary" dot={false}>Nghiệm thu {d.taskCompletionRate ?? 0}%</Badge>
              )
            }
          >
            <SvgDonutChart
              segments={taskSegments}
              centerValue={`${d.taskCompletionRate ?? 0}%`}
              centerLabel="Nghiệm thu"
              size={134}
              strokeWidth={19}
            />
          </ChartCard>

          <ChartCard
            icon={<UserCheck size={15} />}
            title="Phễu Tuyển thành viên"
            badge={<Badge tone="primary" dot={false}>{d.applicationsSubmitted ?? 0} hồ sơ</Badge>}
          >
            <SvgDonutChart
              segments={recruitmentSegments}
              centerValue={`${d.approvalRate ?? 0}%`}
              centerLabel="Tỷ lệ duyệt"
              size={134}
              strokeWidth={19}
            />
          </ChartCard>

          <ChartCard
            icon={<Calendar size={15} />}
            title="Cơ cấu Sự kiện CLB"
            badge={<Badge tone="neutral" dot={false}>Nháp: {d.draftEvents ?? 0}</Badge>}
          >
            <SvgDonutChart
              segments={eventSegments}
              centerValue={d.totalEvents}
              centerLabel="Sự kiện"
              size={134}
              strokeWidth={19}
            />
          </ChartCard>
        </div>

        {/* Certificate Summary Card (links to full /management?tab=certificates page) */}
        <ClubCertificatesOverviewSection clubId={clubId} mode="summary" />

        {/* Department Chart + Compact Table */}
        {showDepartmentsBlock && (
          <OverviewDepartmentPanel
            departments={d.departmentBreakdown ?? []}
            totalActiveMembers={d.activeMembers}
          />
        )}

        <ClubFacebookInsightsCard
          clubId={clubId}
          canManage={canManageFacebook ?? canCustomize}
          onOpenSettings={onOpenFacebookSettings ?? onOpenCustomize}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon }: { label: string; value: number | string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 shadow-2xs">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-mono text-xl font-extrabold tabular-nums text-foreground sm:text-2xl">{value}</p>
        <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{sub}</p>
      </div>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
    </div>
  );
}

function ChartCard({
  icon,
  title,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h3>
        </div>
        {badge}
      </div>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}
