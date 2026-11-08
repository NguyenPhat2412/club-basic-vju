"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Eye, FilterX, Pencil, Plus } from "lucide-react";
import { apiModel, Department, Membership, TaskItem } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DataTable } from "@/components/shared/DataTable";
import { StatSummaryStrip } from "@/components/shared/StatCards";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { formatDay } from "@/lib/utils";
import {
  buildTaskAssigneeCandidates,
  EMPTY_TASK_FORM,
  TaskFormValues,
  toLocalInput,
} from "@/forms/task/task-form";
import {
  CreateTaskModal,
  EditTaskModal,
  NotifyTaskModal,
} from "@/components/task/TaskFormModals";
import { TaskDetailDrawer } from "@/components/task/TaskDetailDrawer";

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

  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TaskFormValues>(EMPTY_TASK_FORM);
  const [selected, setSelected] = useState<TaskItem | null>(null);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [notifyingTask, setNotifyingTask] = useState(false);

  const canCreate = session.canInClub("task.create", clubId);
  const createDeptScope = session.departmentsWith(["task.create"], clubId);
  const allowedCreateDepts = departments.filter((d) => createDeptScope.all || createDeptScope.ids.has(d.id));

  const filterParams = {
    departmentId: deptFilter || undefined,
    status: statusFilter || undefined,
    overdue: overdueOnly ? true : undefined,
  };

  const tasks = useQuery({
    queryKey: ["club-tasks", clubId, deptFilter, statusFilter, overdueOnly],
    queryFn: () => apiModel.clubTasks(clubId, filterParams),
    enabled: !!clubId,
  });

  const summary = useQuery({
    queryKey: ["club-task-summary", clubId, deptFilter, statusFilter, overdueOnly],
    queryFn: () => apiModel.clubTaskSummary(clubId, filterParams),
    enabled: !!clubId,
  });

  const clubEvents = useQuery({
    queryKey: ["club-events", clubId, "for-tasks"],
    queryFn: () => apiModel.clubEvents(clubId, { limit: 50 }),
    enabled: !!clubId && (creating || !!editingTask),
  });

  const activeEventIdForCandidates = creating ? form.eventId : editingTask?.eventId ?? "";
  const eventRegsForTask = useQuery({
    queryKey: ["event-registrations", activeEventIdForCandidates, "for-task-candidates"],
    queryFn: () => apiModel.eventRegistrations(activeEventIdForCandidates),
    enabled: !!activeEventIdForCandidates && (creating || !!editingTask),
  });

  const candidateAssignees = useMemo(
    () => buildTaskAssigneeCandidates(members, activeEventIdForCandidates, eventRegsForTask.data?.items),
    [members, activeEventIdForCandidates, eventRegsForTask.data?.items]
  );

  const parentTaskCandidates = useMemo(
    () =>
      (tasks.data?.items ?? []).filter(
        (t) => !t.parentTaskId && t.status !== "COMPLETED" && t.status !== "CANCELLED"
      ),
    [tasks.data?.items]
  );

  const subtasksOfSelected = useMemo(
    () => (selected ? (tasks.data?.items ?? []).filter((t) => t.parentTaskId === selected.id) : []),
    [selected, tasks.data?.items]
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["club-tasks", clubId] });
    queryClient.invalidateQueries({ queryKey: ["club-task-summary", clubId] });
    queryClient.invalidateQueries({ queryKey: ["club-statistics", clubId] });
    queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
  };

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

  const openCreateSubtask = (parent: TaskItem) => {
    setCreating(true);
    setForm({
      ...EMPTY_TASK_FORM,
      parentTaskId: parent.id,
      departmentId: parent.departmentId ?? "",
      eventId: parent.eventId ?? "",
      deadline: toLocalInput(parent.deadline),
    });
  };

  const canManageTask = (t: TaskItem) =>
    t.status !== "COMPLETED" &&
    t.status !== "CANCELLED" &&
    (session.canInDepartment("task.update", clubId, t.departmentId) ||
      session.canInDepartment("task.create", clubId, t.departmentId));

  const s = summary.data;

  return (
    <div className="space-y-3">
      {s && (
        <StatSummaryStrip
          columnsClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
          className="px-4 pt-3 sm:px-6"
          items={[
            { label: "Tổng khớp lọc", value: s.total },
            { label: "Chưa bắt đầu", value: s.todoCount },
            { label: "Đang thực hiện", value: s.inProgressCount, valueClassName: "text-amber-700" },
            { label: "Chờ nghiệm thu", value: s.doneCount, valueClassName: "text-primary" },
            { label: "Đã nghiệm thu", value: s.completedCount, valueClassName: "text-emerald-700" },
            { label: "Đang quá hạn", value: s.overdueCount, valueClassName: "text-rose-700" },
          ]}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-1 sm:px-6">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Select
            aria-label="Lọc ban chuyên môn"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="h-9 w-full text-xs sm:w-44"
          >
            <option value="">Tất cả ban / Toàn CLB</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Lọc trạng thái công việc"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-full text-xs sm:w-44"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="TODO">TODO — Chưa bắt đầu</option>
            <option value="IN_PROGRESS">IN_PROGRESS — Đang thực hiện</option>
            <option value="DONE">DONE — Chờ nghiệm thu</option>
            <option value="COMPLETED">COMPLETED — Đã nghiệm thu</option>
            <option value="CANCELLED">CANCELLED — Đã huỷ</option>
          </Select>
          <Button
            size="sm"
            variant={overdueOnly ? "destructive" : "outline"}
            onClick={() => setOverdueOnly((v) => !v)}
          >
            <AlertTriangle size={13} /> {overdueOnly ? "Đang lọc: Quá hạn" : "Chỉ việc quá hạn"}
          </Button>
          {(deptFilter || statusFilter || overdueOnly) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDeptFilter("");
                setStatusFilter("");
                setOverdueOnly(false);
              }}
            >
              <FilterX size={13} /> Xoá lọc
            </Button>
          )}
        </div>

        {canCreate && (
          <Button
            size="sm"
            onClick={() => {
              setCreating(true);
              setForm({
                ...EMPTY_TASK_FORM,
                departmentId: !createDeptScope.all && allowedCreateDepts[0] ? allowedCreateDepts[0].id : "",
              });
            }}
          >
            <Plus size={14} /> Giao công việc mới
          </Button>
        )}
      </div>

      {tasks.isPending ? (
        <LoadingRows />
      ) : tasks.isError ? (
        <ErrorState message={describeError(tasks.error)} onRetry={() => tasks.refetch()} />
      ) : !tasks.data.items.length ? (
        <EmptyState
          icon={<ClipboardCheck />}
          title={
            deptFilter || statusFilter || overdueOnly
              ? "Không có công việc khớp bộ lọc"
              : "Chưa có công việc nào trong CLB"
          }
          actionLabel={canCreate ? "Giao công việc đầu tiên" : undefined}
          onAction={canCreate ? () => setCreating(true) : undefined}
        />
      ) : (
        <DataTable
          ariaLabel="Danh sách công việc"
          rows={tasks.data.items}
          rowKey={(t) => t.id}
          onRowClick={setSelected}
          columns={[
            {
              key: "title",
              header: "Công việc",
              render: (t) => (
                <div className="min-w-0">
                  <p className="line-clamp-1 font-bold text-foreground">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.departmentName || "Toàn CLB"}
                    {t.eventTitle ? ` · Sự kiện: ${t.eventTitle}` : ""}
                    {t.parentTaskTitle ? ` · Việc con của: ${t.parentTaskTitle}` : ""}
                  </p>
                </div>
              ),
            },
            {
              key: "assignee",
              header: "Người thực hiện",
              render: (t) => <span className="font-semibold">{t.assigneeFullName || t.assigneeId.slice(0, 8)}</span>,
            },
            { key: "priority", header: "Mức ưu tiên", render: (t) => <StatusBadge status={t.priority} /> },
            {
              key: "progress",
              header: "Tiến độ",
              render: (t) => <span className="font-mono font-bold text-primary">{t.progressPercent}%</span>,
            },
            {
              key: "deadline",
              header: "Hạn chót",
              render: (t) => <span className="font-mono">{formatDay(t.deadline)}</span>,
            },
            {
              key: "status",
              header: "Trạng thái",
              render: (t) => (
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={t.status} />
                  {t.overdue && <StatusBadge status="OVERDUE" />}
                </div>
              ),
            },
            {
              key: "actions",
              header: "Thao tác",
              className: "text-right",
              render: (t) => {
                const canVerify =
                  t.status === "DONE" &&
                  t.assigneeId !== session.user?.id &&
                  session.canInDepartment("task.verify", clubId, t.departmentId);
                return (
                  <TableRowActions
                    actions={[
                      { icon: <Eye />, label: "Xem chi tiết", onClick: () => setSelected(t) },
                      ...(canManageTask(t)
                        ? [{ icon: <Pencil />, label: "Sửa / Giao lại", onClick: () => setEditingTask(t) }]
                        : []),
                      ...(canVerify
                        ? [{ icon: <CheckCircle2 />, label: "Nghiệm thu", onClick: () => verify.mutate(t.id) }]
                        : []),
                    ]}
                  />
                );
              },
            },
          ]}
        />
      )}

      <CreateTaskModal
        clubId={clubId}
        open={creating}
        onClose={() => setCreating(false)}
        form={form}
        setForm={setForm}
        createDeptScopeAll={createDeptScope.all}
        allowedCreateDepts={allowedCreateDepts}
        parentTaskCandidates={parentTaskCandidates}
        clubEvents={clubEvents.data?.items ?? []}
        candidateAssignees={candidateAssignees}
        onCreated={(task) => {
          onNotice(`Đã giao công việc "${task.title}".`);
          onError("");
          setForm(EMPTY_TASK_FORM);
          refresh();
        }}
        onError={onError}
      />

      <EditTaskModal
        key={editingTask?.id ?? "edit-none"}
        editingTask={editingTask}
        onClose={() => setEditingTask(null)}
        candidateAssignees={candidateAssignees}
        onSaved={(updated) => {
          onNotice(`Đã cập nhật công việc "${updated.title}".`);
          onError("");
          if (selected?.id === updated.id) setSelected(updated);
          refresh();
        }}
        onError={onError}
      />

      <NotifyTaskModal
        key={notifyingTask ? `notify-${selected?.id}` : "notify-closed"}
        selected={selected}
        open={notifyingTask}
        onClose={() => setNotifyingTask(false)}
        onNotified={(recipientCount) => {
          onNotice(`Đã gửi thông báo nhắc việc tới ${recipientCount} người phụ trách.`);
          onError("");
        }}
        onError={onError}
      />

      <TaskDetailDrawer
        key={selected?.id ?? "task-none"}
        clubId={clubId}
        selected={selected}
        subtasks={subtasksOfSelected}
        canCreate={canCreate}
        canManage={selected ? canManageTask(selected) : false}
        onClose={() => setSelected(null)}
        onOpenEdit={setEditingTask}
        onOpenNotify={() => setNotifyingTask(true)}
        onOpenCreateSubtask={openCreateSubtask}
        onUpdated={(updated) => {
          onNotice(`Đã cập nhật tiến độ "${updated.title}".`);
          onError("");
          setSelected(updated);
          refresh();
        }}
        onVerified={(updated) => {
          onNotice(`Đã nghiệm thu hoàn thành công việc "${updated.title}".`);
          onError("");
          setSelected(updated);
          refresh();
        }}
        onError={onError}
      />
    </div>
  );
}
