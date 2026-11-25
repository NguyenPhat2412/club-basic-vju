"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { AlertTriangle, Calendar, ClipboardCheck, Eye, FilterX, MapPin, Search, Send, X } from "lucide-react";
import { apiModel, ApplicationSummary, MyEventParticipation, TaskItem } from "@/lib/api";
import { SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";

type PersonalCalendarKind = "EVENT" | "TASK_DEADLINE" | "INTERVIEW";
type PersonalCalendarRow = { id: string; itemType: PersonalCalendarKind; clubName: string; title: string; location?: string; startTime: string; status: string };

const CAL_BADGE: Record<PersonalCalendarKind, { tone: "primary" | "pending" | "success"; label: string }> = {
  EVENT: { tone: "primary", label: "Sự kiện đã đăng ký" },
  TASK_DEADLINE: { tone: "pending", label: "Hạn công việc" },
  INTERVIEW: { tone: "success", label: "Lịch phỏng vấn" },
};

function buildPersonalCalendar(regs: MyEventParticipation[], tasks: TaskItem[], apps: ApplicationSummary[]): PersonalCalendarRow[] {
  const rows: PersonalCalendarRow[] = [
    ...regs.filter((ev) => Boolean(ev.startTime) && ev.registrationStatus === "REGISTERED" && ev.eventStatus !== "CANCELLED").map((ev) => ({
      id: ev.eventId, itemType: "EVENT" as const, clubName: ev.clubName, title: ev.eventTitle,
      location: ev.location, startTime: ev.startTime, status: ev.eventStatus,
    })),
    ...tasks.filter((t) => Boolean(t.deadline) && t.status !== "CANCELLED").map((t) => ({
      id: t.id, itemType: "TASK_DEADLINE" as const, clubName: t.clubName ?? "", title: t.title,
      location: t.departmentName || t.eventTitle, startTime: t.deadline!, status: t.status,
    })),
    ...apps.filter((a) => Boolean(a.interviewAt) && a.status !== "REJECTED" && a.status !== "CANCELLED").map((a) => ({
      id: a.id, itemType: "INTERVIEW" as const, clubName: a.clubName,
      title: `Phỏng vấn ứng tuyển${a.preferredDepartmentName ? ` · ${a.preferredDepartmentName}` : ""}`,
      location: a.interviewLocation, startTime: a.interviewAt!, status: a.status,
    })),
  ];
  return rows.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
}

export function ScheduleView() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"tasks" | "calendar">("tasks");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [calTypeFilter, setCalTypeFilter] = useState<"" | PersonalCalendarKind>("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [progressStatus, setProgressStatus] = useState("IN_PROGRESS");
  const [progressPercent, setProgressPercent] = useState(50);
  const [progressNote, setProgressNote] = useState("");
  const [reportLink, setReportLink] = useState("");
  const [notice, setNotice] = useState("");

  const myTasks = useQuery({
    queryKey: qk.myTasks(statusFilter, overdueOnly, offset, limit),
    queryFn: () => apiModel.myTasks({ status: statusFilter || undefined, overdue: overdueOnly ? true : undefined, offset, limit }),
  });
  const myRegs = useQuery({
    queryKey: qk.myEventRegistrations("schedule"),
    queryFn: () => apiModel.myEventRegistrations({ status: "REGISTERED", limit: 100 }),
    enabled: tab === "calendar",
  });
  const myCalTasks = useQuery({
    queryKey: qk.myTasks("schedule-calendar"),
    queryFn: () => apiModel.myTasks({ limit: 100 }),
    enabled: tab === "calendar",
  });
  const myApps = useQuery({
    queryKey: qk.myApplications("schedule"),
    queryFn: () => apiModel.myApplications({ limit: 100 }),
    enabled: tab === "calendar",
  });

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (myTasks.data?.items ?? []).filter((t) => {
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.clubName ?? "").toLowerCase().includes(q) ||
        (t.departmentName ?? "").toLowerCase().includes(q) ||
        (t.eventTitle ?? "").toLowerCase().includes(q)
      );
    });
  }, [myTasks.data?.items, search, priorityFilter]);

  const personalCalendar = useMemo(
    () => buildPersonalCalendar(myRegs.data?.items ?? [], myCalTasks.data?.items ?? [], myApps.data?.items ?? []),
    [myApps.data?.items, myCalTasks.data?.items, myRegs.data?.items],
  );

  const filteredCalendar = useMemo(() => {
    const q = search.trim().toLowerCase();
    return personalCalendar.filter((c) => {
      if (calTypeFilter && c.itemType !== calTypeFilter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.clubName.toLowerCase().includes(q) ||
        (c.location ?? "").toLowerCase().includes(q)
      );
    });
  }, [personalCalendar, search, calTypeFilter]);

  const hasFilters = Boolean(search.trim() || statusFilter || priorityFilter || calTypeFilter || overdueOnly);
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setCalTypeFilter("");
    setOverdueOnly(false);
    setOffset(0);
  };

  const updateProgress = useMutation({
    mutationFn: () =>
      apiModel.updateTaskProgress(selectedTask!.id, {
        status: progressStatus,
        progressPercent,
        progressNote: progressNote.trim() || undefined,
        reportLink: reportLink.trim() || undefined,
      }),
    onSuccess: (updated) => {
      setNotice(`Đã cập nhật tiến độ công việc "${updated.title}".`);
      setSelectedTask(updated);
      queryClient.invalidateQueries({ queryKey: qk.myTasks() });
      queryClient.invalidateQueries({ queryKey: qk.myCalendar() });
      queryClient.invalidateQueries({ queryKey: qk.dashboard() });
    },
  });

  const openTask = (t: TaskItem) => {
    setSelectedTask(t);
    setProgressStatus(
      t.status === "COMPLETED" || t.status === "CANCELLED" ? "DONE" : t.status,
    );
    setProgressPercent(t.progressPercent);
    setProgressNote(t.progressNote ?? "");
    setReportLink(t.reportLink ?? "");
    updateProgress.reset();
  };

  return (
    <ListPage title="Công việc & Lịch cá nhân">
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-1.5 border-b border-border bg-white px-3 py-1.5 sm:px-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <SegmentedTabs
            value={tab}
            onChange={(v) => { setTab(v); setOffset(0); }}
            options={[
              { value: "tasks", label: `Việc được giao (${myTasks.data?.total ?? 0})` },
              { value: "calendar", label: `Lịch cá nhân (${filteredCalendar.length})` },
            ]}
          />
          <div className="relative min-w-[160px] flex-1 sm:max-w-[220px]">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
              placeholder={tab === "tasks" ? "Tìm tên việc, CLB…" : "Tìm nội dung lịch, CLB…"}
              aria-label={tab === "tasks" ? "Tìm tên việc, CLB, sự kiện" : "Tìm nội dung lịch, CLB, địa điểm"}
              className="h-8 pl-8 pr-7 text-xs"
            />
            {search && (
              <button type="button" aria-label="Xoá tìm kiếm" onClick={() => { setSearch(""); setOffset(0); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>
          {tab === "tasks" ? (
            <>
              <Select aria-label="Lọc trạng thái công việc" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }} className="h-8 w-full text-xs sm:w-38">
                <option value="">Tất cả trạng thái</option>
                <option value="TODO">Chưa bắt đầu</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
                <option value="DONE">Chờ nghiệm thu</option>
                <option value="COMPLETED">Đã nghiệm thu</option>
                <option value="CANCELLED">Đã huỷ</option>
              </Select>
              <Select aria-label="Lọc độ ưu tiên" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="h-8 w-full text-xs sm:w-32">
                <option value="">Mọi ưu tiên</option>
                <option value="HIGH">Cao (HIGH)</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="LOW">Thấp (LOW)</option>
              </Select>
              <Button size="sm" variant={overdueOnly ? "destructive" : "outline"} className="h-8 px-2.5 text-xs" onClick={() => { setOverdueOnly((v) => !v); setOffset(0); }}>
                <AlertTriangle size={13} /> {overdueOnly ? "Quá hạn" : "Quá hạn"}
              </Button>
            </>
          ) : (
            <Select aria-label="Lọc loại mục lịch" value={calTypeFilter} onChange={(e) => setCalTypeFilter(e.target.value as "" | PersonalCalendarKind)} className="h-8 w-full text-xs sm:w-44">
              <option value="">Tất cả mục lịch</option>
              <option value="EVENT">Sự kiện đã đăng ký</option>
              <option value="TASK_DEADLINE">Hạn công việc</option>
              <option value="INTERVIEW">Lịch phỏng vấn</option>
            </Select>
          )}
          {hasFilters && (
            <Button size="sm" variant="outline" className="h-8" onClick={clearFilters}>
              <FilterX size={13} /> Xoá lọc
            </Button>
          )}
        </div>
      </div>
      {notice && <Notice tone="success">{notice}</Notice>}
      {updateProgress.error && <Notice tone="error">{describeError(updateProgress.error)}</Notice>}

      {tab === "tasks" ? (
        myTasks.isPending ? (
          <LoadingRows />
        ) : myTasks.isError ? (
          <ErrorState message={describeError(myTasks.error)} onRetry={() => myTasks.refetch()} />
        ) : !filteredTasks.length ? (
          <EmptyState
            icon={<ClipboardCheck />}
            title={hasFilters ? "Không có công việc khớp bộ lọc" : "Bạn chưa được giao công việc nào"}
            description="Các công việc từ câu lạc bộ, ban chuyên môn hoặc sự kiện (bao gồm vai trò CTV) sẽ hiển thị tại đây."
            actionLabel={hasFilters ? "Xoá bộ lọc" : undefined}
            onAction={hasFilters ? clearFilters : undefined}
          />
        ) : (
          <>
            <DataTable
              ariaLabel="Công việc của tôi"
              minWidth="min-w-[760px]"
              rows={filteredTasks}
              rowKey={(t) => t.id}
              onRowClick={openTask}
              columns={[
                {
                  key: "club",
                  header: "Câu lạc bộ / Nguồn",
                  sortValue: (t) => t.clubName ?? "",
                  render: (t) => (
                    <div>
                      <p className="font-bold">{t.clubName}</p>
                      <p className="text-xs text-muted-foreground">{t.eventTitle ? `Sự kiện: ${t.eventTitle}` : t.departmentName || t.clubCode}</p>
                    </div>
                  ),
                },
                {
                  key: "title",
                  header: "Công việc",
                  sortValue: (t) => t.title,
                  render: (t) => (
                    <div>
                      <p className="font-semibold text-foreground">{t.title}</p>
                      {t.parentTaskTitle && <p className="text-[11px] text-muted-foreground">Việc cha: {t.parentTaskTitle}</p>}
                    </div>
                  ),
                },
                { key: "priority", header: "Ưu tiên", sortValue: (t) => t.priority, render: (t) => <StatusBadge status={t.priority} /> },
                { key: "progress", header: "Tiến độ", sortValue: (t) => t.progressPercent, render: (t) => <span className="font-mono font-bold text-primary">{t.progressPercent}%</span> },
                { key: "deadline", header: "Hạn chót", sortValue: (t) => t.deadline ?? "", render: (t) => <span className="font-mono">{formatDay(t.deadline)}</span> },
                {
                  key: "status",
                  header: "Trạng thái",
                  sortValue: (t) => t.status,
                  render: (t) => <div className="flex flex-wrap items-center gap-1.5"><StatusBadge status={t.status} />{t.overdue && <StatusBadge status="OVERDUE" />}</div>,
                },
                {
                  key: "actions",
                  header: "Thao tác",
                  className: "text-right",
                  render: (t) => <TableRowActions actions={[{ icon: <Eye />, label: "Cập nhật tiến độ", onClick: () => openTask(t) }]} />,
                },
              ]}
            />
            {myTasks.data && <Pagination offset={offset} limit={limit} total={myTasks.data.total} onOffset={setOffset} onLimit={setLimit} />}
          </>
        )
      ) : myRegs.isPending || myCalTasks.isPending || myApps.isPending ? (
        <LoadingRows />
      ) : myRegs.isError || myCalTasks.isError || myApps.isError ? (
        <ErrorState message={describeError(myRegs.error ?? myCalTasks.error ?? myApps.error)} onRetry={() => { myRegs.refetch(); myCalTasks.refetch(); myApps.refetch(); }} />
      ) : !filteredCalendar.length ? (
        <EmptyState icon={<Calendar />} title={hasFilters ? "Không có mục lịch khớp bộ lọc" : "Chưa có sự kiện đã đăng ký, hạn công việc hoặc lịch phỏng vấn sắp tới"} actionLabel={hasFilters ? "Xoá bộ lọc" : undefined} onAction={hasFilters ? clearFilters : undefined} />
      ) : (
        <DataTable
          ariaLabel="Lịch tổng hợp cá nhân"
          minWidth="min-w-[720px]"
          rows={filteredCalendar}
          rowKey={(item) => `${item.itemType}-${item.id}`}
          columns={[
            { key: "time", header: "Thời gian", sortValue: (c) => c.startTime, render: (c) => <span className="font-mono font-bold text-primary">{formatDateTime(c.startTime)}</span> },
            { key: "type", header: "Loại", sortValue: (c) => c.itemType, render: (c) => <Badge tone={CAL_BADGE[c.itemType].tone} dot={false}>{CAL_BADGE[c.itemType].label}</Badge> },
            { key: "club", header: "Câu lạc bộ", sortValue: (c) => c.clubName, render: (c) => <span className="font-semibold">{c.clubName}</span> },
            { key: "title", header: "Nội dung", sortValue: (c) => c.title, render: (c) => <span className="font-bold text-foreground">{c.title}</span> },
            { key: "location", header: "Địa điểm", render: (c) => <span className="text-muted-foreground">{c.location ? <span className="inline-flex items-center gap-1"><MapPin size={12} /> {c.location}</span> : "—"}</span> },
            { key: "status", header: "Trạng thái", sortValue: (c) => c.status, render: (c) => <StatusBadge status={c.status} /> },
          ]}
        />
      )}

      <EntityDrawer
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.title ?? "Chi tiết công việc"}
        subtitle={selectedTask ? `${selectedTask.clubName}${selectedTask.departmentName ? ` · ${selectedTask.departmentName}` : ""}` : undefined}
        icon={<ClipboardCheck />}
      >
        {selectedTask && (
          <>
            <DetailList
              rows={[
                [
                  "Trạng thái",
                  <div key="s" className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={selectedTask.status} />
                    {selectedTask.overdue && <StatusBadge status="OVERDUE" />}
                  </div>,
                ],
                ["Ưu tiên", <StatusBadge key="p" status={selectedTask.priority} />],
                ["Tiến độ", `${selectedTask.progressPercent}%`],
                ["Người giao", selectedTask.assignerFullName || selectedTask.assignerId],
                ...(selectedTask.eventTitle ? ([["Sự kiện liên kết", selectedTask.eventTitle]] as [string, React.ReactNode][]) : []),
                ...(selectedTask.parentTaskTitle ? ([["Thuộc việc cha", selectedTask.parentTaskTitle]] as [string, React.ReactNode][]) : []),
                ["Hạn hoàn thành", formatDateTime(selectedTask.deadline)],
                ["Mô tả", <p key="d" className="whitespace-pre-line">{selectedTask.description || "—"}</p>],
              ]}
            />
            {selectedTask.status !== "COMPLETED" && selectedTask.status !== "CANCELLED" && (
              <Section title="Cập nhật tiến độ" icon={<Send />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Trạng thái" required>
                    <Select
                      value={progressStatus}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProgressStatus(val);
                        if (val === "DONE") setProgressPercent(100);
                        else if (val === "TODO") setProgressPercent(0);
                      }}
                    >
                      <option value="TODO">Chưa bắt đầu</option>
                      <option value="IN_PROGRESS">Đang thực hiện</option>
                      <option value="DONE">Hoàn thành (Chờ nghiệm thu)</option>
                    </Select>
                  </FormField>
                  <FormField label="Phần trăm hoàn thành (%)" required>
                    <Input type="number" min={0} max={100} step={1} value={progressPercent} onChange={(e) => setProgressPercent(Number(e.target.value))} />
                  </FormField>
                </div>
                <FormField label="Báo cáo tiến độ">
                  <Textarea maxLength={2000} value={progressNote} onChange={(e) => setProgressNote(e.target.value)} placeholder="Ghi chú kết quả thực hiện…" />
                </FormField>
                <FormField label="Đường dẫn sản phẩm / tài liệu">
                  <Input type="url" maxLength={1000} value={reportLink} onChange={(e) => setReportLink(e.target.value)} placeholder="https://…" />
                </FormField>
                <Button size="sm" className="justify-self-end" disabled={updateProgress.isPending} onClick={() => updateProgress.mutate()}>
                  <Send size={14} /> Lưu tiến độ
                </Button>
              </Section>
            )}
          </>
        )}
      </EntityDrawer>
    </ListPage>
  );
}
