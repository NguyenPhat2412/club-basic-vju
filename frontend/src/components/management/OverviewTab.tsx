"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCheck,
  ClipboardCheck,
  FileArchive,
  FilterX,
  UserCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { apiModel, Club } from "@/lib/api";
import {
  formatBytesCompact,
  normalizeClubOverviewConfig,
} from "@/forms/club/club-overview-config";
import { ClubOverviewShowcase } from "@/components/club/ClubOverviewShowcase";
import { OverviewDepartmentPanel } from "@/components/management/OverviewDepartmentPanel";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";

function toStartIso(dateStr: string) {
  if (!dateStr) return undefined;
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

function toEndIso(dateStr: string) {
  if (!dateStr) return undefined;
  return new Date(`${dateStr}T23:59:59`).toISOString();
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
  onOpenCustomize,
}: {
  clubId: string;
  club?: Club;
  canCustomize?: boolean;
  onOpenCustomize?: () => void;
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const isValidRange = !fromDate || !toDate || fromDate <= toDate;

  const stats = useQuery({
    queryKey: ["club-statistics", clubId, fromDate, toDate],
    queryFn: () =>
      apiModel.clubStatistics(clubId, {
        from: toStartIso(fromDate),
        to: toEndIso(toDate),
      }),
    enabled: !!clubId && isValidRange,
  });

  if (stats.isPending) return <LoadingRows rows={4} />;
  if (stats.isError) return <ErrorState message={describeError(stats.error)} onRetry={() => stats.refetch()} />;
  if (!stats.data) return <EmptyState icon={<BarChart3 />} title="Chưa có dữ liệu thống kê câu lạc bộ" />;

  const d = stats.data;
  const cfg = normalizeClubOverviewConfig(club?.overviewConfig);
  const showDepartmentsBlock = cfg.enabledBlocks.includes("departments");

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6">
      {club && (
        <ClubOverviewShowcase
          club={club}
          variant="workspace"
          canCustomize={canCustomize}
          onCustomize={onOpenCustomize}
        />
      )}

      {/* Snapshot Section: Current Club Scale & Assets */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Nhân sự đang hoạt động"
          value={d.activeMembers}
          sub={`${d.suspendedMembers ?? 0} tạm đình chỉ · ${d.leftMembers ?? 0} đã rời CLB`}
          icon={<Users size={16} />}
        />
        <MetricCard
          label="Ban chuyên môn mở"
          value={d.activeDepartments}
          sub={`${(d.departmentBreakdown ?? []).length} ban trong cơ cấu tổ chức`}
          icon={<UsersRound size={16} />}
        />
        <MetricCard
          label="Hồ sơ chờ xét duyệt"
          value={d.pendingApplications}
          sub="Đơn trạng thái PENDING cần xử lý ngay"
          icon={<BarChart3 size={16} />}
        />
        <MetricCard
          label="Kho tài liệu & Kênh Chat"
          value={d.liveDocuments ?? 0}
          sub={`${formatBytesCompact(d.totalDocumentBytes)} lưu trữ · ${d.chatChannels ?? 0} kênh trao đổi`}
          icon={<FileArchive size={16} />}
        />
      </div>

      {showDepartmentsBlock && (
        <OverviewDepartmentPanel
          departments={d.departmentBreakdown ?? []}
          totalActiveMembers={d.activeMembers}
        />
      )}

      {/* Filter Bar for Period Operational Metrics */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-foreground">
              Thống kê Hiệu suất Vận hành theo Kỳ
            </h2>
            <Badge tone="primary" dot={false}>
              {d.clubCode}
            </Badge>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {fromDate || toDate ? `${fromDate || "Đầu kỳ"} → ${toDate || "Hiện tại"}` : "Toàn thời gian"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Truy vấn trực tiếp lúc {formatDateTime(d.generatedAt)}. Tách bạch chuẩn xác sự kiện chính thức với bản nháp (DRAFT), thành viên với CTV và đủ 6 trạng thái nhiệm vụ.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFromDate(daysAgoYmd(30));
                setToDate(daysAgoYmd(0));
              }}
              className="h-9 text-xs"
            >
              30 ngày
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFromDate(daysAgoYmd(120));
                setToDate(daysAgoYmd(0));
              }}
              className="h-9 text-xs"
            >
              Học kỳ
            </Button>
          </div>
          <div className="flex-1 sm:flex-initial">
            <FormField label="Từ ngày" hideIndicator>
              <Input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 w-full text-xs sm:w-36"
              />
            </FormField>
          </div>
          <div className="flex-1 sm:flex-initial">
            <FormField label="Đến ngày" hideIndicator>
              <Input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 w-full text-xs sm:w-36"
              />
            </FormField>
          </div>
          {(fromDate || toDate) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="h-9"
            >
              <FilterX size={14} /> Toàn bộ
            </Button>
          )}
        </div>
      </div>

      {/* Period Operational Funnels (2x2 Grid) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <UserCheck size={15} />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Phễu Tuyển thành viên CLB
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Tổng hợp toàn bộ đơn nộp, duyệt, từ chối và rút đơn trong kỳ
                </p>
              </div>
            </div>
            <Badge tone="neutral" className="border-emerald-200 bg-emerald-50 text-emerald-800" dot={false}>
              Tỷ lệ duyệt: {d.approvalRate ?? 0}%
            </Badge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <MiniStat label="Tổng đơn nộp" value={d.applicationsSubmitted ?? 0} />
            <MiniStat label="Chờ duyệt" value={d.periodPendingApplications ?? 0} tone="amber" />
            <MiniStat label="Đã trúng tuyển" value={d.approvedApplications ?? 0} tone="emerald" />
            <MiniStat label="Từ chối" value={d.rejectedApplications ?? 0} tone="rose" />
            <MiniStat label="Ứng viên rút" value={d.cancelledApplications ?? 0} tone="muted" />
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <Calendar size={15} />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Thống kê Sự kiện Chính thức
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Tổng công bố = Đang mở + Đã đóng ĐK + Hoàn thành + Đã huỷ (tách riêng DRAFT)
                </p>
              </div>
            </div>
            <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
              Nháp (DRAFT): {d.draftEvents ?? 0}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <MiniStat label="Sự kiện công bố" value={d.totalEvents} />
            <MiniStat label="Đang mở ĐK" value={d.openEvents} tone="primary" />
            <MiniStat label="Đã đóng ĐK" value={d.closedRegistrationEvents ?? 0} tone="amber" />
            <MiniStat label="Đã hoàn thành" value={d.completedEvents} tone="emerald" />
            <MiniStat label="Đã huỷ" value={d.cancelledEvents} tone="muted" />
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <CheckCheck size={15} />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Đăng ký & Điểm danh (Thành viên vs CTV)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Tách bạch rõ Thành viên CLB với Cộng tác viên (CTV) sự kiện mở
                </p>
              </div>
            </div>
            <Badge tone="neutral" className="border-emerald-200 bg-emerald-50 text-emerald-800" dot={false}>
              Có mặt: {d.attendanceRate ?? 0}%
            </Badge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <MiniStat label="Người duy nhất" value={d.uniqueParticipants} tone="primary" />
            <MiniStat
              label="ĐK hiệu lực"
              value={d.activeRegistrations}
              sub={`${d.memberRegistrations ?? 0} TV · ${d.ctvRegistrations ?? 0} CTV`}
            />
            <MiniStat
              label="Thực tế có mặt"
              value={d.attendedCount}
              tone="emerald"
              sub={`${d.memberAttended ?? 0} TV · ${d.ctvAttended ?? 0} CTV`}
            />
            <MiniStat label="Vắng / Có phép" value={d.absentOrExcusedCount} tone="amber" />
            <MiniStat label="Đã huỷ ĐK" value={d.cancelledRegistrations} tone="muted" />
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <ClipboardCheck size={15} />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Phễu Nhiệm vụ Nội bộ (6 Trạng thái)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Đang mở ({d.openTasks}) bao gồm cả việc chờ nghiệm thu (DONE) và quá hạn
                </p>
              </div>
            </div>
            <Badge tone="primary" dot={false}>
              Nghiệm thu: {d.taskCompletionRate ?? 0}%
            </Badge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
            <MiniStat label="Cần làm (TODO)" value={d.todoTasks ?? 0} />
            <MiniStat label="Đang thực hiện" value={d.inProgressTasks ?? 0} tone="primary" />
            <MiniStat label="Chờ nghiệm thu" value={d.reviewPendingTasks ?? 0} tone="amber" />
            <div className="rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-2.5">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[11px] font-semibold text-rose-800">Quá hạn</p>
                <AlertTriangle size={13} className="shrink-0 text-rose-600" />
              </div>
              <p className="mt-1 font-mono text-xl font-extrabold tabular-nums text-rose-700">
                {d.overdueTasks}
              </p>
            </div>
            <MiniStat label="Đã nghiệm thu" value={d.completedTasks} tone="emerald" />
            <MiniStat label="Đã huỷ" value={d.cancelledTasks ?? 0} tone="muted" />
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon }: { label: string; value: number; sub: string; icon: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-2xs">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-foreground">{value}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>
      </div>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
    </div>
  );
}

const MINI_TONES = {
  default: "text-foreground",
  primary: "text-primary",
  emerald: "text-emerald-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
  muted: "text-muted-foreground",
} as const;

function MiniStat({ label, value, sub, tone = "default" }: { label: string; value: number; sub?: string; tone?: keyof typeof MINI_TONES }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-background/60 px-3 py-2.5">
      <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-xl font-extrabold tabular-nums ${MINI_TONES[tone]}`}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground">{sub}</p>}
    </div>
  );
}
