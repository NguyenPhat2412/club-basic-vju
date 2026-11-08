"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bell, CheckCircle2, ClipboardCheck, GitBranch, Pencil, Send } from "lucide-react";
import { apiModel, TaskItem } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";

export function TaskDetailDrawer({
  clubId,
  selected,
  subtasks,
  canCreate,
  canManage,
  onClose,
  onOpenEdit,
  onOpenNotify,
  onOpenCreateSubtask,
  onUpdated,
  onVerified,
  onError,
}: {
  clubId: string;
  selected: TaskItem | null;
  subtasks: TaskItem[];
  canCreate: boolean;
  canManage: boolean;
  onClose: () => void;
  onOpenEdit: (task: TaskItem) => void;
  onOpenNotify: () => void;
  onOpenCreateSubtask: (parent: TaskItem) => void;
  onUpdated: (updated: TaskItem) => void;
  onVerified: (updated: TaskItem) => void;
  onError: (msg: string) => void;
}) {
  const session = useSession();
  const [progressStatus, setProgressStatus] = useState(
    selected?.status === "COMPLETED" || selected?.status === "CANCELLED" ? "DONE" : selected?.status ?? "IN_PROGRESS"
  );
  const [progressPercent, setProgressPercent] = useState(selected?.progressPercent ?? 50);
  const [progressNote, setProgressNote] = useState(selected?.progressNote ?? "");
  const [reportLink, setReportLink] = useState(selected?.reportLink ?? "");

  const updateProgress = useMutation({
    mutationFn: () =>
      apiModel.updateTaskProgress(selected!.id, {
        status: progressStatus,
        progressPercent,
        progressNote: progressNote.trim() || undefined,
        reportLink: reportLink.trim() || undefined,
      }),
    onSuccess: (updated) => onUpdated(updated),
    onError: (e) => onError(describeError(e)),
  });

  const verify = useMutation({
    mutationFn: (taskId: string) => apiModel.verifyTask(taskId),
    onSuccess: (updated) => onVerified(updated),
    onError: (e) => onError(describeError(e)),
  });

  return (
    <EntityDrawer
      open={!!selected}
      onClose={onClose}
      title={selected?.title ?? "Chi tiết công việc"}
      subtitle={selected?.departmentName || "Toàn câu lạc bộ"}
      icon={<ClipboardCheck />}
      footer={
        selected ? (
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <>
                <Button size="sm" variant="outline" onClick={onOpenNotify}>
                  <Bell size={14} /> Nhắc việc
                </Button>
                <Button size="sm" variant="outline" onClick={() => onOpenEdit(selected)}>
                  <Pencil size={14} /> Sửa / Mở lại
                </Button>
              </>
            )}
            {!selected.parentTaskId &&
              canCreate &&
              selected.status !== "COMPLETED" &&
              selected.status !== "CANCELLED" && (
                <Button size="sm" variant="outline" onClick={() => onOpenCreateSubtask(selected)}>
                  <GitBranch size={14} /> + Việc con
                </Button>
              )}
            {selected.status === "DONE" &&
              selected.assigneeId !== session.user?.id &&
              session.canInDepartment("task.verify", clubId, selected.departmentId) && (
                <Button size="sm" disabled={verify.isPending} onClick={() => verify.mutate(selected.id)}>
                  <CheckCircle2 size={14} /> Nghiệm thu hoàn thành
                </Button>
              )}
          </div>
        ) : undefined
      }
    >
      {selected && (
        <>
          <DetailList
            rows={[
              [
                "Trạng thái",
                <div key="s" className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={selected.status} />
                  {selected.overdue && <StatusBadge status="OVERDUE" />}
                </div>,
              ],
              ["Ưu tiên", <StatusBadge key="p" status={selected.priority} />],
              ["Tiến độ", `${selected.progressPercent}%`],
              ["Người nhận việc", selected.assigneeFullName || selected.assigneeId],
              ["Người giao việc", selected.assignerFullName || selected.assignerId],
              ...(selected.eventTitle ? ([["Sự kiện liên kết", selected.eventTitle]] as [string, React.ReactNode][]) : []),
              ...(selected.parentTaskTitle
                ? ([["Thuộc công việc cha", selected.parentTaskTitle]] as [string, React.ReactNode][])
                : []),
              ["Hạn hoàn thành", formatDateTime(selected.deadline)],
              ["Ghi chú tiến độ", selected.progressNote || "—"],
              [
                "Link báo cáo",
                selected.reportLink ? (
                  <a
                    key="r"
                    href={selected.reportLink}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-primary underline"
                  >
                    {selected.reportLink}
                  </a>
                ) : (
                  "—"
                ),
              ],
              ["Mô tả", <p key="d" className="whitespace-pre-line">{selected.description || "—"}</p>],
            ]}
          />

          {subtasks.length > 0 && (
            <Section title={`Công việc con (${subtasks.length})`} icon={<GitBranch />}>
              <ul className="divide-y divide-border/60 rounded-lg border border-border">
                {subtasks.map((sub) => (
                  <li
                    key={sub.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-muted/40"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{sub.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {sub.assigneeFullName || sub.assigneeId.slice(0, 8)} · Hạn {formatDay(sub.deadline)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge tone="neutral" dot={false}>
                        {sub.progressPercent}%
                      </Badge>
                      <StatusBadge status={sub.status} />
                      {sub.overdue && <StatusBadge status="OVERDUE" />}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {selected.assigneeId === session.user?.id &&
            selected.status !== "COMPLETED" &&
            selected.status !== "CANCELLED" && (
              <Section title="Cập nhật tiến độ của bạn" icon={<Send />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Trạng thái">
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
                  <FormField label="Phần trăm hoàn thành (%)">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={progressPercent}
                      onChange={(e) => setProgressPercent(Number(e.target.value))}
                    />
                  </FormField>
                </div>
                <FormField label="Ghi chú tiến độ">
                  <Textarea
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    placeholder="Báo cáo ngắn gọn kết quả hoặc vướng mắc…"
                  />
                </FormField>
                <FormField label="Đường dẫn báo cáo / sản phẩm (tuỳ chọn)">
                  <Input
                    value={reportLink}
                    onChange={(e) => setReportLink(e.target.value)}
                    placeholder="https://…"
                  />
                </FormField>
                <Button
                  size="sm"
                  className="justify-self-end"
                  disabled={updateProgress.isPending}
                  onClick={() => updateProgress.mutate()}
                >
                  <Send size={14} /> Lưu tiến độ
                </Button>
              </Section>
            )}
        </>
      )}
    </EntityDrawer>
  );
}
