"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Eye, FilterX, Pencil, Plus } from "lucide-react";
import { apiModel, ClubEvent, Department, EventRegistration } from "@/lib/api";
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
  EMPTY_EVENT_FORM,
  EVENT_TYPE_LABELS,
  EventFormValues,
  toLocalInput,
} from "@/forms/event/event-form";
import {
  NotifyEventModal,
  UpdateParticipantModal,
  UpsertEventModal,
} from "@/components/event/EventManagementModals";
import { EventAttendanceDrawer } from "@/components/event/EventAttendanceDrawer";

export function EventsTab({
  clubId,
  departments,
  onNotice,
  onError,
}: {
  clubId: string;
  departments: Department[];
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ClubEvent | null>(null);
  const [form, setForm] = useState<EventFormValues>(EMPTY_EVENT_FORM);
  const [selected, setSelected] = useState<ClubEvent | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<EventRegistration | null>(null);
  const [notifyingEvent, setNotifyingEvent] = useState(false);

  const canCreate = session.canInClub("event.create", clubId);
  const canUpdateEvent = (ev: ClubEvent) => session.canInDepartment("event.update", clubId, ev.departmentId);

  const events = useQuery({
    queryKey: ["club-events", clubId, deptFilter, statusFilter],
    queryFn: () =>
      apiModel.clubEvents(clubId, {
        departmentId: deptFilter || undefined,
        status: statusFilter || undefined,
        limit: 50,
      }),
    enabled: !!clubId,
  });

  const allClubEvents = useQuery({
    queryKey: ["club-events", clubId, "summary-counts"],
    queryFn: () => apiModel.clubEvents(clubId, { limit: 100 }),
    enabled: !!clubId,
  });

  const summaryCounts = useMemo(() => {
    const list = allClubEvents.data?.items ?? [];
    return {
      total: allClubEvents.data?.total ?? list.length,
      draft: list.filter((e) => e.status === "DRAFT").length,
      open: list.filter((e) => e.status === "OPEN_REGISTRATION").length,
      closed: list.filter((e) => e.status === "CLOSED_REGISTRATION").length,
      completed: list.filter((e) => e.status === "COMPLETED").length,
      cancelled: list.filter((e) => e.status === "CANCELLED").length,
    };
  }, [allClubEvents.data]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["club-events", clubId] });
    queryClient.invalidateQueries({ queryKey: ["club-statistics", clubId] });
    if (selected) {
      queryClient.invalidateQueries({ queryKey: ["event-registrations", selected.id] });
      queryClient.invalidateQueries({ queryKey: ["event-attendances", selected.id] });
    }
  };

  const openEdit = (ev: ClubEvent) => {
    setEditing(ev);
    setForm({
      title: ev.title,
      eventType: ev.eventType,
      departmentId: ev.departmentId ?? "",
      location: ev.location ?? "",
      startTime: toLocalInput(ev.startTime),
      endTime: toLocalInput(ev.endTime),
      registrationDeadline: toLocalInput(ev.registrationDeadline),
      maxParticipants: ev.maxParticipants ? String(ev.maxParticipants) : "",
      allowCtv: ev.allowCtv,
      status: ev.status,
      description: ev.description ?? "",
    });
  };

  return (
    <div className="space-y-3">
      {allClubEvents.data && (
        <StatSummaryStrip
          columnsClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
          className="px-4 pt-3 sm:px-6"
          items={[
            { label: "Tổng sự kiện", value: summaryCounts.total },
            { label: "Bản nháp", value: summaryCounts.draft },
            { label: "Đang mở ĐK", value: summaryCounts.open, valueClassName: "text-primary" },
            { label: "Đã đóng ĐK", value: summaryCounts.closed, valueClassName: "text-amber-700" },
            { label: "Đã hoàn thành", value: summaryCounts.completed, valueClassName: "text-emerald-700" },
            { label: "Đã huỷ", value: summaryCounts.cancelled, valueClassName: "text-slate-600" },
          ]}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-2 sm:px-6">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Select
            aria-label="Lọc theo ban chuyên môn"
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
            aria-label="Lọc theo trạng thái sự kiện"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-full text-xs sm:w-48"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp (DRAFT)</option>
            <option value="OPEN_REGISTRATION">Đang mở đăng ký</option>
            <option value="CLOSED_REGISTRATION">Đã đóng đăng ký</option>
            <option value="COMPLETED">Đã hoàn thành</option>
            <option value="CANCELLED">Đã huỷ</option>
          </Select>
          {(deptFilter || statusFilter) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDeptFilter("");
                setStatusFilter("");
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
              setForm(EMPTY_EVENT_FORM);
            }}
          >
            <Plus size={14} /> Tạo sự kiện / Lịch sinh hoạt
          </Button>
        )}
      </div>

      {events.isPending ? (
        <LoadingRows />
      ) : events.isError ? (
        <ErrorState message={describeError(events.error)} onRetry={() => events.refetch()} />
      ) : !events.data.items.length ? (
        <EmptyState
          icon={<Calendar />}
          title={deptFilter || statusFilter ? "Không có sự kiện khớp bộ lọc" : "Chưa có sự kiện hoặc lịch sinh hoạt"}
          actionLabel={!deptFilter && !statusFilter && canCreate ? "Tạo sự kiện đầu tiên" : undefined}
          onAction={
            canCreate
              ? () => {
                  setCreating(true);
                  setForm(EMPTY_EVENT_FORM);
                }
              : undefined
          }
        />
      ) : (
        <DataTable
          ariaLabel="Sự kiện CLB"
          rows={events.data.items}
          rowKey={(ev) => ev.id}
          onRowClick={(ev) => setSelected(ev)}
          columns={[
            {
              key: "date",
              header: "Thời gian",
              render: (ev) => <span className="font-mono font-bold text-primary">{formatDay(ev.startTime)}</span>,
            },
            {
              key: "title",
              header: "Sự kiện / Hoạt động",
              render: (ev) => (
                <div>
                  <p className="font-bold text-foreground">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}
                    {ev.departmentName ? ` · ${ev.departmentName}` : ""}
                    {ev.allowCtv ? " · Mở CTV" : ""}
                  </p>
                </div>
              ),
            },
            {
              key: "location",
              header: "Địa điểm",
              render: (ev) => <span className="text-muted-foreground">{ev.location || "—"}</span>,
            },
            { key: "status", header: "Trạng thái", render: (ev) => <StatusBadge status={ev.status} /> },
            {
              key: "actions",
              header: "Thao tác",
              className: "text-right",
              render: (ev) => (
                <TableRowActions
                  actions={[
                    {
                      icon: <Eye />,
                      label:
                        session.canInDepartment("event.attendance", clubId, ev.departmentId) ||
                        session.canInDepartment("event.attendance_edit", clubId, ev.departmentId)
                          ? "Xem & Điểm danh"
                          : "Xem chi tiết",
                      onClick: () => setSelected(ev),
                    },
                    ...(canUpdateEvent(ev)
                      ? [{ icon: <Pencil />, label: "Cập nhật", onClick: () => openEdit(ev) }]
                      : []),
                  ]}
                />
              ),
            },
          ]}
        />
      )}

      <UpsertEventModal
        clubId={clubId}
        creating={creating}
        editing={editing}
        form={form}
        setForm={setForm}
        departments={departments}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(ev, isEdit) => {
          onNotice(isEdit ? `Đã cập nhật sự kiện "${ev.title}".` : `Đã tạo sự kiện "${ev.title}".`);
          onError("");
          if (!isEdit) setForm(EMPTY_EVENT_FORM);
          if (selected?.id === ev.id) setSelected(ev);
          refresh();
        }}
        onError={onError}
      />

      <UpdateParticipantModal
        key={editingParticipant?.id ?? "p-none"}
        eventId={selected?.id ?? ""}
        participant={editingParticipant}
        onClose={() => setEditingParticipant(null)}
        onUpdated={() => {
          onNotice("Đã cập nhật vai trò / trạng thái nhân sự sự kiện.");
          onError("");
          refresh();
        }}
        onError={onError}
      />

      <NotifyEventModal
        key={notifyingEvent ? `notify-${selected?.id}` : "notify-closed"}
        selected={selected}
        open={notifyingEvent}
        onClose={() => setNotifyingEvent(false)}
        onNotified={(recipientCount) => {
          onNotice(`Đã gửi thông báo sự kiện tới ${recipientCount} thành viên & cộng tác viên.`);
          onError("");
        }}
        onError={onError}
      />

      <EventAttendanceDrawer
        key={selected?.id ?? "ev-none"}
        clubId={clubId}
        selected={selected}
        onClose={() => setSelected(null)}
        canUpdate={selected ? canUpdateEvent(selected) : false}
        onOpenEdit={openEdit}
        onOpenNotify={() => setNotifyingEvent(true)}
        onOpenParticipantModal={setEditingParticipant}
        onNotice={onNotice}
        onError={onError}
        onRefresh={refresh}
      />
    </div>
  );
}
