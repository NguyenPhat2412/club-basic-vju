"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bell, Settings2 } from "lucide-react";
import { apiModel, ClubEvent, EventParticipantRole, EventRegistration } from "@/lib/api";
import { ModalShell } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { StatusBadge } from "@/components/ui/badge";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";

function toParticipantRole(value?: string | null): EventParticipantRole {
  if (value === "ORGANIZER" || value === "CTV" || value === "ATTENDEE" || value === "MEMBER") return value;
  return "ATTENDEE";
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
  const [participantType, setParticipantType] = useState<EventParticipantRole>(() =>
    toParticipantRole(participant?.participantType)
  );
  const [role, setRole] = useState(participant?.eventRole ?? "");
  const [status, setStatus] = useState<"REGISTERED" | "CANCELLED">(
    participant?.status === "CANCELLED" ? "CANCELLED" : "REGISTERED"
  );
  const [note, setNote] = useState(participant?.note ?? "");

  const updateParticipant = useMutation({
    mutationFn: () =>
      apiModel.updateEventRegistration(eventId, participant!.id, {
        participantType,
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
            <StatusBadge status={participantType} />)
          </p>
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Vai trò trong sự kiện chỉ áp dụng cho sự kiện này, không tự động kết nạp Cộng tác viên thành thành viên chính thức CLB.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Tư cách tham gia" required>
              <Select
                value={participantType}
                onChange={(e) => setParticipantType(e.target.value as EventParticipantRole)}
              >
                <option value="MEMBER">Thành viên CLB (MEMBER)</option>
                <option value="ORGANIZER">Ban tổ chức (ORGANIZER)</option>
                <option value="CTV">Cộng tác viên (CTV)</option>
                <option value="ATTENDEE">Người tham dự (ATTENDEE)</option>
              </Select>
            </FormField>
            <FormField label="Vai trò phân công" hint="VD: Hậu cần, Check-in, Truyền thông…">
              <Input
                value={role}
                maxLength={100}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Nhập vai trò phân công…"
              />
            </FormField>
          </div>
          <FormField label="Trạng thái tham gia" required>
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
