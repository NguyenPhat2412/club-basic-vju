"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, Printer } from "lucide-react";
import { apiModel, type Club } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  openPrintableVjuAdminForm,
  VJU_ADMIN_FORM_TEMPLATES,
  type VjuAdminFormTemplateKey,
} from "@/utils/export/vju-admin-forms";

export interface VjuAdminFormRequester {
  fullName?: string;
  studentCode?: string;
  email?: string;
}

export function VjuAdminFormsCard({
  clubs,
  defaultClubId,
  canManageAnyClub,
  requester,
}: {
  clubs: Club[];
  defaultClubId?: string;
  canManageAnyClub: boolean;
  requester?: VjuAdminFormRequester;
}) {
  const [selectedClubId, setSelectedClubId] = useState(defaultClubId ?? "");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [templateKey, setTemplateKey] = useState<VjuAdminFormTemplateKey>("ROOM_FACILITY_REQUEST");

  const activeClub = clubs.find((c) => c.id === selectedClubId) ?? clubs.find((c) => c.id === defaultClubId) ?? clubs[0];
  const resolvedClubId = activeClub?.id ?? "";
  const eventsQuery = useQuery({
    queryKey: qk.clubEvents(resolvedClubId, "vju-admin-forms"),
    queryFn: () => apiModel.clubEvents(resolvedClubId, { offset: 0, limit: 50 }),
    enabled: canManageAnyClub && Boolean(resolvedClubId),
  });
  const events = eventsQuery.data?.items ?? [];
  const activeEvent = events.find((ev) => ev.id === selectedEventId) ?? events[0];

  const handleExport = () => {
    if (!canManageAnyClub || !activeClub || !activeEvent) return;
    const opened = openPrintableVjuAdminForm(templateKey, {
      clubName: activeClub.name,
      clubCode: activeClub.code,
      eventTitle: activeEvent.title,
      departmentName: activeEvent.departmentName,
      startTime: activeEvent.startTime,
      endTime: activeEvent.endTime,
      location: activeEvent.location,
      expectedParticipants: activeEvent.maxParticipants,
      description: activeEvent.description,
      requesterName: requester?.fullName,
      requesterStudentCode: requester?.studentCode,
      requesterEmail: requester?.email,
    });
    if (opened) toast.success(`Đã mở bản in A4 điền sẵn cho sự kiện "${activeEvent.title}".`);
    else toast.error("Trình duyệt đang chặn cửa sổ bật lên (popup). Hãy cho phép popup để in biểu mẫu.");
  };

  return (
    <section className="border-b border-border/70 bg-secondary/25 px-4 py-3 sm:px-6">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {VJU_ADMIN_FORM_TEMPLATES.map((tpl) => {
          const active = canManageAnyClub && templateKey === tpl.key;
          return (
            <button
              key={tpl.key}
              type="button"
              disabled={!canManageAnyClub}
              onClick={() => setTemplateKey(tpl.key)}
              className={`rounded-xl border p-2.5 text-left transition-colors ${
                active ? "border-primary/40 bg-card shadow-2xs" : "border-border/80 bg-card/80 hover:border-primary/30 disabled:cursor-default disabled:hover:border-border/80"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10.5px] font-bold text-primary">{tpl.code}</span>
                {active && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Đang chọn</span>}
              </div>
              <p className="mt-1 text-xs font-semibold text-foreground">{tpl.title}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{tpl.summary}</p>
            </button>
          );
        })}
      </div>

      {canManageAnyClub ? (
        <div className="mt-3 grid grid-cols-1 items-end gap-2.5 rounded-xl border border-border/80 bg-card p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.15fr)_auto]">
          <label className="grid min-w-0 gap-1 text-[11px] font-medium text-muted-foreground">
            <span>1. Câu lạc bộ</span>
            <Select
              aria-label="Chọn câu lạc bộ xuất biểu mẫu"
              value={resolvedClubId}
              onChange={(e) => { setSelectedClubId(e.target.value); setSelectedEventId(""); }}
              className="h-8 w-full min-w-0 text-xs text-foreground"
            >
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </label>
          <label className="grid min-w-0 gap-1 text-[11px] font-medium text-muted-foreground">
            <span>2. Sự kiện thực tế của CLB</span>
            <Select
              aria-label="Chọn sự kiện điền sẵn biểu mẫu"
              value={activeEvent?.id ?? ""}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={eventsQuery.isPending || events.length === 0}
              className="h-8 w-full min-w-0 text-xs text-foreground"
            >
              {eventsQuery.isPending ? (
                <option value="">Đang tải sự kiện CLB…</option>
              ) : events.length === 0 ? (
                <option value="">CLB chưa có sự kiện nào</option>
              ) : (
                events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)
              )}
            </Select>
          </label>
          <label className="grid min-w-0 gap-1 text-[11px] font-medium text-muted-foreground">
            <span>3. Loại biểu mẫu chuẩn VJU</span>
            <Select
              aria-label="Chọn loại biểu mẫu chuẩn VJU"
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value as VjuAdminFormTemplateKey)}
              className="h-8 w-full min-w-0 text-xs text-foreground"
            >
              {VJU_ADMIN_FORM_TEMPLATES.map((tpl) => <option key={tpl.key} value={tpl.key}>{tpl.code} · {tpl.title}</option>)}
            </Select>
          </label>
          <Button type="button" size="sm" className="h-8 shrink-0 whitespace-nowrap" disabled={!activeClub || !activeEvent} onClick={handleExport}>
            <Printer size={13} /> Xuất &amp; In biểu mẫu
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3 py-2 text-xs text-muted-foreground">
          <Lock size={13} className="shrink-0 text-primary" />
          <span>Danh mục biểu mẫu chuẩn VJU ở chế độ tham khảo. Tính năng tự động điền từ sự kiện CLB chỉ mở cho Ban Chủ nhiệm &amp; Ban Tổ chức CLB.</span>
        </div>
      )}
    </section>
  );
}
