"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { apiModel, ClubEvent, Department } from "@/lib/api";
import { ModalShell } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { EventCoverUploadField } from "@/components/event/EventCoverUploadField";
import { EVENT_TYPE_LABELS, EventFormValues, getEventScopeLabel, isEventPublic, toIso } from "@/forms/event/event-form";

export { NotifyEventModal, UpdateParticipantModal } from "@/components/event/EventParticipantAndNotifyModals";

const ACADEMIC_TERM_RE = /^\d{4}-[123]$/;

function deriveAcademicTermFromLocal(startTimeStr: string): string {
  if (!startTimeStr) return "";
  const date = new Date(startTimeStr);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  if (!year || !month) return "";
  if (month >= 9) return `${year}-1`;
  if (month <= 5) return `${year - 1}-2`;
  return `${year - 1}-3`;
}

type UpsertEventModalProps = {
  clubId: string;
  creating: boolean;
  editing: ClubEvent | null;
  form: EventFormValues;
  setForm: React.Dispatch<React.SetStateAction<EventFormValues>>;
  departments: Department[];
  onClose: () => void;
  onSaved: (ev: ClubEvent, isEdit: boolean) => void;
  onError: (msg: string) => void;
};

export function UpsertEventModal(props: UpsertEventModalProps) {
  const open = props.creating || !!props.editing;
  if (!open) return null;
  return <UpsertEventModalForm key={props.editing?.id ?? "new"} {...props} />;
}

function UpsertEventModalForm({
  clubId,
  editing,
  form,
  setForm,
  departments,
  onClose,
  onSaved,
  onError,
}: UpsertEventModalProps) {
  const [termDraft, setTermDraft] = useState<{ value: string; touched: boolean }>(() => ({
    value: editing?.academicTerm ?? "",
    touched: Boolean(editing?.academicTerm),
  }));
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverCleared, setCoverCleared] = useState(false);

  const derivedTerm = deriveAcademicTermFromLocal(form.startTime);
  const effectiveTerm = termDraft.touched ? termDraft.value : derivedTerm;
  const trimmedTerm = effectiveTerm.trim();
  const termInvalid = trimmedTerm.length > 0 && !ACADEMIC_TERM_RE.test(trimmedTerm);

  const syncEventCover = async (saved: ClubEvent): Promise<ClubEvent> => {
    if (coverFile) return apiModel.uploadEventCover(saved.id, coverFile);
    if (coverCleared && saved.coverImageUrl) return apiModel.deleteEventCover(saved.id);
    return saved;
  };

  const create = useMutation({
    mutationFn: async () => {
      const created = await apiModel.createEvent(clubId, {
        title: form.title.trim(),
        eventType: form.eventType,
        departmentId: form.departmentId || undefined,
        location: form.location.trim() || undefined,
        startTime: toIso(form.startTime),
        endTime: toIso(form.endTime),
        registrationDeadline: toIso(form.registrationDeadline || form.startTime),
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
        allowCtv: form.allowCtv,
        allowPublicAttendees: form.allowPublicAttendees,
        requiresSubmission: form.requiresSubmission,
        status: form.status,
        description: form.description.trim() || undefined,
        academicTerm: trimmedTerm || undefined,
      });
      return syncEventCover(created);
    },
    onSuccess: (ev) => {
      onSaved(ev, false);
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  const update = useMutation({
    mutationFn: async () => {
      const updated = await apiModel.updateEvent(clubId, editing!.id, {
        title: form.title.trim(),
        eventType: form.eventType,
        departmentId: form.departmentId || undefined,
        location: form.location.trim() || undefined,
        startTime: toIso(form.startTime),
        endTime: toIso(form.endTime),
        registrationDeadline: toIso(form.registrationDeadline || form.startTime),
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
        allowCtv: form.allowCtv,
        allowPublicAttendees: form.allowPublicAttendees,
        requiresSubmission: form.requiresSubmission,
        status: form.status,
        description: form.description.trim() || undefined,
        academicTerm: trimmedTerm || undefined,
      });
      return syncEventCover(updated);
    },
    onSuccess: (ev) => {
      onSaved(ev, true);
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  const modalError = create.error || update.error;

  return (
    <ModalShell
      open
      onClose={onClose}
      title={editing ? "Cập nhật sự kiện" : "Tạo sự kiện & lịch sinh hoạt"}
      icon={<Calendar />}
      onSubmit={() => (editing ? update.mutate() : create.mutate())}
      submitLabel={editing ? "Lưu thay đổi" : "Tạo sự kiện"}
      submitLoading={create.isPending || update.isPending}
      submitDisabled={!form.title.trim() || !form.startTime || !form.endTime || termInvalid}
    >
      {modalError && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {describeError(modalError)}
        </div>
      )}
      <FormField label="Tên sự kiện / buổi sinh hoạt" required>
        <Input
          value={form.title}
          maxLength={200}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Ví dụ: Sinh hoạt định kỳ tháng 11, Workshop Kỹ năng…"
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Loại hoạt động" required>
          <Select value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}>
            {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Ban phụ trách">
          <Select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
            <option value="">Toàn câu lạc bộ</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Bắt đầu" required>
          <Input
            type="datetime-local"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
          />
        </FormField>
        <FormField label="Kết thúc" required>
          <Input
            type="datetime-local"
            value={form.endTime}
            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
          />
        </FormField>
      </div>
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <FormField label="Hạn đăng ký">
          <Input
            type="datetime-local"
            value={form.registrationDeadline}
            onChange={(e) => setForm((f) => ({ ...f, registrationDeadline: e.target.value }))}
          />
        </FormField>
        <FormField label="Số lượng tối đa">
          <Input
            type="number"
            min={1}
            max={100000}
            step={1}
            value={form.maxParticipants}
            onChange={(e) => setForm((f) => ({ ...f, maxParticipants: e.target.value }))}
            placeholder="Không giới hạn"
          />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Địa điểm">
          <Input
            value={form.location}
            maxLength={300}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="Phòng 402 VJU / Online…"
          />
        </FormField>
        <FormField label="Trạng thái" required>
          <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            {[
              { value: "DRAFT", label: "Bản nháp" },
              { value: "OPEN_REGISTRATION", label: "Đang mở đăng ký" },
              { value: "CLOSED_REGISTRATION", label: "Đã đóng đăng ký" },
              { value: "COMPLETED", label: "Đã hoàn thành" },
              { value: "CANCELLED", label: "Đã huỷ" },
            ]
              .filter((opt) => {
                if (!editing) return opt.value === "DRAFT" || opt.value === "OPEN_REGISTRATION";
                const cur = editing.status;
                if (cur === "DRAFT") return ["DRAFT", "OPEN_REGISTRATION", "CANCELLED"].includes(opt.value);
                if (cur === "OPEN_REGISTRATION")
                  return ["OPEN_REGISTRATION", "CLOSED_REGISTRATION", "COMPLETED", "CANCELLED"].includes(opt.value);
                if (cur === "CLOSED_REGISTRATION")
                  return ["CLOSED_REGISTRATION", "OPEN_REGISTRATION", "COMPLETED", "CANCELLED"].includes(opt.value);
                return opt.value === cur;
              })
              .map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
          </Select>
        </FormField>
      </div>
      <FormField
        label="Học kỳ ĐRL"
        optional
        hint="Tự suy ra từ giờ bắt đầu (YYYY-1, YYYY-2, YYYY-3)"
        error={termInvalid ? "Định dạng hợp lệ: YYYY-1, YYYY-2 hoặc YYYY-3 (ví dụ: 2026-1)." : undefined}
      >
        <Input
          value={effectiveTerm}
          maxLength={16}
          onChange={(e) => setTermDraft({ value: e.target.value, touched: true })}
          placeholder={derivedTerm || "Ví dụ: 2026-1"}
        />
      </FormField>
      <div className="space-y-2.5 rounded-xl border border-border bg-muted/25 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-foreground">Phạm vi & đối tượng tham gia</span>
          <Badge tone={isEventPublic(form) ? "primary" : "neutral"} dot={false}>
            {getEventScopeLabel(form)}
          </Badge>
        </div>
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            checked={form.allowPublicAttendees}
            onChange={(e) => setForm((f) => ({ ...f, allowPublicAttendees: e.target.checked }))}
          />
          <span className="leading-snug">
            <span className="block text-xs font-semibold text-foreground">
              Mở đăng ký Tham dự toàn trường (ATTENDEE)
            </span>
            <span className="block text-[11px] text-muted-foreground">
              SV ngoài CLB được đăng ký làm Người tham dự & điểm danh ĐRL.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            checked={form.allowCtv}
            onChange={(e) => setForm((f) => ({ ...f, allowCtv: e.target.checked }))}
          />
          <span className="leading-snug">
            <span className="block text-xs font-semibold text-foreground">
              Mở tuyển Cộng tác viên sự kiện (CTV)
            </span>
            <span className="block text-[11px] text-muted-foreground">
              SV ngoài CLB được đăng ký làm CTV và nhận công việc sự kiện.
            </span>
          </span>
        </label>
        <p className="text-[11px] text-muted-foreground">
          {!isEventPublic(form)
            ? "Nội bộ thành viên CLB — chỉ thành viên đang hoạt động trong CLB mới thấy và đăng ký."
            : form.allowPublicAttendees && form.allowCtv
              ? "Công khai toàn trường — Mở cho SV & CTV tự chọn vai trò Người tham dự hoặc CTV."
              : form.allowPublicAttendees
                ? "Hiển thị công khai toàn trường để sinh viên đăng ký làm Người tham dự."
                : "Hiển thị công khai toàn trường để sinh viên đăng ký làm Cộng tác viên sự kiện."}
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={form.requiresSubmission}
          onChange={(e) => setForm((f) => ({ ...f, requiresSubmission: e.target.checked }))}
        />
        <span>Yêu cầu nộp tệp hồ sơ xét tuyển (tự khóa khi hết hạn)</span>
      </label>
      <EventCoverUploadField
        existingUrl={editing?.coverImageUrl}
        pendingFile={coverFile}
        cleared={coverCleared}
        busy={create.isPending || update.isPending}
        onPickFile={(file) => {
          setCoverFile(file);
          setCoverCleared(false);
        }}
        onClear={() => {
          setCoverFile(null);
          setCoverCleared(true);
        }}
      />
      <FormField label="Nội dung chi tiết">
        <Textarea
          value={form.description}
          maxLength={4000}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </FormField>
    </ModalShell>
  );
}
