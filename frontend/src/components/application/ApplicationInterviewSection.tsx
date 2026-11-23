"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BellRing, CalendarClock, ExternalLink, MapPin, Save } from "lucide-react";
import { apiModel, Application } from "@/lib/api";
import { Section } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/input";
import { formatDateTime, safeExternalHref } from "@/lib/utils";
import {
  formatInterviewReminderLabel,
  fromDateTimeLocalInput,
  toDateTimeLocalInput,
} from "@/forms/application/interview-scheduling";

interface ApplicationInterviewSectionProps {
  clubId: string;
  application: Application;
  canSchedule: boolean;
  onUpdated: (updated: Application, notice: string) => void;
  onError: (msg: string) => void;
}

export function ApplicationInterviewSection({
  clubId,
  application,
  canSchedule,
  onUpdated,
  onError,
}: ApplicationInterviewSectionProps) {
  const isTerminalBlocked =
    application.status === "REJECTED" || application.status === "CANCELLED";

  const [interviewAtLocal, setInterviewAtLocal] = useState(() =>
    toDateTimeLocalInput(application.interviewAt),
  );
  const [interviewLocation, setInterviewLocation] = useState(
    () => application.interviewLocation ?? "",
  );
  const [interviewNote, setInterviewNote] = useState(
    () => application.interviewNote ?? "",
  );

  const scheduleMutation = useMutation({
    mutationFn: () => {
      const iso = fromDateTimeLocalInput(interviewAtLocal);
      if (!iso) {
        throw new Error("Vui lòng chọn thời gian phỏng vấn / gặp mặt hợp lệ.");
      }
      const loc = interviewLocation.trim();
      if (!loc) {
        throw new Error("Vui lòng nhập địa điểm hoặc đường dẫn Google Meet.");
      }
      return apiModel.scheduleApplicationInterview(clubId, application.id, {
        interviewAt: iso,
        interviewLocation: loc,
        interviewNote: interviewNote.trim() || undefined,
      });
    },
    onSuccess: (updated) => {
      setInterviewAtLocal(toDateTimeLocalInput(updated.interviewAt));
      setInterviewLocation(updated.interviewLocation ?? "");
      setInterviewNote(updated.interviewNote ?? "");
      onUpdated(updated, "Đã lưu lịch phỏng vấn / gặp mặt và gửi thông báo tới ứng viên.");
    },
    onError: (e) => onError(describeError(e)),
  });

  const remindMutation = useMutation({
    mutationFn: () => apiModel.remindApplicationInterview(clubId, application.id),
    onSuccess: (updated) => {
      onUpdated(updated, "Đã gửi thông báo nhắc lịch hẹn tới ứng viên.");
    },
    onError: (e) => onError(describeError(e)),
  });

  if (!canSchedule && !application.interviewAt) {
    return null;
  }

  const locationHref = safeExternalHref(application.interviewLocation);
  const canSubmit = Boolean(interviewAtLocal.trim() && interviewLocation.trim());

  return (
    <Section title="Lịch phỏng vấn / First Meeting" icon={<CalendarClock />}>
      <div className="space-y-3">
        {application.interviewAt && (
          <div className="rounded-lg border border-primary/25 bg-primary/[0.04] p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-primary">
                {formatDateTime(application.interviewAt)}
              </span>
              <Badge tone="primary" dot={false}>
                Đã lên lịch
              </Badge>
            </div>
            {application.interviewLocation && (
              <p className="mt-1.5 flex items-start gap-1.5 text-foreground">
                <MapPin size={13} className="mt-0.5 shrink-0 text-primary" />
                {locationHref ? (
                  <a
                    href={locationHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 break-all font-medium text-primary underline"
                  >
                    {application.interviewLocation}
                    <ExternalLink size={11} className="shrink-0" />
                  </a>
                ) : (
                  <span className="break-words font-medium">{application.interviewLocation}</span>
                )}
              </p>
            )}
            {application.interviewNote && (
              <p className="mt-1.5 whitespace-pre-line text-muted-foreground">
                Ghi chú: {application.interviewNote}
              </p>
            )}
            <p className="mt-2 border-t border-primary/15 pt-1.5 text-[11px] text-muted-foreground">
              {formatInterviewReminderLabel(application.interviewReminderSentAt)}
            </p>
          </div>
        )}

        {canSchedule && !isTerminalBlocked && (
          <div className="space-y-2.5 rounded-lg border border-border bg-card p-3">
            <FormField label="Thời gian phỏng vấn / gặp mặt" required>
              <Input
                type="datetime-local"
                value={interviewAtLocal}
                onChange={(e) => setInterviewAtLocal(e.target.value)}
                disabled={scheduleMutation.isPending}
              />
            </FormField>
            <FormField label="Địa điểm / Link Google Meet" required>
              <Input
                maxLength={500}
                value={interviewLocation}
                onChange={(e) => setInterviewLocation(e.target.value)}
                placeholder="VD: Phòng B203 - Mỹ Đình hoặc https://meet.google.com/..."
                disabled={scheduleMutation.isPending}
              />
            </FormField>
            <FormField label="Ghi chú cho ứng viên">
              <Textarea
                rows={2}
                maxLength={1000}
                value={interviewNote}
                onChange={(e) => setInterviewNote(e.target.value)}
                placeholder="VD: Vui lòng đến trước 10 phút, mang theo laptop hoặc sản phẩm mẫu..."
                disabled={scheduleMutation.isPending}
              />
            </FormField>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => scheduleMutation.mutate()}
                disabled={!canSubmit || scheduleMutation.isPending}
              >
                <Save size={13} />
                {scheduleMutation.isPending
                  ? "Đang lưu..."
                  : "Lưu lịch & Thông báo ứng viên"}
              </Button>
              {application.interviewAt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => remindMutation.mutate()}
                  disabled={remindMutation.isPending}
                >
                  <BellRing size={13} />
                  {remindMutation.isPending ? "Đang gửi..." : "Gửi nhắc lịch hẹn"}
                </Button>
              )}
            </div>
          </div>
        )}

        {canSchedule && isTerminalBlocked && (
          <p className="text-xs text-muted-foreground">
            Đơn ở trạng thái đã từ chối hoặc đã rút không thể lên lịch hoặc gửi nhắc phỏng vấn.
          </p>
        )}
      </div>
    </Section>
  );
}
