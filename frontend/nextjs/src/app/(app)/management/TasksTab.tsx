"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, Eye, Plus, Send } from "lucide-react";
import { apiModel, Department, Membership, TaskItem } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";

const EMPTY_TASK = {
  title: "",
  departmentId: "",
  priority: "MEDIUM",
  deadline: "",
  assigneeId: "",
  description: "",
};

function toIso(localValue: string) {
  if (!localValue) return "";
  const d = new Date(localValue);
  return Number.isNaN(d.getTime()) ? localValue : d.toISOString();
}

export function TasksTab({
  clubId,
  departments,
  members,
  onNotice,
  onError,
}: {
  clubId: string;
  departments: Department[];
  members: Membership[];
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_TASK);
  const [selected, setSelected] = useState<TaskItem | null>(null);
  const [progressStatus, setProgressStatus] = useState("IN_PROGRESS");
  const [progressPercent, setProgressPercent] = useState(50);
  const [progressNote, setProgressNote] = useState("");
  const [reportLink, setReportLink] = useState("");

  const canCreate = session.canInClub("task.create", clubId);
  const createDeptScope = session.departmentsWith(["task.create"], clubId);
  const allowedCreateDepts = departments.filter((d) => createDeptScope.all || createDeptScope.ids.has(d.id));

  const tasks = useQuery({
    queryKey: ["club-tasks", clubId],
    queryFn: () => apiModel.clubTasks(clubId),
    enabled: !!clubId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["club-tasks", clubId] });
    queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
  };

  const create = useMutation({
    mutationFn: () =>
      apiModel.createTask(clubId, {
        title: form.title.trim(),
        departmentId: form.departmentId || undefined,
        priority: form.priority,
        deadline: toIso(form.deadline),
        assigneeId: form.assigneeId,
        description: form.description.trim() || undefined,
      }),
    onSuccess: (task) => {
      onNotice(`Đã giao công việc "${task.title}".`);
      onError("");
      setCreating(false);
      setForm(EMPTY_TASK);
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const updateProgress = useMutation({
    mutationFn: () =>
      apiModel.updateTaskProgress(selected!.id, {
        status: progressStatus,
        progressPercent,
        progressNote: progressNote.trim() || undefined,
        reportLink: reportLink.trim() || undefined,
      }),
    onSuccess: (updated) => {
      onNotice(`Đã cập nhật tiến độ "${updated.title}".`);
      onError("");
      setSelected(updated);
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const verify = useMutation({
    mutationFn: (taskId: string) => apiModel.verifyTask(taskId),
    onSuccess: (updated) => {
      onNotice(`Đã nghiệm thu hoàn thành công việc "${updated.title}".`);
      onError("");
      if (selected?.id === updated.id) setSelected(updated);
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const openTask = (t: TaskItem) => {
    setSelected(t);
    setProgressStatus(t.status === "COMPLETED" || t.status === "OVERDUE" ? "DONE" : t.status);
    setProgressPercent(t.progressPercent);
    setProgressNote(t.progressNote ?? "");
    setReportLink(t.reportLink ?? "");
  };

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end px-4 pt-2">
          <Button
            size="sm"
            onClick={() => {
              setCreating(true);
              setForm({
                ...EMPTY_TASK,
                departmentId: !createDeptScope.all && allowedCreateDepts[0] ? allowedCreateDepts[0].id : "",
              });
              create.reset();
            }}
          >
            <Plus size={14} /> Giao công việc mới
          </Button>
        </div>
      )}

      {tasks.isPending ? (
        <LoadingRows />
      ) : tasks.isError ? (
        <ErrorState message={describeError(tasks.error)} onRetry={() => tasks.refetch()} />
      ) : !tasks.data.items.length ? (
        <EmptyState
          icon={<ClipboardCheck />}
          title="Chưa có công việc nào trong CLB"
          actionLabel={canCreate ? "Giao công việc đầu tiên" : undefined}
          onAction={canCreate ? () => setCreating(true) : undefined}
        />
      ) : (
        <DataTable
          ariaLabel="Danh sách công việc"
          rows={tasks.data.items}
          rowKey={(t) => t.id}
          onRowClick={openTask}
          columns={[
            {
              key: "title",
              header: "Công việc",
              render: (t) => (
                <div>
                  <p className="font-bold text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.departmentName || "Toàn CLB"}</p>
                </div>
              ),
            },
            { key: "assignee", header: "Người thực hiện", render: (t) => <span className="font-semibold">{t.assigneeFullName || t.assigneeId.slice(0, 8)}</span> },
            { key: "priority", header: "Mức ưu tiên", render: (t) => <StatusBadge status={t.priority} /> },
            {
              key: "progress",
              header: "Tiến độ",
              render: (t) => <span className="font-mono font-bold text-primary">{t.progressPercent}%</span>,
            },
            { key: "deadline", header: "Hạn chót", render: (t) => <span className="font-mono">{formatDay(t.deadline)}</span> },
            { key: "status", header: "Trạng thái", render: (t) => <StatusBadge status={t.status} /> },
            {
              key: "actions",
              header: "Thao tác",
              className: "text-right",
              render: (t) => {
                const canVerify = t.status === "DONE" && session.canInDepartment("task.verify", clubId, t.departmentId);
                return (
                  <TableRowActions
                    actions={[
                      { icon: <Eye />, label: "Xem chi tiết", onClick: () => openTask(t) },
                      ...(canVerify ? [{ icon: <CheckCircle2 />, label: "Nghiệm thu", onClick: () => verify.mutate(t.id) }] : []),
                    ]}
                  />
                );
              },
            },
          ]}
        />
      )}

      <ModalShell
        open={creating}
        onClose={() => setCreating(false)}
        title="Giao công việc mới"
        icon={<ClipboardCheck />}
        onSubmit={() => create.mutate()}
        submitLabel="Giao việc"
        submitLoading={create.isPending}
        submitDisabled={!form.title.trim() || !form.deadline || !form.assigneeId}
      >
        <FormField label="Tên công việc" required>
          <Input value={form.title} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ví dụ: Thiết kế ấn phẩm truyền thông sự kiện…" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Ban chuyên môn" required={!createDeptScope.all}>
            <Select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
              {createDeptScope.all && <option value="">Toàn câu lạc bộ</option>}
              {allowedCreateDepts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
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
          <FormField label="Người nhận việc" required>
            <Select value={form.assigneeId} onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}>
              <option value="">Chọn thành viên…</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.userFullName || m.userStudentCode || m.userId.slice(0, 8)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Hạn hoàn thành" required>
            <Input type="datetime-local" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
          </FormField>
        </div>
        <FormField label="Mô tả yêu cầu">
          <Textarea value={form.description} maxLength={4000} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </FormField>
      </ModalShell>

      <EntityDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? "Chi tiết công việc"}
        subtitle={selected?.departmentName || "Toàn câu lạc bộ"}
        icon={<ClipboardCheck />}
        footer={
          selected && selected.status === "DONE" && session.canInDepartment("task.verify", clubId, selected.departmentId) ? (
            <Button size="sm" disabled={verify.isPending} onClick={() => verify.mutate(selected.id)}>
              <CheckCircle2 size={14} /> Nghiệm thu hoàn thành
            </Button>
          ) : undefined
        }
      >
        {selected && (
          <>
            <DetailList
              rows={[
                ["Trạng thái", <StatusBadge key="s" status={selected.status} />],
                ["Ưu tiên", <StatusBadge key="p" status={selected.priority} />],
                ["Tiến độ", `${selected.progressPercent}%`],
                ["Người nhận việc", selected.assigneeFullName || selected.assigneeId],
                ["Người giao việc", selected.assignerFullName || selected.assignerId],
                ["Hạn hoàn thành", formatDateTime(selected.deadline)],
                ["Ghi chú tiến độ", selected.progressNote || "—"],
                ["Link báo cáo", selected.reportLink ? <a key="r" href={selected.reportLink} target="_blank" rel="noreferrer" className="text-primary underline">{selected.reportLink}</a> : "—"],
                ["Mô tả", <p key="d" className="whitespace-pre-line">{selected.description || "—"}</p>],
              ]}
            />

            {selected.assigneeId === session.user?.id && selected.status !== "COMPLETED" && (
              <Section title="Cập nhật tiến độ của bạn" icon={<Send />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Trạng thái">
                    <Select value={progressStatus} onChange={(e) => {
                      const val = e.target.value;
                      setProgressStatus(val);
                      if (val === "DONE") setProgressPercent(100);
                    }}>
                      <option value="TODO">Chưa bắt đầu</option>
                      <option value="IN_PROGRESS">Đang thực hiện</option>
                      <option value="DONE">Hoàn thành (Chờ nghiệm thu)</option>
                    </Select>
                  </FormField>
                  <FormField label="Phần trăm hoàn thành (%)">
                    <Input type="number" min={0} max={100} value={progressPercent} onChange={(e) => setProgressPercent(Number(e.target.value))} />
                  </FormField>
                </div>
                <FormField label="Ghi chú tiến độ">
                  <Textarea value={progressNote} onChange={(e) => setProgressNote(e.target.value)} placeholder="Báo cáo ngắn gọn kết quả hoặc vướng mắc…" />
                </FormField>
                <FormField label="Đường dẫn báo cáo / sản phẩm (tuỳ chọn)">
                  <Input value={reportLink} onChange={(e) => setReportLink(e.target.value)} placeholder="https://…" />
                </FormField>
                <Button size="sm" className="justify-self-end" disabled={updateProgress.isPending} onClick={() => updateProgress.mutate()}>
                  <Send size={14} /> Lưu tiến độ
                </Button>
              </Section>
            )}
          </>
        )}
      </EntityDrawer>
    </div>
  );
}
