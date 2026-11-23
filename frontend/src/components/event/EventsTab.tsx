"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { Calendar, Eye, FilterX, Pencil, Plus, Search, X } from "lucide-react";
import { apiModel, ClubEvent, Department, EventRegistration } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { StatSummaryStrip } from "@/components/shared/StatCards";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
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
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ClubEvent | null>(null);
  const [form, setForm] = useState<EventFormValues>(EMPTY_EVENT_FORM);
  const [selected, setSelected] = useState<ClubEvent | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<EventRegistration | null>(null);
  const [notifyingEvent, setNotifyingEvent] = useState(false);

  const canCreate = session.canInClub("event.create", clubId);
  const canUpdateEvent = (ev: ClubEvent) => session.canInDepartment("event.update", clubId, ev.departmentId);
  const hasClientFilter = Boolean(search.trim() || typeFilter);
  const queryOffset = hasClientFilter ? 0 : offset;
  const queryLimit = hasClientFilter ? 100 : limit;

  const events = useQuery({
    queryKey: qk.clubEvents(clubId, deptFilter, statusFilter, queryOffset, queryLimit),
    queryFn: () =>
      apiModel.clubEvents(clubId, {
        departmentId: deptFilter || undefined,
        status: statusFilter || undefined,
        offset: queryOffset,
        limit: queryLimit,
      }),
    placeholderData: keepPreviousData,
    enabled: !!clubId,
  });

  const allClubEvents = useQuery({
    queryKey: qk.clubEvents(clubId, "summary-counts"),
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

  const rawItems = useMemo(() => events.data?.items ?? [], [events.data?.items]);
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rawItems.filter((ev) => {
      if (typeFilter && ev.eventType !== typeFilter) return false;
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        (ev.location ?? "").toLowerCase().includes(q) ||
        (ev.departmentName ?? "").toLowerCase().includes(q)
      );
    });
  }, [rawItems, search, typeFilter]);

  const visibleRows = hasClientFilter ? filteredItems.slice(offset, offset + limit) : filteredItems;
  const effectiveTotal = hasClientFilter ? filteredItems.length : (events.data?.total ?? 0);
  const hasFilters = Boolean(search.trim() || deptFilter || statusFilter || typeFilter);

  const resetFilters = () => {
    setSearch("");
    setDeptFilter("");
    setStatusFilter("");
    setTypeFilter("");
    setOffset(0);
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.clubEvents(clubId) });
    queryClient.invalidateQueries({ queryKey: qk.clubStatistics(clubId) });
    if (selected) {
      queryClient.invalidateQueries({ queryKey: qk.eventRegistrations(selected.id) });
      queryClient.invalidateQueries({ queryKey: qk.eventAttendances(selected.id) });
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
      requiresSubmission: Boolean(ev.requiresSubmission),
      status: ev.status,
      description: ev.description ?? "",
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      {allClubEvents.data && (
        <StatSummaryStrip
          columnsClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
          className="px-4 pt-3 sm:px-6"
          items={[
            { label: "Tổng sự kiện", value: summaryCounts.total },
            { label: "Bản nháp", value: summaryCounts.draft },
            { label: "Đang mở ĐK", value: summaryCounts.open, valueClassName: "text-primary" },
            { label: "Đã đóng ĐK", value: summaryCounts.closed },
            { label: "Đã hoàn thành", value: summaryCounts.completed, valueClassName: "text-primary" },
            { label: "Đã huỷ", value: summaryCounts.cancelled, valueClassName: "text-muted-foreground" },
          ]}
        />
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-y border-border/60 bg-card px-4 py-2.5 sm:px-6">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder="Tìm tên sự kiện, địa điểm…" className="h-8 pl-8 pr-7 text-xs" />
            {search && (
              <button type="button" aria-label="Xoá tìm kiếm" onClick={() => { setSearch(""); setOffset(0); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>
          <Select aria-label="Lọc theo ban chuyên môn" value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setOffset(0); }} className="h-8 w-full text-xs sm:w-40">
            <option value="">Tất cả ban / Toàn CLB</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select aria-label="Lọc loại sự kiện" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setOffset(0); }} className="h-8 w-full text-xs sm:w-44">
            <option value="">Mọi loại sự kiện</option>
            {Object.entries(EVENT_TYPE_LABELS).map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
          </Select>
          <Select aria-label="Lọc theo trạng thái sự kiện" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }} className="h-8 w-full text-xs sm:w-44">
            <option value="">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp (DRAFT)</option>
            <option value="OPEN_REGISTRATION">Đang mở đăng ký</option>
            <option value="CLOSED_REGISTRATION">Đã đóng đăng ký</option>
            <option value="COMPLETED">Đã hoàn thành</option>
            <option value="CANCELLED">Đã huỷ</option>
          </Select>
          {hasFilters && <Button size="sm" variant="outline" onClick={resetFilters} className="h-8"><FilterX size={13} /> Xoá lọc</Button>}
        </div>
        {canCreate && <Button size="sm" onClick={() => { setCreating(true); setForm(EMPTY_EVENT_FORM); }} className="h-8"><Plus size={14} /> Tạo sự kiện</Button>}
      </div>

      {events.isPending ? (
        <LoadingRows />
      ) : events.isError ? (
        <ErrorState message={describeError(events.error)} onRetry={() => events.refetch()} />
      ) : !visibleRows.length ? (
        <EmptyState
          icon={<Calendar />}
          title={hasFilters ? "Không có sự kiện khớp bộ lọc" : "Chưa có sự kiện hoặc lịch sinh hoạt"}
          actionLabel={hasFilters ? "Xoá bộ lọc" : canCreate ? "Tạo sự kiện đầu tiên" : undefined}
          onAction={
            hasFilters
              ? resetFilters
              : canCreate
                ? () => {
                    setCreating(true);
                    setForm(EMPTY_EVENT_FORM);
                  }
                : undefined
          }
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Sự kiện CLB"
            minWidth="min-w-[780px]"
            rows={visibleRows}
            rowKey={(ev) => ev.id}
            onRowClick={(ev) => setSelected(ev)}
            columns={[
              {
                key: "index",
                header: "STT",
                className: "w-10 text-center font-mono text-muted-foreground",
                render: (ev) => <span>{offset + visibleRows.indexOf(ev) + 1}</span>,
              },
              {
                key: "date",
                header: "Thời gian",
                className: "whitespace-nowrap",
                sortValue: (ev) => ev.startTime,
                render: (ev) => <span className="font-mono font-bold text-primary">{formatDay(ev.startTime)}</span>,
              },
              {
                key: "title",
                header: "Sự kiện / Hoạt động",
                className: "min-w-[230px] max-w-[330px]",
                sortValue: (ev) => ev.title,
                render: (ev) => (
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground" title={ev.title}>
                      {ev.title}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}
                      {ev.departmentName ? ` · ${ev.departmentName}` : ""}
                      {ev.allowCtv ? " · Công khai (CTV)" : " · Nội bộ CLB"}
                      {ev.requiresSubmission ? " · Nộp hồ sơ" : ""}
                    </p>
                  </div>
                ),
              },
              {
                key: "location",
                header: "Địa điểm",
                className: "max-w-[180px]",
                render: (ev) => <span className="line-clamp-1 text-muted-foreground">{ev.location || "—"}</span>,
              },
              {
                key: "capacity",
                header: "Chỉ tiêu",
                className: "whitespace-nowrap font-mono",
                sortValue: (ev) => ev.maxParticipants ?? 0,
                render: (ev) =>
                  ev.maxParticipants ? (
                    <Badge tone="neutral" dot={false}>
                      Tối đa {ev.maxParticipants}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Không giới hạn</span>
                  ),
              },
              {
                key: "status",
                header: "Trạng thái",
                className: "whitespace-nowrap",
                sortValue: (ev) => ev.status,
                render: (ev) => <StatusBadge status={ev.status} />,
              },
              {
                key: "actions",
                header: "Thao tác",
                className: "text-right whitespace-nowrap",
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
          <Pagination
            offset={offset}
            limit={limit}
            total={effectiveTotal}
            onOffset={setOffset}
            onLimit={setLimit}
          />
        </>
      )}

      <UpsertEventModal
        clubId={clubId} creating={creating} editing={editing} form={form} setForm={setForm} departments={departments}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={(ev, isEdit) => {
          onNotice(isEdit ? `Đã cập nhật sự kiện "${ev.title}".` : `Đã tạo sự kiện "${ev.title}".`);
          onError(""); if (!isEdit) setForm(EMPTY_EVENT_FORM); if (selected?.id === ev.id) setSelected(ev); refresh();
        }}
        onError={onError}
      />
      <UpdateParticipantModal
        key={editingParticipant?.id ?? "p-none"} eventId={selected?.id ?? ""} participant={editingParticipant}
        onClose={() => setEditingParticipant(null)}
        onUpdated={() => { onNotice("Đã cập nhật vai trò / trạng thái nhân sự sự kiện."); onError(""); refresh(); }}
        onError={onError}
      />
      <NotifyEventModal
        key={notifyingEvent ? `notify-${selected?.id}` : "notify-closed"} selected={selected} open={notifyingEvent}
        onClose={() => setNotifyingEvent(false)}
        onNotified={(cnt) => { onNotice(`Đã gửi thông báo sự kiện tới ${cnt} thành viên & cộng tác viên.`); onError(""); }}
        onError={onError}
      />
      <EventAttendanceDrawer
        key={selected?.id ?? "ev-none"} clubId={clubId} selected={selected} onClose={() => setSelected(null)}
        canUpdate={selected ? canUpdateEvent(selected) : false} onOpenEdit={openEdit}
        onOpenNotify={() => setNotifyingEvent(true)} onOpenParticipantModal={setEditingParticipant}
        onNotice={onNotice} onError={onError} onRefresh={refresh}
      />
    </div>
  );
}
