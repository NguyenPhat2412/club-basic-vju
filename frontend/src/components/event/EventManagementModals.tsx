"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bell, Calendar, Settings2 } from "lucide-react";
import { apiModel, ClubEvent, Department, EventRegistration } from "@/lib/api";
import { ModalShell } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { StatusBadge } from "@/components/ui/badge";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { EVENT_TYPE_LABELS, EventFormValues, toIso } from "@/forms/event/event-form";

export function UpsertEventModal({
  clubId,
  creating,
  editing,
  form,
  setForm,
  departments,
  onClose,
  onSaved,
  onError,
}: {
  clubId: string;
  creating: boolean;
  editing: ClubEvent | null;
  form: EventFormValues;
  setForm: React.Dispatch<React.SetStateAction<EventFormValues>>;
  departments: Department[];
  onClose: () => void;
  onSaved: (ev: ClubEvent, isEdit: boolean) => void;
  onError: (msg: string) => void;
}) {
  const create = useMutation({
    mutationFn: () =>
      apiModel.createEvent(clubId, {
        title: form.title.trim(),
        eventType: form.eventType,
        departmentId: form.departmentId || undefined,
        location: form.location.trim() || undefined,
        startTime: toIso(form.startTime),
        endTime: toIso(form.endTime),
        registrationDeadline: toIso(form.registrationDeadline || form.startTime),
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
        allowCtv: form.allowCtv,
        status: form.status,
        description: form.description.trim() || undefined,
      }),
    onSuccess: (ev) => {
      onSaved(ev, false);
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  const update = useMutation({
    mutationFn: () =>
      apiModel.updateEvent(clubId, editing!.id, {
        title: form.title.trim(),
        eventType: form.eventType,
        departmentId: form.departmentId || undefined,
        location: form.location.trim() || undefined,
        startTime: toIso(form.startTime),
        endTime: toIso(form.endTime),
        registrationDeadline: toIso(form.registrationDeadline || form.startTime),
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
        allowCtv: form.allowCtv,
        status: form.status,
        description: form.description.trim() || undefined,
      }),
    onSuccess: (ev) => {
      onSaved(ev, true);
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <ModalShell
      open={creating || !!editing}
      onClose={onClose}
      title={editing ? "Cập nhật sự kiện" : "Tạo sự kiện & lịch sinh hoạt"}
      icon={<Calendar />}
      onSubmit={() => (editing ? update.mutate() : create.mutate())}
      submitLabel={editing ? "Lưu thay đổi" : "Tạo sự kiện"}
      submitLoading={create.isPending || update.isPending}
      submitDisabled={!form.title.trim() || !form.startTime || !form.endTime}
    >
      <FormField label="Tên sự kiện / buổi sinh hoạt" required>
        <Input
          value={form.title}
          maxLength={200}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Ví dụ: Sinh hoạt định kỳ tháng 11, Workshop Kỹ năng…"
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Loại hoạt động">
          <Select value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}>
            {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Ban phụ trách (tuỳ chọn)">
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
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Hạn đăng ký" hint="Mặc định trước giờ bắt đầu">
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
        <FormField label="Trạng thái">
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
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={form.allowCtv}
          onChange={(e) => setForm((f) => ({ ...f, allowCtv: e.target.checked }))}
        />
        <span>Cho phép cộng tác viên (CTV) / sinh viên ngoài CLB đăng ký tham gia</span>
      </label>
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

export function UpdateParticipantModal({
  eventId,
  participant,
  onClose,
  onUpdated,
  onError,
}: {
  eventId: string;
  participant: EventRegistration | null;
  onClose: () => void;
  onUpdated: () => void;
  onError: (msg: string) => void;
}) {
  const [role, setRole] = useState(participant?.eventRole ?? "");
  const [status, setStatus] = useState<"REGISTERED" | "CANCELLED">(
    participant?.status === "CANCELLED" ? "CANCELLED" : "REGISTERED"
  );
  const [note, setNote] = useState(participant?.note ?? "");

  const updateParticipant = useMutation({
    mutationFn: () =>
      apiModel.updateEventRegistration(eventId, participant!.id, {
        eventRole: role.trim(),
        status,
        note: note.trim(),
      }),
    onSuccess: () => {
      onUpdated();
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <ModalShell
      open={!!participant}
      onClose={onClose}
      title="Phân vai trò & trạng thái nhân sự sự kiện"
      icon={<Settings2 />}
      size="sm"
      onSubmit={() => updateParticipant.mutate()}
      submitLabel="Lưu phân công"
      submitLoading={updateParticipant.isPending}
    >
      {participant && (
        <div className="space-y-3 text-sm">
          <p>
            Nhân sự: <b>{participant.userFullName || participant.userEmail || participant.userId}</b> (
            <StatusBadge status={participant.participantType} />)
          </p>
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Vai trò trong sự kiện chỉ áp dụng cho sự kiện này, không tự động kết nạp Cộng tác viên thành thành viên chính thức CLB.
          </p>
          <FormField label="Vai trò trong sự kiện" hint="Ví dụ: Ban Hậu cần, Lễ tân Check-in, Truyền thông…">
            <Input
              value={role}
              maxLength={100}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Nhập vai trò phân công…"
            />
          </FormField>
          <FormField label="Trạng thái tham gia">
            <Select value={status} onChange={(e) => setStatus(e.target.value as "REGISTERED" | "CANCELLED")}>
              <option value="REGISTERED">REGISTERED — Đang tham gia</option>
              <option value="CANCELLED">CANCELLED — Rút / Huỷ tham gia (tự trả việc sự kiện mở)</option>
            </Select>
          </FormField>
          <FormField label="Ghi chú">
            <Textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </div>
      )}
    </ModalShell>
  );
}

export function NotifyEventModal({
  selected,
  open,
  onClose,
  onNotified,
  onError,
}: {
  selected: ClubEvent | null;
  open: boolean;
  onClose: () => void;
  onNotified: (recipientCount: number) => void;
  onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState(selected ? `Thông báo sự kiện: ${selected.title}` : "");
  const [message, setMessage] = useState("");
  const [idempotencyKey] = useState(() => `ev-${selected?.id ?? "x"}-${Date.now()}`);

  const sendEventNotification = useMutation({
    mutationFn: () =>
      apiModel.notifyEventParticipants(selected!.id, {
        title: title.trim(),
        message: message.trim(),
        idempotencyKey,
      }),
    onSuccess: (res) => {
      onNotified(res.recipientCount);
      setMessage("");
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Gửi thông báo tới Member & CTV sự kiện"
      icon={<Bell />}
      size="sm"
      onSubmit={() => sendEventNotification.mutate()}
      submitLabel="Gửi thông báo"
      submitLoading={sendEventNotification.isPending}
      submitDisabled={!title.trim() || !message.trim()}
    >
      <p className="text-xs text-muted-foreground">
        Thông báo sẽ gửi đồng thời tới toàn bộ <b>Thành viên CLB</b> và <b>Cộng tác viên (CTV)</b> đang ở trạng thái{" "}
        <code>REGISTERED</code> của sự kiện <b>{selected?.title}</b>.
      </p>
      <FormField label="Tiêu đề thông báo" required>
        <Input
          value={title}
          maxLength={160}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Nhắc lịch tập trung & tổng duyệt sự kiện…"
        />
      </FormField>
      <FormField label="Nội dung chi tiết" required>
        <Textarea
          value={message}
          maxLength={2000}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nhập hướng dẫn thời gian, địa điểm, trang phục…"
        />
      </FormField>
    </ModalShell>
  );
}
