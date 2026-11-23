"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, Printer } from "lucide-react";
import type { ClubEvent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  openPrintableVjuAdminForm,
  VJU_ADMIN_FORM_TEMPLATES,
  type VjuAdminFormTemplateKey,
} from "@/utils/export/vju-admin-forms";

export interface EventAdminFormButtonProps {
  event: Pick<
    ClubEvent,
    "title" | "clubName" | "clubCode" | "departmentName" | "startTime" | "endTime" | "location" | "maxParticipants" | "description"
  >;
  clubName?: string;
  activeRegistrationsCount?: number;
  requester?: { fullName?: string; studentCode?: string; email?: string };
  compact?: boolean;
}

export function EventAdminFormButton({
  event, clubName, activeRegistrationsCount, requester, compact = false,
}: EventAdminFormButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const handleExport = (key: VjuAdminFormTemplateKey) => {
    setOpen(false);
    const participants =
      activeRegistrationsCount && event.maxParticipants
        ? `${activeRegistrationsCount} đã đăng ký / tối đa ${event.maxParticipants} người`
        : (event.maxParticipants ?? activeRegistrationsCount);
    const opened = openPrintableVjuAdminForm(key, {
      clubName: clubName || event.clubName,
      clubCode: event.clubCode,
      eventTitle: event.title,
      departmentName: event.departmentName,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      expectedParticipants: participants,
      description: event.description,
      requesterName: requester?.fullName,
      requesterStudentCode: requester?.studentCode,
      requesterEmail: requester?.email,
    });
    if (opened) toast.success(`Đã mở biểu mẫu A4 điền sẵn cho "${event.title}".`);
    else toast.error("Trình duyệt đang chặn cửa sổ bật lên (popup). Hãy cho phép popup để in biểu mẫu.");
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button type="button" variant="outline" size="sm" aria-expanded={open} aria-haspopup="menu" className={compact ? "h-8 text-xs" : undefined} onClick={() => setOpen((p) => !p)}>
        <FileText size={13} className="text-primary" /> Biểu mẫu VJU <ChevronDown size={12} />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1.5 w-72 rounded-xl border border-border bg-card p-1.5 shadow-lg">
          {VJU_ADMIN_FORM_TEMPLATES.map((tpl) => (
            <button key={tpl.key} type="button" role="menuitem" onClick={() => handleExport(tpl.key)} className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-secondary/70">
              <Printer size={13} className="mt-0.5 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block font-semibold text-foreground">{tpl.shortLabel}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{tpl.title}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
