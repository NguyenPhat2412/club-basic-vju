"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Eye, FilterX, Pencil, Plus, Search, X } from "lucide-react";
import { apiModel, Department, Membership, TaskItem } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { StatSummaryStrip } from "@/components/shared/StatCards";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
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
import { TaskScopeFilter, TaskScopeFilterValue } from "@/components/task/TaskScopeFilter";

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

  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<TaskScopeFilterValue>("ALL");
  const [deptFilter, setDeptFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TaskFormValues>(EMPTY_TASK_FORM);
  const [selected, setSelected] = useState<TaskItem | null>(null);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [notifyingTask, setNotifyingTask] = useState(false);

  const canCreate = session.canInClub("task.create", clubId);
  const createDeptScope = session.departmentsWith(["task.create"], clubId);
  const allowedCreateDepts = departments.filter((d) => createDeptScope.all || createDeptScope.ids.has(d.id));

  const clubWideOnly = scopeFilter === "CLUB_WIDE";
  const effectiveDeptFilter = scopeFilter === "DEPARTMENT" ? deptFilter : "";
  const hasClientFilter = Boolean(search.trim() || priorityFilter || (scopeFilter === "DEPARTMENT" && !deptFilter));
  const queryOffset = hasClientFilter ? 0 : offset;
  const queryLimit = hasClientFilter ? 100 : limit;

  const filterParams = {
    departmentId: effectiveDeptFilter || undefined,
    clubWideOnly: clubWideOnly || undefined,
    status: statusFilter || undefined,
    assigneeId: assigneeFilter || undefined,
    overdue: overdueOnly ? true : undefined,
    offset: queryOffset,
    limit: queryLimit,
  };

  const tasks = useQuery({
    queryKey: qk.clubTasks(clubId, scopeFilter, effectiveDeptFilter, statusFilter, assigneeFilter, overdueOnly, queryOffset, queryLimit),
    queryFn: () => apiModel.clubTasks(clubId, filterParams),
    placeholderData: keepPreviousData,
    enabled: !!clubId,
  });

  const summary = useQuery({
    queryKey: qk.clubTaskSummary(clubId, scopeFilter, effectiveDeptFilter, statusFilter, assigneeFilter, overdueOnly),
    queryFn: () =>
      apiModel.clubTaskSummary(clubId, {
        departmentId: effectiveDeptFilter || undefined,
        clubWideOnly: clubWideOnly || undefined,
        status: statusFilter || undefined,
        assigneeId: assigneeFilter || undefined,
        overdue: overdueOnly ? true : undefined,
      }),
    enabled: !!clubId,
  });

  const clubEvents = useQuery({
    queryKey: qk.clubEvents(clubId, "for-tasks"),
    queryFn: () => apiModel.clubEvents(clubId, { limit: 50 }),
    enabled: !!clubId && (creating || !!editingTask),
  });

  const activeEventIdForCandidates = creating ? form.eventId : editingTask?.eventId ?? "";
  const eventRegsForTask = useQuery({
    queryKey: qk.eventRegistrations(activeEventIdForCandidates, "for-task-candidates"),
    queryFn: () => apiModel.eventRegistrations(activeEventIdForCandidates),
    enabled: !!activeEventIdForCandidates && (creating || !!editingTask),
  });

  const candidateAssignees = useMemo(
    () => buildTaskAssigneeCandidates(members, activeEventIdForCandidates, eventRegsForTask.data?.items),
    [members, activeEventIdForCandidates, eventRegsForTask.data?.items]
  );

  const hasActiveFilter = Boolean(search.trim() || scopeFilter !== "ALL" || deptFilter || assigneeFilter || priorityFilter || statusFilter || overdueOnly);

  const allTasksForHierarchy = useQuery({
    queryKey: qk.clubTasks(clubId, "", "", false),
    queryFn: () => apiModel.clubTasks(clubId, { limit: 100 }),
    enabled: !!clubId && hasActiveFilter && (creating || !!selected),
  });

  const hierarchySource = useMemo(
    () => (hasActiveFilter ? (allTasksForHierarchy.data?.items ?? tasks.data?.items ?? []) : (tasks.data?.items ?? [])),
    [hasActiveFilter, allTasksForHierarchy.data?.items, tasks.data?.items]
  );

  const parentTaskCandidates = useMemo(
    () => hierarchySource.filter((t) => !t.parentTaskId && t.status !== "COMPLETED" && t.status !== "CANCELLED"),
    [hierarchySource]
  );

  const subtasksOfSelected = useMemo(
    () => (selected ? hierarchySource.filter((t) => t.parentTaskId === selected.id) : []),
    [selected, hierarchySource]
  );

  const rawItems = useMemo(() => tasks.data?.items ?? [], [tasks.data?.items]);
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rawItems.filter((t) => {
      if (scopeFilter === "DEPARTMENT" && !deptFilter && !t.departmentId) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.assigneeFullName ?? "").toLowerCase().includes(q) ||
        (t.departmentName ?? "").toLowerCase().includes(q)
      );
    });
  }, [rawItems, scopeFilter, deptFilter, search, priorityFilter]);

  const visibleRows = hasClientFilter ? filteredItems.slice(offset, offset + limit) : filteredItems;
  const effectiveTotal = hasClientFilter ? filteredItems.length : (tasks.data?.total ?? 0);

  const resetFilters = () => {
    setSearch(""); setScopeFilter("ALL"); setDeptFilter(""); setAssigneeFilter("");
    setPriorityFilter(""); setStatusFilter(""); setOverdueOnly(false); setOffset(0);
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.clubTasks(clubId) });
    queryClient.invalidateQueries({ queryKey: qk.clubTaskSummary(clubId) });
    queryClient.invalidateQueries({ queryKey: qk.clubStatistics(clubId) });
    queryClient.invalidateQueries({ queryKey: qk.myTasks() });
    queryClient.invalidateQueries({ queryKey: qk.dashboard("my-tasks") });
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
    <div className="flex flex-1 flex-col">
      {s && (
        <StatSummaryStrip
          columnsClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
          className="px-4 pt-3 sm:px-6"
          items={[
            { label: "Tổng khớp lọc", value: s.total },
            { label: "Chưa bắt đầu", value: s.todoCount },
            { label: "Đang thực hiện", value: s.inProgressCount },
            { label: "Chờ nghiệm thu", value: s.doneCount, valueClassName: "text-primary" },
            { label: "Đã nghiệm thu", value: s.completedCount, valueClassName: "text-primary" },
            { label: "Đang quá hạn", value: s.overdueCount, valueClassName: "text-destructive" },
          ]}
        />
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-y border-border/60 bg-card px-4 py-2.5 sm:px-6">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[190px] flex-1 sm:max-w-[240px]">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
              placeholder="Tìm tên công việc…"
              className="h-8 pl-8 pr-7 text-xs"
            />
            {search && (
              <button type="button" aria-label="Xoá tìm kiếm" onClick={() => { setSearch(""); setOffset(0); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>

          <TaskScopeFilter
            scope={scopeFilter} departmentId={deptFilter} departments={departments}
            onChangeScope={(next) => { setScopeFilter(next); if (next !== "DEPARTMENT") setDeptFilter(""); setOffset(0); }}
            onChangeDepartment={(id) => { setDeptFilter(id); setOffset(0); }}
          />

          {members.length > 0 && (
            <Select aria-label="Lọc người thực hiện" value={assigneeFilter} onChange={(e) => { setAssigneeFilter(e.target.value); setOffset(0); }} className="h-8 w-full text-xs sm:w-44">
              <option value="">Mọi người nhận</option>
              {members.map((m) => <option key={m.userId} value={m.userId}>{m.userFullName || m.userId.slice(0, 8)}</option>)}
            </Select>
          )}

          <Select aria-label="Lọc mức ưu tiên" value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setOffset(0); }} className="h-8 w-full text-xs sm:w-36">
            <option value="">Mọi ưu tiên</option>
            <option value="HIGH">Cao (HIGH)</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="LOW">Thấp (LOW)</option>
          </Select>

          <Select aria-label="Lọc trạng thái công việc" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }} className="h-8 w-full text-xs sm:w-44">
            <option value="">Tất cả trạng thái</option>
            <option value="TODO">Chưa bắt đầu</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="DONE">Chờ nghiệm thu</option>
            <option value="COMPLETED">Đã nghiệm thu</option>
            <option value="CANCELLED">Đã huỷ</option>
          </Select>

          <Button size="sm" variant={overdueOnly ? "destructive" : "outline"} onClick={() => { setOverdueOnly((v) => !v); setOffset(0); }} className="h-8">
            <AlertTriangle size={13} /> {overdueOnly ? "Đang lọc: Quá hạn" : "Quá hạn"}
          </Button>

          {hasActiveFilter && (
            <Button size="sm" variant="outline" onClick={resetFilters} className="h-8">
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
            className="h-8"
          >
            <Plus size={14} /> Giao công việc
          </Button>
        )}
      </div>

      {tasks.isPending ? (
        <LoadingRows />
      ) : tasks.isError ? (
        <ErrorState message={describeError(tasks.error)} onRetry={() => tasks.refetch()} />
      ) : !visibleRows.length ? (
        <EmptyState
          icon={<ClipboardCheck />}
          title={hasActiveFilter ? "Không có công việc khớp bộ lọc" : "Chưa có công việc nào trong CLB"}
          actionLabel={hasActiveFilter ? "Xoá bộ lọc" : canCreate ? "Giao công việc đầu tiên" : undefined}
          onAction={hasActiveFilter ? resetFilters : canCreate ? () => setCreating(true) : undefined}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Danh sách công việc"
            minWidth="min-w-[800px]"
            rows={visibleRows}
            rowKey={(t) => t.id}
            onRowClick={setSelected}
            columns={[
              { key: "index", header: "STT", className: "w-10 text-center font-mono text-muted-foreground", render: (t) => <span>{offset + visibleRows.indexOf(t) + 1}</span> },
              {
                key: "title", header: "Công việc", className: "min-w-[220px] max-w-[310px]", sortValue: (t) => t.title,
                render: (t) => (
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground" title={t.title}>{t.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {t.departmentName || "Công việc chung toàn CLB"}{t.eventTitle ? ` · ${t.eventTitle}` : ""}{t.parentTaskTitle ? ` · Việc con: ${t.parentTaskTitle}` : ""}
                    </p>
                  </div>
                ),
              },
              { key: "assignee", header: "Người thực hiện", className: "whitespace-nowrap", sortValue: (t) => t.assigneeFullName ?? "", render: (t) => <span className="font-semibold">{t.assigneeFullName || t.assigneeId.slice(0, 8)}</span> },
              { key: "priority", header: "Ưu tiên", className: "whitespace-nowrap", sortValue: (t) => t.priority, render: (t) => <StatusBadge status={t.priority} /> },
              { key: "progress", header: "Tiến độ", className: "whitespace-nowrap", sortValue: (t) => t.progressPercent, render: (t) => <span className="font-mono font-bold text-primary">{t.progressPercent}%</span> },
              { key: "deadline", header: "Hạn chót", className: "whitespace-nowrap font-mono", sortValue: (t) => t.deadline ?? "", render: (t) => <span>{formatDay(t.deadline)}</span> },
              {
                key: "status", header: "Trạng thái", className: "whitespace-nowrap", sortValue: (t) => t.status,
                render: (t) => <div className="flex flex-wrap items-center gap-1"><StatusBadge status={t.status} />{t.overdue && <StatusBadge status="OVERDUE" />}</div>,
              },
              {
                key: "actions",
                header: "Thao tác",
                className: "text-right whitespace-nowrap",
                render: (t) => {
                  const canVerify =
                    t.status === "DONE" &&
                    t.assigneeId !== session.user?.id &&
                    session.canInDepartment("task.verify", clubId, t.departmentId);
                  return (
                    <TableRowActions
                      actions={[
                        { icon: <Eye />, label: "Xem chi tiết", onClick: () => setSelected(t) },
                        ...(canManageTask(t) ? [{ icon: <Pencil />, label: "Sửa / Giao lại", onClick: () => setEditingTask(t) }] : []),
                        ...(canVerify ? [{ icon: <CheckCircle2 />, label: "Nghiệm thu", onClick: () => verify.mutate(t.id) }] : []),
                      ]}
                    />
                  );
                },
              },
            ]}
          />
          <Pagination offset={offset} limit={limit} total={effectiveTotal} onOffset={setOffset} onLimit={setLimit} />
        </>
      )}

      <CreateTaskModal
        clubId={clubId} open={creating} onClose={() => setCreating(false)} form={form} setForm={setForm}
        createDeptScopeAll={createDeptScope.all} allowedCreateDepts={allowedCreateDepts}
        parentTaskCandidates={parentTaskCandidates} clubEvents={clubEvents.data?.items ?? []}
        candidateAssignees={candidateAssignees}
        onCreated={(task) => { onNotice(`Đã giao công việc "${task.title}".`); onError(""); setForm(EMPTY_TASK_FORM); refresh(); }}
        onError={onError}
      />

      <EditTaskModal
        key={editingTask?.id ?? "edit-none"} editingTask={editingTask} onClose={() => setEditingTask(null)}
        candidateAssignees={candidateAssignees}
        onSaved={(updated) => { onNotice(`Đã cập nhật công việc "${updated.title}".`); onError(""); if (selected?.id === updated.id) setSelected(updated); refresh(); }}
        onError={onError}
      />

      <NotifyTaskModal
        key={notifyingTask ? `notify-${selected?.id}` : "notify-closed"} selected={selected} open={notifyingTask}
        onClose={() => setNotifyingTask(false)}
        onNotified={(cnt) => { onNotice(`Đã gửi thông báo nhắc việc tới ${cnt} người phụ trách.`); onError(""); }}
        onError={onError}
      />

      <TaskDetailDrawer
        key={selected?.id ?? "task-none"} clubId={clubId} selected={selected} subtasks={subtasksOfSelected}
        canCreate={canCreate} canManage={selected ? canManageTask(selected) : false}
        onClose={() => setSelected(null)} onOpenEdit={setEditingTask}
        onOpenNotify={() => setNotifyingTask(true)} onOpenCreateSubtask={openCreateSubtask}
        onUpdated={(updated) => { onNotice(`Đã cập nhật tiến độ "${updated.title}".`); onError(""); setSelected(updated); refresh(); }}
        onVerified={(updated) => { onNotice(`Đã nghiệm thu hoàn thành công việc "${updated.title}".`); onError(""); setSelected(updated); refresh(); }}
        onError={onError}
      />
    </div>
  );
}
