"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bell, ClipboardCheck, Pencil } from "lucide-react";
import { apiModel, ClubEvent, Department, TaskItem } from "@/lib/api";
import { ModalShell } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { formatDay } from "@/lib/utils";
import { TaskFormValues, toIso, toLocalInput } from "@/forms/task/task-form";

export function CreateTaskModal({
  clubId,
  open,
  onClose,
  form,
  setForm,
  createDeptScopeAll,
  allowedCreateDepts,
  parentTaskCandidates,
  clubEvents,
  candidateAssignees,
  onCreated,
  onError,
}: {
  clubId: string;
  open: boolean;
  onClose: () => void;
  form: TaskFormValues;
  setForm: React.Dispatch<React.SetStateAction<TaskFormValues>>;
  createDeptScopeAll: boolean;
  allowedCreateDepts: Department[];
  parentTaskCandidates: TaskItem[];
  clubEvents: ClubEvent[];
  candidateAssignees: { userId: string; label: string }[];
  onCreated: (task: TaskItem) => void;
  onError: (msg: string) => void;
}) {
  const create = useMutation({
    mutationFn: () =>
      apiModel.createTask(clubId, {
        title: form.title.trim(),
        departmentId: form.departmentId || undefined,
        eventId: form.eventId || undefined,
        parentTaskId: form.parentTaskId || undefined,
        priority: form.priority,
        deadline: toIso(form.deadline),
        assigneeId: form.assigneeId,
        description: form.description.trim() || undefined,
      }),
    onSuccess: (task) => {
      onCreated(task);
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={form.parentTaskId ? "Tạo công việc con (Subtask)" : "Giao công việc mới"}
      icon={<ClipboardCheck />}
      onSubmit={() => create.mutate()}
      submitLabel="Giao việc"
      submitLoading={create.isPending}
      submitDisabled={!form.title.trim() || !form.deadline || !form.assigneeId}
    >
      <FormField label="Tên công việc" required>
        <Input
          value={form.title}
          maxLength={200}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Ví dụ: Thiết kế ấn phẩm truyền thông sự kiện…"
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Thuộc công việc cha (Subtask - tuỳ chọn)">
          <Select
            value={form.parentTaskId}
            onChange={(e) => {
              const parent = parentTaskCandidates.find((p) => p.id === e.target.value);
              setForm((f) => ({
                ...f,
                parentTaskId: e.target.value,
                departmentId: parent?.departmentId ?? f.departmentId,
                eventId: parent?.eventId ?? f.eventId,
                deadline: parent ? toLocalInput(parent.deadline) : f.deadline,
              }));
            }}
          >
            <option value="">Không (Công việc độc lập)</option>
            {parentTaskCandidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} (Hạn {formatDay(p.deadline)})
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Gắn với sự kiện (hỗ trợ giao việc CTV)">
          <Select value={form.eventId} onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))}>
            <option value="">Không gắn sự kiện</option>
            {clubEvents
              .filter((ev) => ev.status !== "CANCELLED" && ev.status !== "COMPLETED")
              .map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.allowCtv ? "Có CTV" : "Nội bộ"})
                </option>
              ))}
          </Select>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Ban chuyên môn" required={!createDeptScopeAll}>
          <Select
            value={form.departmentId}
            onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
          >
            {createDeptScopeAll && <option value="">Toàn câu lạc bộ</option>}
            {allowedCreateDepts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Mức độ ưu tiên">
          <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
            <option value="LOW">Thấp</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="HIGH">Cao</option>
          </Select>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Người nhận việc"
          required
          hint={form.eventId ? "Hiển thị cả Thành viên CLB & CTV đã đăng ký sự kiện" : "Thành viên CLB đang hoạt động"}
        >
          <Select value={form.assigneeId} onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}>
            <option value="">Chọn người nhận…</option>
            {candidateAssignees.map((c) => (
              <option key={c.userId} value={c.userId}>
                {c.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Hạn hoàn thành" required>
          <Input
            type="datetime-local"
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
          />
        </FormField>
      </div>
      <FormField label="Mô tả yêu cầu">
        <Textarea
          value={form.description}
          maxLength={4000}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </FormField>
    </ModalShell>
  );
}

export function EditTaskModal({
  editingTask,
  onClose,
  candidateAssignees,
  onSaved,
  onError,
}: {
  editingTask: TaskItem | null;
  onClose: () => void;
  candidateAssignees: { userId: string; label: string }[];
  onSaved: (updated: TaskItem) => void;
  onError: (msg: string) => void;
}) {
  const [editTitle, setEditTitle] = useState(editingTask?.title ?? "");
  const [editPriority, setEditPriority] = useState(editingTask?.priority ?? "MEDIUM");
  const [editDeadline, setEditDeadline] = useState(toLocalInput(editingTask?.deadline));
  const [editAssigneeId, setEditAssigneeId] = useState(editingTask?.assigneeId ?? "");
  const [editStatus, setEditStatus] = useState(editingTask?.status ?? "");
  const [editDescription, setEditDescription] = useState(editingTask?.description ?? "");

  const saveTaskEdit = useMutation({
    mutationFn: () =>
      apiModel.updateTask(editingTask!.id, {
        title: editTitle.trim(),
        priority: editPriority,
        deadline: toIso(editDeadline),
        assigneeId: editAssigneeId,
        status: editStatus || undefined,
        description: editDescription.trim(),
      }),
    onSuccess: (updated) => {
      onSaved(updated);
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <ModalShell
      open={!!editingTask}
      onClose={onClose}
      title="Chỉnh sửa / Đổi người nhận / Mở lại công việc"
      icon={<Pencil />}
      onSubmit={() => saveTaskEdit.mutate()}
      submitLabel="Lưu cập nhật"
      submitLoading={saveTaskEdit.isPending}
      submitDisabled={!editTitle.trim() || !editDeadline || !editAssigneeId}
    >
      <FormField label="Tên công việc" required>
        <Input value={editTitle} maxLength={200} onChange={(e) => setEditTitle(e.target.value)} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Người nhận việc" required>
          <Select value={editAssigneeId} onChange={(e) => setEditAssigneeId(e.target.value)}>
            {candidateAssignees.map((c) => (
              <option key={c.userId} value={c.userId}>
                {c.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Hạn hoàn thành" required>
          <Input type="datetime-local" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Mức độ ưu tiên">
          <Select value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
            <option value="LOW">Thấp</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="HIGH">Cao</option>
          </Select>
        </FormField>
        <FormField label="Điều chỉnh trạng thái">
          <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
            <option value="TODO">TODO — Chưa bắt đầu</option>
            <option value="IN_PROGRESS">IN_PROGRESS — Đang thực hiện (Mở lại việc)</option>
            {editingTask?.status === "DONE" && <option value="DONE">DONE — Chờ nghiệm thu</option>}
            <option value="CANCELLED">CANCELLED — Huỷ công việc</option>
          </Select>
        </FormField>
      </div>
      <FormField label="Mô tả yêu cầu">
        <Textarea value={editDescription} maxLength={4000} onChange={(e) => setEditDescription(e.target.value)} />
      </FormField>
    </ModalShell>
  );
}

export function NotifyTaskModal({
  selected,
  open,
  onClose,
  onNotified,
  onError,
}: {
  selected: TaskItem | null;
  open: boolean;
  onClose: () => void;
  onNotified: (recipientCount: number) => void;
  onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState(selected ? `Trao đổi công việc: ${selected.title}` : "");
  const [message, setMessage] = useState("");
  const [includeSubtasks, setIncludeSubtasks] = useState(true);
  const [idempotencyKey] = useState(() => `task-${selected?.id ?? "x"}-${Date.now()}`);

  const sendTaskNotification = useMutation({
    mutationFn: () =>
      apiModel.notifyTaskAssignees(selected!.id, {
        title: title.trim(),
        message: message.trim(),
        includeSubtasks,
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
      title="Gửi thông báo trao đổi / nhắc việc"
      icon={<Bell />}
      size="sm"
      onSubmit={() => sendTaskNotification.mutate()}
      submitLabel="Gửi thông báo"
      submitLoading={sendTaskNotification.isPending}
      submitDisabled={!title.trim() || !message.trim()}
    >
      <FormField label="Tiêu đề" required>
        <Input value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
      </FormField>
      <FormField label="Nội dung nhắc việc / hướng dẫn" required>
        <Textarea value={message} maxLength={2000} onChange={(e) => setMessage(e.target.value)} />
      </FormField>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={includeSubtasks}
          onChange={(e) => setIncludeSubtasks(e.target.checked)}
        />
        <span>Đồng thời gửi cho người nhận các công việc con (Subtasks) đang mở</span>
      </label>
    </ModalShell>
  );
}
