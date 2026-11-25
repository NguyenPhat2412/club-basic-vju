"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckSquare, FolderTree, HardDrive, MessageSquare } from "lucide-react";
import { clubUsageQueryOptions } from "@/api/club/club-usage.api";
import { Badge } from "@/components/ui/badge";
import { cn, formatSize } from "@/lib/utils";
import type { ClubUsage } from "@/types/club/club.types";

export interface ClubUsageQuotaCardProps {
  clubId: string;
  compact?: boolean;
  className?: string;
}

interface ResourceMetric {
  key: string;
  label: string;
  shortLabel: string;
  count: number;
  max: number;
  icon: typeof MessageSquare;
}

function buildResourceMetrics(data: ClubUsage): ResourceMetric[] {
  return [
    {
      key: "channels",
      label: "Kênh chat",
      shortLabel: "Kênh",
      count: data.channelCount,
      max: data.maxChannelsPerClub,
      icon: MessageSquare,
    },
    {
      key: "departments",
      label: "Ban chuyên môn",
      shortLabel: "Ban",
      count: data.departmentCount,
      max: data.maxDepartmentsPerClub,
      icon: FolderTree,
    },
    {
      key: "events",
      label: "Sự kiện hoạt động",
      shortLabel: "Sự kiện",
      count: data.activeEventCount,
      max: data.maxActiveEventsPerClub,
      icon: CalendarClock,
    },
    {
      key: "tasks",
      label: "Công việc mở",
      shortLabel: "Công việc",
      count: data.openTaskCount,
      max: data.maxOpenTasksPerClub,
      icon: CheckSquare,
    },
  ];
}

function formatLimit(count: number, max: number) {
  return max > 0 ? `${count}/${max}` : String(count);
}

export function ClubUsageQuotaCard({ clubId, compact = false, className }: ClubUsageQuotaCardProps) {
  const { data, isPending, isError } = useQuery(clubUsageQueryOptions(clubId));

  if (isPending) {
    if (compact) {
      return (
        <div className={cn("border-b border-border/70 bg-muted/20 px-4 py-2.5 sm:px-6", className)}>
          <div className="h-7 w-full animate-pulse rounded-lg bg-muted/60" />
        </div>
      );
    }
    return (
      <section className={cn("rounded-xl border border-border/70 bg-card p-4 sm:p-5", className)}>
        <div className="h-28 w-full animate-pulse rounded-lg bg-muted/60" />
      </section>
    );
  }

  if (isError || !data) {
    if (compact) return null;
    return (
      <section className={cn("rounded-xl border border-border/70 bg-card p-4 sm:p-5", className)}>
        <p className="text-xs text-muted-foreground">Không thể tải thông tin dung lượng và hạn mức của câu lạc bộ.</p>
      </section>
    );
  }

  const hasQuota = data.storageQuotaBytes > 0;
  const rawPct = hasQuota ? (data.storageUsedBytes / data.storageQuotaBytes) * 100 : 0;
  const usedPct = Math.min(100, Math.max(0, Math.round(rawPct)));
  const isHighUsage = hasQuota && rawPct > 80;
  const docPct = hasQuota
    ? Math.min(100, Math.max(0, (data.documentBytes / data.storageQuotaBytes) * 100))
    : 0;
  const chatPct = hasQuota
    ? Math.min(100 - docPct, Math.max(0, (data.chatMediaBytes / data.storageQuotaBytes) * 100))
    : 0;
  const quotaLabel = hasQuota
    ? (data.storageQuotaMb > 0 ? `${data.storageQuotaMb} MB` : formatSize(data.storageQuotaBytes))
    : "Không giới hạn";
  const resources = buildResourceMetrics(data);

  if (compact) {
    return (
      <div className={cn("border-b border-border/70 bg-muted/20 px-4 py-2.5 sm:px-6", className)}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <HardDrive size={13} className={cn("shrink-0", isHighUsage ? "text-destructive" : "text-primary")} />
                <span>Dung lượng CLB:</span>
              </span>
              <span className="font-mono text-[11px] font-semibold text-foreground">
                {formatSize(data.storageUsedBytes)} / {quotaLabel}
              </span>
              {hasQuota && (
                <span className={cn("text-[11px] font-medium", isHighUsage ? "text-destructive" : "text-muted-foreground")}>
                  ({usedPct}%)
                </span>
              )}
              {isHighUsage && <Badge tone="danger">{usedPct}% · Sắp đầy</Badge>}
            </div>
            <div
              className="flex h-2 w-full max-w-md overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Mức sử dụng dung lượng câu lạc bộ"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={hasQuota ? usedPct : 0}
            >
              <div
                className={cn("h-full transition-all", isHighUsage ? "bg-destructive" : "bg-primary")}
                style={{ width: `${docPct}%` }}
                title={`Kho tài liệu: ${formatSize(data.documentBytes)}`}
              />
              <div
                className="h-full bg-slate-400 transition-all"
                style={{ width: `${chatPct}%` }}
                title={`Media chat: ${formatSize(data.chatMediaBytes)}`}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {resources.map((item) => {
              const Icon = item.icon;
              const atLimit = item.max > 0 && item.count >= item.max;
              return (
                <span
                  key={item.key}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                    atLimit
                      ? "border-destructive/35 bg-destructive/5 text-destructive"
                      : "border-border/80 bg-card text-muted-foreground"
                  )}
                >
                  <Icon size={11} className="shrink-0" />
                  <span>{item.shortLabel}:</span>
                  <span className="font-mono font-semibold text-foreground">{formatLimit(item.count, item.max)}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className={cn("space-y-4 rounded-xl border border-border/70 bg-card p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <HardDrive size={16} className={cn("shrink-0", isHighUsage ? "text-destructive" : "text-primary")} />
          <h3 className="truncate text-sm font-bold text-foreground">Dung lượng &amp; Hạn mức CLB</h3>
        </div>
        <div className="flex items-center gap-2">
          {isHighUsage && <Badge tone="danger">{usedPct}% · Sắp đầy</Badge>}
          <span className="font-mono text-xs font-semibold text-foreground">
            {formatSize(data.storageUsedBytes)} / {quotaLabel}
          </span>
        </div>
      </div>

      {isHighUsage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            Dung lượng lưu trữ của câu lạc bộ đã đạt <b>{usedPct}%</b> hạn mức. Vui lòng dọn bớt tệp tài liệu cũ hoặc media chat để tránh gián đoạn tải lên.
          </span>
        </div>
      )}

      <div className="space-y-2">
        <div
          className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Phân bổ dung lượng lưu trữ câu lạc bộ"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={hasQuota ? usedPct : 0}
        >
          <div
            className={cn("h-full transition-all", isHighUsage ? "bg-destructive" : "bg-primary")}
            style={{ width: `${docPct}%` }}
            title={`Kho tài liệu: ${formatSize(data.documentBytes)}`}
          />
          <div
            className="h-full bg-slate-400 transition-all"
            style={{ width: `${chatPct}%` }}
            title={`Media chat: ${formatSize(data.chatMediaBytes)}`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", isHighUsage ? "bg-destructive" : "bg-primary")} />
              <span>Kho tài liệu:</span>
              <span className="font-mono font-semibold text-foreground">{formatSize(data.documentBytes)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-slate-400" />
              <span>Media chat:</span>
              <span className="font-mono font-semibold text-foreground">{formatSize(data.chatMediaBytes)}</span>
            </span>
          </div>
          {hasQuota && (
            <span className={cn("font-mono text-[11px] font-semibold", isHighUsage ? "text-destructive" : "text-muted-foreground")}>
              {usedPct}% đã dùng
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {resources.map((item) => {
          const Icon = item.icon;
          const atLimit = item.max > 0 && item.count >= item.max;
          return (
            <div
              key={item.key}
              className={cn(
                "min-w-0 rounded-lg border px-3 py-2",
                atLimit
                  ? "border-destructive/35 bg-destructive/5 text-destructive"
                  : "border-border/70 bg-secondary/40 text-foreground"
              )}
            >
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Icon size={12} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              <p className="mt-1 truncate font-mono text-sm font-bold">{formatLimit(item.count, item.max)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
