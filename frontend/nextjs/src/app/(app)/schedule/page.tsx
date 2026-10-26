"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, ClipboardCheck, Eye, MapPin, Send } from "lucide-react";
import { apiModel, TaskItem } from "@/lib/api";
import { BreadcrumbToolbar, SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"tasks" | "calendar">("tasks");
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [progressStatus, setProgressStatus] = useState("IN_PROGRESS");
  const [progressPercent, setProgressPercent] = useState(50);
  const [progressNote, setProgressNote] = useState("");
  const [reportLink, setReportLink] = useState("");
  const [notice, setNotice] = useState("");

  const myTasks = useQuery({ queryKey: ["my-tasks"], queryFn: () => apiModel.myTasks() });
  const myCalendar = useQuery({ queryKey: ["my-calendar"], queryFn: () => apiModel.myCalendar(), enabled: tab === "calendar" });

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
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-calendar"] });
    },
  });

  const openTask = (t: TaskItem) => {
    setSelectedTask(t);
    setProgressStatus(t.status === "COMPLETED" || t.status === "OVERDUE" ? "DONE" : t.status);
    setProgressPercent(t.progressPercent);
    setProgressNote(t.progressNote ?? "");
    setReportLink(t.reportLink ?? "");
    updateProgress.reset();
  };

  return (
    <ListPage title="Lịch & Công việc của tôi">
      <BreadcrumbToolbar
        crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Cá nhân" }, { label: "Lịch & Công việc" }]}
        titleBadge={<CountBadge>{tab === "tasks" ? `${myTasks.data?.total ?? 0} việc` : `${myCalendar.data?.length ?? 0} mục lịch`}</CountBadge>}
        extraActions={
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "tasks", label: "Việc được giao" },
              { value: "calendar", label: "Lịch tổng hợp" },
            ]}
          />
        }
        onRefresh={() => {
          myTasks.refetch();
          if (tab === "calendar") myCalendar.refetch();
        }}
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      {updateProgress.error && <Notice tone="error">{describeError(updateProgress.error)}</Notice>}

      {tab === "tasks" ? (
        myTasks.isPending ? (
          <LoadingRows />
        ) : myTasks.isError ? (
          <ErrorState message={describeError(myTasks.error)} onRetry={() => myTasks.refetch()} />
        ) : !myTasks.data.items.length ? (
          <EmptyState icon={<ClipboardCheck />} title="Bạn chưa được giao công việc nào" description="Các công việc từ câu lạc bộ và ban chuyên môn sẽ hiển thị tại đây." />
        ) : (
          <DataTable
            ariaLabel="Công việc của tôi"
            rows={myTasks.data.items}
            rowKey={(t) => t.id}
            onRowClick={openTask}
            columns={[
              {
                key: "club",
                header: "Câu lạc bộ / Ban",
                render: (t) => (
                  <div>
                    <p className="font-bold">{t.clubName}</p>
                    <p className="text-xs text-muted-foreground">{t.departmentName || t.clubCode}</p>
                  </div>
                ),
              },
              { key: "title", header: "Công việc", render: (t) => <span className="font-semibold text-foreground">{t.title}</span> },
              { key: "priority", header: "Ưu tiên", render: (t) => <StatusBadge status={t.priority} /> },
              { key: "progress", header: "Tiến độ", render: (t) => <span className="font-mono font-bold text-primary">{t.progressPercent}%</span> },
              { key: "deadline", header: "Hạn chót", render: (t) => <span className="font-mono">{formatDay(t.deadline)}</span> },
              { key: "status", header: "Trạng thái", render: (t) => <StatusBadge status={t.status} /> },
              {
                key: "actions",
                header: "Thao tác",
                className: "text-right",
                render: (t) => <TableRowActions actions={[{ icon: <Eye />, label: "Cập nhật tiến độ", onClick: () => openTask(t) }]} />,
              },
            ]}
          />
        )
      ) : myCalendar.isPending ? (
        <LoadingRows />
      ) : myCalendar.isError ? (
        <ErrorState message={describeError(myCalendar.error)} onRetry={() => myCalendar.refetch()} />
      ) : !myCalendar.data.length ? (
        <EmptyState icon={<Calendar />} title="Chưa có sự kiện hoặc hạn công việc sắp tới" />
      ) : (
        <DataTable
          ariaLabel="Lịch tổng hợp cá nhân"
          rows={myCalendar.data}
          rowKey={(item) => `${item.itemType}-${item.id}`}
          columns={[
            { key: "time", header: "Thời gian", render: (c) => <span className="font-mono font-bold text-primary">{formatDateTime(c.startTime)}</span> },
            {
              key: "type",
              header: "Loại",
              render: (c) => <Badge tone={c.itemType === "EVENT" ? "primary" : "pending"} dot={false}>{c.itemType === "EVENT" ? "Sự kiện CLB" : "Hạn công việc"}</Badge>,
            },
            { key: "club", header: "Câu lạc bộ", render: (c) => <span className="font-semibold">{c.clubName}</span> },
            { key: "title", header: "Nội dung", render: (c) => <span className="font-bold text-foreground">{c.title}</span> },
            { key: "location", header: "Địa điểm", render: (c) => <span className="text-muted-foreground">{c.location ? <span className="inline-flex items-center gap-1"><MapPin size={12} /> {c.location}</span> : "—"}</span> },
            { key: "status", header: "Trạng thái", render: (c) => <StatusBadge status={c.status} /> },
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
                ["Trạng thái", <StatusBadge key="s" status={selectedTask.status} />],
                ["Ưu tiên", <StatusBadge key="p" status={selectedTask.priority} />],
                ["Tiến độ", `${selectedTask.progressPercent}%`],
                ["Người giao", selectedTask.assignerFullName || selectedTask.assignerId],
                ["Hạn hoàn thành", formatDateTime(selectedTask.deadline)],
                ["Mô tả", <p key="d" className="whitespace-pre-line">{selectedTask.description || "—"}</p>],
              ]}
            />
            {selectedTask.status !== "COMPLETED" && (
              <Section title="Cập nhật tiến độ" icon={<Send />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Trạng thái">
                    <Select
                      value={progressStatus}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProgressStatus(val);
                        if (val === "DONE") setProgressPercent(100);
                      }}
                    >
                      <option value="TODO">Chưa bắt đầu</option>
                      <option value="IN_PROGRESS">Đang thực hiện</option>
                      <option value="DONE">Hoàn thành (Chờ nghiệm thu)</option>
                    </Select>
                  </FormField>
                  <FormField label="Phần trăm hoàn thành (%)">
                    <Input type="number" min={0} max={100} value={progressPercent} onChange={(e) => setProgressPercent(Number(e.target.value))} />
                  </FormField>
                </div>
                <FormField label="Báo cáo tiến độ">
                  <Textarea value={progressNote} onChange={(e) => setProgressNote(e.target.value)} placeholder="Ghi chú kết quả thực hiện…" />
                </FormField>
                <FormField label="Đường dẫn sản phẩm / tài liệu">
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
    </ListPage>
  );
}
