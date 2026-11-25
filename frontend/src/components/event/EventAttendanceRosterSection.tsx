"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Search, Settings2, Users, X } from "lucide-react";
import { EventAttendance, EventRegistration } from "@/lib/api";
import { Section } from "@/components/shared/Overlays";
import { LoadingRows } from "@/components/shared/States";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ParticipantStatusFilter } from "@/utils/event-participants";
import { EventSubmissionDownloadButton } from "@/components/event/EventSubmissionBlock";

export function EventAttendanceRosterSection({
  eventId,
  isPending,
  allRegistrationsCount,
  activeRegistrationsCount,
  filteredRegistrations,
  participantQuery,
  participantStatus,
  onUpdateFilter,
  attendanceMap,
  canUpdate,
  onOpenParticipantModal,
  onError,
}: {
  eventId: string;
  isPending: boolean;
  allRegistrationsCount: number;
  activeRegistrationsCount: number;
  filteredRegistrations: EventRegistration[];
  participantQuery: string;
  participantStatus: ParticipantStatusFilter;
  onUpdateFilter: (next: Partial<{ query: string; status: ParticipantStatusFilter }>) => void;
  attendanceMap: Map<string, EventAttendance>;
  canUpdate: boolean;
  onOpenParticipantModal: (r: EventRegistration) => void;
  onError: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const attendedCount = Array.from(attendanceMap.values()).filter(
    (a) => a.status === "PRESENT" || a.status === "LATE",
  ).length;

  return (
    <Section
      title={`Danh sách nhân sự đăng ký (${activeRegistrationsCount} hiệu lực / ${allRegistrationsCount} tổng)`}
      icon={<Users />}
    >
      {isPending ? (
        <LoadingRows rows={1} />
      ) : !allRegistrationsCount ? (
        <p className="text-xs text-muted-foreground">Chưa có người đăng ký tham gia.</p>
      ) : (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/25 px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral" dot={false}>Đăng ký: <strong className="font-mono">{activeRegistrationsCount}</strong></Badge>
              <Badge tone="primary" dot={false}>Có mặt: <strong className="font-mono">{attendedCount}</strong></Badge>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? (
                <>Thu gọn <ChevronUp size={13} /></>
              ) : (
                <>Xem danh sách ({allRegistrationsCount}) <ChevronDown size={13} /></>
              )}
            </Button>
          </div>

          {expanded && (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Tìm nhân sự đăng ký"
                    maxLength={200}
                    value={participantQuery}
                    onChange={(e) => onUpdateFilter({ query: e.target.value })}
                    placeholder="Tìm sinh viên theo tên, MSSV, email…"
                    className="h-8 pl-8 pr-7 text-xs"
                  />
                  {participantQuery && (
                    <button
                      type="button"
                      aria-label="Xoá từ khoá tìm kiếm"
                      onClick={() => onUpdateFilter({ query: "" })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <Select
                  aria-label="Lọc trạng thái đăng ký nhân sự"
                  className="h-8 w-full text-xs sm:w-36"
                  value={participantStatus}
                  onChange={(e) => onUpdateFilter({ status: e.target.value as ParticipantStatusFilter })}
                >
                  <option value="ALL">Tất cả</option>
                  <option value="REGISTERED">Đã đăng ký</option>
                  <option value="CANCELLED">Đã huỷ</option>
                </Select>
              </div>

              {!filteredRegistrations.length ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
                  <span>Không tìm thấy sinh viên khớp bộ lọc.</span>
                  <Button size="sm" variant="outline" onClick={() => onUpdateFilter({ query: "", status: "ALL" })}>
                    Xoá lọc
                  </Button>
                </div>
              ) : (
                <ul className="max-h-60 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border">
                  {filteredRegistrations.map((r) => {
                    const savedAttendance = attendanceMap.get(r.userId);
                    return (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold">{r.userFullName || r.userEmail || r.userId.slice(0, 8)}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {[r.studentCode, r.userEmail].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={r.participantType} />
                          {r.eventRole && <Badge tone="neutral">{r.eventRole}</Badge>}
                          {savedAttendance && <StatusBadge status={savedAttendance.status} />}
                          {r.status === "CANCELLED" && <StatusBadge status="CANCELLED" />}
                          {r.submissionFileName && (
                            <EventSubmissionDownloadButton eventId={eventId} registrationId={r.id} fileName={r.submissionFileName} onError={onError} />
                          )}
                          {canUpdate && (
                            <Button size="sm" variant="outline" onClick={() => onOpenParticipantModal(r)}>
                              <Settings2 size={12} /> Phân vai
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </Section>
  );
}
