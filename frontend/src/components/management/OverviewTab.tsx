"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCheck,
  ClipboardCheck,
  FilterX,
  Users,
  UsersRound,
} from "lucide-react";
import { apiModel } from "@/lib/api";
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

export function OverviewTab({ clubId }: { clubId: string }) {
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

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground">Báo cáo tổng hợp hoạt động CLB</h2>
            <Badge tone="primary" dot={false}>
              {d.clubCode}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Số liệu truy vấn trực tiếp từ hệ thống vận hành lúc {formatDateTime(d.generatedAt)}. Tách bạch rõ người tham gia duy nhất, lượt đăng ký và lượt có mặt thực tế.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          <div className="flex-1 sm:flex-initial">
            <FormField label="Từ ngày">
              <Input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 w-full text-xs sm:w-40"
              />
            </FormField>
          </div>
          <div className="flex-1 sm:flex-initial">
            <FormField label="Đến ngày">
              <Input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 w-full text-xs sm:w-40"
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
            >
              <FilterX size={14} /> Xoá lọc ngày
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Thành viên đang hoạt động"
          value={d.activeMembers}
          sub="Trạng thái ACTIVE hiện tại"
          icon={<Users size={16} />}
        />
        <MetricCard
          label="Ban chuyên môn hoạt động"
          value={d.activeDepartments}
          sub="Cơ cấu nội bộ đang mở"
          icon={<UsersRound size={16} />}
        />
        <MetricCard
          label="Hồ sơ chờ xét duyệt"
          value={d.pendingApplications}
          sub="Đơn ứng tuyển trạng thái PENDING"
          icon={<BarChart3 size={16} />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 border-b border-border pb-2.5">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <Calendar size={15} />
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Thống kê Sự kiện CLB</h3>
              <p className="text-[11px] text-muted-foreground">Không bao gồm bản nháp nội bộ (DRAFT)</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Tổng sự kiện" value={d.totalEvents} />
            <MiniStat label="Đang mở ĐK" value={d.openEvents} tone="primary" />
            <MiniStat label="Đã hoàn thành" value={d.completedEvents} tone="emerald" />
            <MiniStat label="Đã huỷ" value={d.cancelledEvents} tone="muted" />
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 border-b border-border pb-2.5">
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <CheckCheck size={15} />
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Mức độ tham gia & Điểm danh (Member + CTV)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Phân biệt rõ số người duy nhất với tổng lượt đăng ký và lượt có mặt thực tế
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <MiniStat label="Người duy nhất" value={d.uniqueParticipants} tone="primary" />
            <MiniStat label="Lượt ĐK hiệu lực" value={d.activeRegistrations} />
            <MiniStat label="Lượt đã huỷ" value={d.cancelledRegistrations} tone="muted" />
            <MiniStat label="Thực tế có mặt" value={d.attendedCount} tone="emerald" />
            <MiniStat label="Vắng / Có phép" value={d.absentOrExcusedCount} tone="amber" />
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 border-b border-border pb-2.5">
          <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <ClipboardCheck size={15} />
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Thực thi Nhiệm vụ CLB</h3>
            <p className="text-[11px] text-muted-foreground">
              Theo dõi khối lượng công việc đang mở, quá hạn và đã nghiệm thu hoàn thành
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MiniStat label="Công việc đang mở (TODO / Đang làm / Chờ duyệt)" value={d.openTasks} tone="primary" />
          <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50/60 px-3.5 py-2.5">
            <div>
              <p className="text-[11px] font-semibold text-rose-800">Đang quá hạn (Overdue)</p>
              <p className="mt-0.5 font-mono text-xl font-extrabold text-rose-700">{d.overdueTasks}</p>
            </div>
            <AlertTriangle size={18} className="text-rose-600" />
          </div>
          <MiniStat label="Đã nghiệm thu (COMPLETED)" value={d.completedTasks} tone="emerald" />
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 shadow-2xs">
      <div>
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-2xl font-extrabold text-foreground tabular-nums">{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
      </div>
      <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "primary" | "emerald" | "amber" | "muted";
}) {
  const valueClass =
    tone === "primary"
      ? "text-primary"
      : tone === "emerald"
        ? "text-emerald-700"
        : tone === "amber"
          ? "text-amber-700"
          : tone === "muted"
            ? "text-muted-foreground"
            : "text-foreground";
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-xl font-extrabold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}
