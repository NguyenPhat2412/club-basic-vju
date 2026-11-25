"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, CalendarRange, ChevronLeft, ChevronRight, Lock, MapPin } from "lucide-react";
import { apiModel, type TimelineEventItem } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { describeError } from "@/components/shared/ListPage";
import { SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { cn, formatDateTime } from "@/lib/utils";
import {
  buildAcademicTermOptions,
  computeGanttBarGeometry,
  computeGanttWindow,
  type GanttTimeScale,
  shiftGanttAnchor,
} from "@/utils/export/training-points-report";

function eventStatusToneClass(status: string): string {
  switch (status) {
    case "DRAFT":
      return "border border-dashed border-slate-400 bg-slate-100 text-slate-700";
    case "OPEN_REGISTRATION":
      return "border border-primary/40 bg-primary/15 text-primary";
    case "CLOSED_REGISTRATION":
      return "border border-slate-400 bg-slate-200 text-slate-900";
    case "COMPLETED":
      return "bg-primary text-primary-foreground";
    case "CANCELLED":
      return "border border-rose-200 bg-rose-50 text-rose-700 line-through";
    default:
      return "border border-slate-300 bg-slate-100 text-slate-800";
  }
}

export function EventsGanttView({ activeClubId }: { activeClubId?: string }) {
  const [scale, setScale] = useState<GanttTimeScale>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [academicTerm, setAcademicTerm] = useState("");
  const [clubFilter, setClubFilter] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<TimelineEventItem | null>(null);

  const termOptions = useMemo(() => buildAcademicTermOptions(), []);
  const { start, end, ticks } = useMemo(() => computeGanttWindow(anchor, scale), [anchor, scale]);
  const fromIso = start.toISOString();
  const toIso = end.toISOString();

  const publicClubsQuery = useQuery({
    queryKey: qk.publicClubs("events-gantt-units"),
    queryFn: () => apiModel.publicClubs("", "", 0, 100),
    staleTime: 60_000,
  });

  const timelineQuery = useQuery({
    queryKey: qk.eventsTimeline(academicTerm || "all", fromIso, toIso, clubFilter || "all"),
    queryFn: () =>
      apiModel.eventsTimeline({
        academicTerm: academicTerm || undefined,
        from: fromIso,
        to: toIso,
        clubId: clubFilter || undefined,
      }),
  });

  const units = useMemo(() => timelineQuery.data?.units ?? [], [timelineQuery.data?.units]);

  const unitSelectOptions = useMemo(() => {
    const map = new Map<string, { clubId: string; clubCode: string; clubName: string }>();
    for (const c of publicClubsQuery.data?.items ?? []) {
      map.set(c.id, { clubId: c.id, clubCode: c.code ?? "", clubName: c.name });
    }
    for (const u of units) {
      map.set(u.clubId, { clubId: u.clubId, clubCode: u.clubCode, clubName: u.clubName });
    }
    return Array.from(map.values()).sort((a, b) => {
      const aDtn = a.clubCode.toUpperCase() === "DOANVJU" ? 0 : 1;
      const bDtn = b.clubCode.toUpperCase() === "DOANVJU" ? 0 : 1;
      return aDtn !== bDtn ? aDtn - bDtn : a.clubName.localeCompare(b.clubName, "vi");
    });
  }, [publicClubsQuery.data?.items, units]);

  const conflictIds = useMemo(() => {
    const allEvents = units.flatMap((u) => u.events);
    const ids = new Set<string>();
    for (let i = 0; i < allEvents.length; i += 1) {
      const a = allEvents[i];
      const aStart = new Date(a.startTime).getTime();
      const aEnd = new Date(a.endTime).getTime();
      for (let j = i + 1; j < allEvents.length; j += 1) {
        const b = allEvents[j];
        if (a.clubId === b.clubId) continue;
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        if (aStart < bEnd && bStart < aEnd) {
          ids.add(a.id);
          ids.add(b.id);
        }
      }
    }
    return ids;
  }, [units]);

  const windowLabel = `${start.toLocaleDateString("vi-VN")} – ${new Date(end.getTime() - 1).toLocaleDateString("vi-VN")}`;

  return (
    <div className="space-y-4 px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedTabs
            value={scale}
            onChange={(v) => setScale(v)}
            options={[{ value: "week", label: "Tuần" }, { value: "month", label: "Tháng" }, { value: "term", label: "Học kỳ" }]}
          />
          <div className="flex items-center gap-1">
            <Button type="button" size="icon-sm" variant="outline" aria-label="Khoảng trước" onClick={() => setAnchor((d) => shiftGanttAnchor(d, scale, -1))}>
              <ChevronLeft size={14} />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAnchor(new Date())} className="h-8 text-xs">
              Hôm nay
            </Button>
            <Button type="button" size="icon-sm" variant="outline" aria-label="Khoảng sau" onClick={() => setAnchor((d) => shiftGanttAnchor(d, scale, 1))}>
              <ChevronRight size={14} />
            </Button>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-700">{windowLabel}</span>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Select aria-label="Lọc học kỳ trên GANTT" value={academicTerm} onChange={(e) => setAcademicTerm(e.target.value)} className="h-8 w-full text-xs sm:w-40">
            <option value="">Tất cả học kỳ</option>
            {termOptions.map((t) => <option key={t} value={t}>Học kỳ {t}</option>)}
          </Select>
          <Select aria-label="Lọc đơn vị trên GANTT" value={clubFilter} onChange={(e) => setClubFilter(e.target.value)} className="h-8 w-full text-xs sm:w-52">
            <option value="">Tất cả 13 đơn vị</option>
            {unitSelectOptions.map((u) => (
              <option key={u.clubId} value={u.clubId}>
                {u.clubCode ? `${u.clubCode} · ${u.clubName}` : u.clubName}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral" dot={false}><span className="size-2 rounded-xs border border-dashed border-slate-500 bg-slate-200" /> Dự kiến</Badge>
          <Badge tone="primary" dot={false}><span className="size-2 rounded-xs bg-primary/30" /> Đang mở ĐK</Badge>
          <Badge tone="success" dot={false}><span className="size-2 rounded-xs bg-primary" /> Đã hoàn thành</Badge>
          {conflictIds.size > 0 && (
            <Badge tone="danger"><AlertTriangle size={11} /> {conflictIds.size} sự kiện trùng khung giờ liên đơn vị</Badge>
          )}
        </div>
        {timelineQuery.data && <CountBadge>{timelineQuery.data.totalUnits} đơn vị · {timelineQuery.data.totalEvents} sự kiện</CountBadge>}
      </div>

      {timelineQuery.isPending ? (
        <LoadingRows />
      ) : timelineQuery.isError ? (
        <ErrorState message={describeError(timelineQuery.error)} onRetry={() => timelineQuery.refetch()} />
      ) : units.length === 0 ? (
        <EmptyState icon={<CalendarRange />} title="Chưa có dữ liệu dòng thời gian" description="Không tìm thấy đơn vị hoặc sự kiện nào trong khoảng thời gian đã chọn." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <div className="min-w-[780px]">
              <div className="flex border-b border-border bg-slate-50 text-[11px] font-bold text-slate-600">
                <div className="sticky left-0 z-10 w-[210px] shrink-0 border-r border-border bg-slate-50 px-3 py-2.5">
                  Đơn vị / Câu lạc bộ
                </div>
                <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${ticks.length}, minmax(0, 1fr))` }}>
                  {ticks.map((tick) => (
                    <div key={tick.toISOString()} className="border-r border-border/60 px-2 py-2.5 text-center last:border-r-0">
                      {scale === "term" ? `Th${tick.getMonth() + 1}/${tick.getFullYear()}` : tick.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-border/70">
                {units.map((unit) => (
                  <div key={unit.clubId} className={cn("flex min-h-14 items-stretch", activeClubId === unit.clubId && "bg-rose-50/40")}>
                    <div className="sticky left-0 z-10 flex w-[210px] shrink-0 flex-col justify-center gap-0.5 border-r border-border bg-card px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Badge tone={unit.clubCode.toUpperCase() === "DOANVJU" ? "primary" : "neutral"} dot={false}>{unit.clubCode}</Badge>
                        <span className="font-mono text-[10.5px] text-muted-foreground">{unit.eventCount} SK</span>
                      </div>
                      <p className="truncate text-xs font-semibold text-slate-800" title={unit.clubName}>{unit.clubName}</p>
                    </div>

                    <div className="relative flex-1 bg-slate-50/30 px-1 py-2">
                      <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${ticks.length}, minmax(0, 1fr))` }}>
                        {ticks.map((tick) => <div key={tick.toISOString()} className="border-r border-border/40 last:border-r-0" />)}
                      </div>

                      {unit.events.length === 0 ? (
                        <div className="relative flex h-8 items-center px-2 text-[11px] text-muted-foreground">Chưa có sự kiện trong khung thời gian</div>
                      ) : (
                        <div className="relative space-y-1">
                          {unit.events.map((ev) => {
                            const { leftPct, widthPct } = computeGanttBarGeometry(start, end, ev.startTime, ev.endTime);
                            const isConflict = conflictIds.has(ev.id);
                            return (
                              <div key={ev.id} className="relative h-7 w-full">
                                <button
                                  type="button"
                                  onClick={() => setSelectedEvent(ev)}
                                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                  title={`${ev.title} (${formatDateTime(ev.startTime)})${isConflict ? " · Trùng khung giờ liên đơn vị" : ""}`}
                                  className={cn(
                                    "absolute top-0 flex h-7 items-center gap-1 overflow-hidden rounded-md px-2 text-left text-[11px] font-semibold shadow-2xs transition-opacity hover:opacity-90",
                                    eventStatusToneClass(ev.status),
                                    isConflict && "ring-2 ring-destructive ring-offset-1"
                                  )}
                                >
                                  {ev.attendanceLocked && <Lock size={10} className="shrink-0" />}
                                  <span className="truncate">{ev.title}</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selectedEvent && (
            <div className="rounded-xl border border-primary/25 bg-card p-3.5 text-xs shadow-2xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary" dot={false}>{selectedEvent.clubCode}</Badge>
                    <span className="font-bold text-slate-900">{selectedEvent.title}</span>
                    <StatusBadge status={selectedEvent.status} />
                    {selectedEvent.academicTerm && <Badge tone="neutral" dot={false}>{selectedEvent.academicTerm}</Badge>}
                    {conflictIds.has(selectedEvent.id) && <Badge tone="danger">Trùng khung giờ</Badge>}
                  </div>
                  <p className="text-muted-foreground">
                    {formatDateTime(selectedEvent.startTime)} – {formatDateTime(selectedEvent.endTime)}
                    {selectedEvent.location && <span className="ml-2 inline-flex items-center gap-1"><MapPin size={11} /> {selectedEvent.location}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-700">
                    Có mặt: <strong>{selectedEvent.presentCount}</strong> / {selectedEvent.registrationCount} ĐK ({selectedEvent.participationRate}%)
                  </span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedEvent(null)}>Đóng</Button>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700">
                <BarChart3 size={14} className="text-primary" /> Tỷ lệ tham gia thực tế theo 13 đơn vị
              </h4>
              <span className="text-[11px] text-muted-foreground">Lượt có mặt / Tổng lượt đăng ký hợp lệ</span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {units.map((u) => (
                <div key={u.clubId} className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-semibold text-slate-800" title={u.clubName}>{u.clubCode} · {u.clubName}</span>
                    <span className="shrink-0 font-mono font-bold text-primary">{u.participationRate}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, u.participationRate))}%` }} />
                  </div>
                  <p className="mt-1 font-mono text-[10.5px] text-muted-foreground">
                    {u.totalPresent} có mặt / {u.totalRegistrations} đăng ký ({u.eventCount} sự kiện)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
