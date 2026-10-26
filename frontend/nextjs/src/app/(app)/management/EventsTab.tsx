"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CheckCheck, Eye, MapPin, Pencil, Plus, UserCheck, Users } from "lucide-react";
import { apiModel, ClubEvent, Department } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";

const EVENT_TYPE_LABELS: Record<string, string> = {
  CLUB_EVENT: "Sự kiện CLB",
  MEETING: "Họp định kỳ",
  WORKSHOP: "Workshop / Tập huấn",
  RECRUITMENT: "Tuyển thành viên",
};

const EMPTY_EVENT = {
  title: "",
  eventType: "CLUB_EVENT",
  departmentId: "",
  location: "",
  startTime: "",
  endTime: "",
  registrationDeadline: "",
  maxParticipants: "",
  allowCtv: false,
  status: "OPEN_REGISTRATION",
  description: "",
};

function toIso(localValue: string) {
  if (!localValue) return "";
  const d = new Date(localValue);
  return Number.isNaN(d.getTime()) ? localValue : d.toISOString();
}

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ClubEvent | null>(null);
  const [form, setForm] = useState(EMPTY_EVENT);
  const [selected, setSelected] = useState<ClubEvent | null>(null);
  const [regNote, setRegNote] = useState("");
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, "PRESENT" | "ABSENT" | "LATE">>({});

  const canCreate = session.canInClub("event.create", clubId);
  const canUpdate = session.canInClub("event.update", clubId);

  const events = useQuery({
    queryKey: ["club-events", clubId],
    queryFn: () => apiModel.clubEvents(clubId),
    enabled: !!clubId,
  });

  const registrations = useQuery({
    queryKey: ["event-registrations", selected?.id],
    queryFn: () => apiModel.eventRegistrations(selected!.id),
    enabled: !!selected,
  });

  const canAttend = !!selected && session.canInDepartment("event.attendance", clubId, selected.departmentId);
  const attendances = useQuery({
    queryKey: ["event-attendances", selected?.id],
    queryFn: () => apiModel.eventAttendances(selected!.id),
    enabled: !!selected && canAttend,
  });

  const savedStatusFor = (userId: string): "PRESENT" | "ABSENT" | "LATE" =>
    attendanceDraft[userId] ?? (attendances.data ?? []).find((a) => a.userId === userId)?.status ?? "PRESENT";

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["club-events", clubId] });
    if (selected) {
      queryClient.invalidateQueries({ queryKey: ["event-registrations", selected.id] });
      queryClient.invalidateQueries({ queryKey: ["event-attendances", selected.id] });
    }
  };

  const create = useMutation({
    mutationFn: () =>
      apiModel.createEvent(clubId, {
        title: form.title.trim(),
        eventType: form.eventType,
        departmentId: form.departmentId || undefined,
        location: form.location.trim() || undefined,
        startTime: toIso(form.startTime),
        endTime: toIso(form.endTime),
        registrationDeadline: toIso(form.registrationDeadline || form.startTime),
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
        allowCtv: form.allowCtv,
        status: form.status,
        description: form.description.trim() || undefined,
      }),
    onSuccess: (ev) => {
      onNotice(`Đã tạo sự kiện "${ev.title}".`);
      onError("");
      setCreating(false);
      setForm(EMPTY_EVENT);
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const update = useMutation({
    mutationFn: () =>
      apiModel.updateEvent(clubId, editing!.id, {
        title: form.title.trim(),
        eventType: form.eventType,
        departmentId: form.departmentId || undefined,
        location: form.location.trim() || undefined,
        startTime: toIso(form.startTime),
        endTime: toIso(form.endTime),
        registrationDeadline: toIso(form.registrationDeadline || form.startTime),
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
        allowCtv: form.allowCtv,
        status: form.status,
        description: form.description.trim() || undefined,
      }),
    onSuccess: (ev) => {
      onNotice(`Đã cập nhật sự kiện "${ev.title}".`);
      onError("");
      setEditing(null);
      if (selected?.id === ev.id) setSelected(ev);
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const register = useMutation({
    mutationFn: () => apiModel.registerEvent(selected!.id, regNote.trim() || undefined),
    onSuccess: () => {
      onNotice(`Đã đăng ký tham gia "${selected!.title}".`);
      onError("");
      setRegNote("");
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const cancelReg = useMutation({
    mutationFn: () => apiModel.cancelEventRegistration(selected!.id),
    onSuccess: () => {
      onNotice("Đã huỷ đăng ký tham gia sự kiện.");
      onError("");
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const saveAttendance = useMutation({
    mutationFn: () => {
      const items = activeRegistrations.map((r) => ({ userId: r.userId, status: savedStatusFor(r.userId) }));
      return apiModel.recordAttendance(selected!.id, items);
    },
    onSuccess: () => {
      onNotice("Đã lưu kết quả điểm danh sự kiện.");
      onError("");
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

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
    update.reset();
  };

  const myRegistration = (registrations.data?.items ?? []).find(
    (r) => r.userId === session.user?.id && r.status === "REGISTERED"
  );
  const activeRegistrations = (registrations.data?.items ?? []).filter((r) => r.status === "REGISTERED");

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end px-4 pt-2">
          <Button size="sm" onClick={() => { setCreating(true); setForm(EMPTY_EVENT); create.reset(); }}>
            <Plus size={14} /> Tạo sự kiện / Lịch sinh hoạt
          </Button>
        </div>
      )}

      {events.isPending ? (
        <LoadingRows />
      ) : events.isError ? (
        <ErrorState message={describeError(events.error)} onRetry={() => events.refetch()} />
      ) : !events.data.items.length ? (
        <EmptyState
          icon={<Calendar />}
          title="Chưa có sự kiện hoặc lịch sinh hoạt"
          actionLabel={canCreate ? "Tạo sự kiện đầu tiên" : undefined}
          onAction={canCreate ? () => { setCreating(true); setForm(EMPTY_EVENT); } : undefined}
        />
      ) : (
        <DataTable
          ariaLabel="Sự kiện CLB"
          rows={events.data.items}
          rowKey={(ev) => ev.id}
          onRowClick={setSelected}
          columns={[
            { key: "date", header: "Thời gian", render: (ev) => <span className="font-mono font-bold text-primary">{formatDay(ev.startTime)}</span> },
            {
              key: "title",
              header: "Sự kiện / Hoạt động",
              render: (ev) => (
                <div>
                  <p className="font-bold text-foreground">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">{EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}{ev.departmentName ? ` · ${ev.departmentName}` : ""}</p>
                </div>
              ),
            },
            { key: "location", header: "Địa điểm", render: (ev) => <span className="text-muted-foreground">{ev.location || "—"}</span> },
            { key: "status", header: "Trạng thái", render: (ev) => <StatusBadge status={ev.status} /> },
            {
              key: "actions",
              header: "Thao tác",
              className: "text-right",
              render: (ev) => (
                <TableRowActions
                  actions={[
                    { icon: <Eye />, label: "Xem & Điểm danh", onClick: () => setSelected(ev) },
                    ...(canUpdate ? [{ icon: <Pencil />, label: "Cập nhật", onClick: () => openEdit(ev) }] : []),
                  ]}
                />
              ),
            },
          ]}
        />
      )}

      <ModalShell
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        title={editing ? "Cập nhật sự kiện" : "Tạo sự kiện & lịch sinh hoạt"}
        icon={<Calendar />}
        onSubmit={() => (editing ? update.mutate() : create.mutate())}
        submitLabel={editing ? "Lưu thay đổi" : "Tạo sự kiện"}
        submitLoading={create.isPending || update.isPending}
        submitDisabled={!form.title.trim() || !form.startTime || !form.endTime}
      >
        <FormField label="Tên sự kiện / buổi sinh hoạt" required>
          <Input value={form.title} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ví dụ: Sinh hoạt định kỳ tháng 11, Workshop Kỹ năng…" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Loại hoạt động">
            <Select value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}>
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </FormField>
          <FormField label="Ban phụ trách (tuỳ chọn)">
            <Select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
              <option value="">Toàn câu lạc bộ</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Bắt đầu" required>
            <Input type="datetime-local" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
          </FormField>
          <FormField label="Kết thúc" required>
            <Input type="datetime-local" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Hạn đăng ký" hint="Mặc định trước giờ bắt đầu">
            <Input type="datetime-local" value={form.registrationDeadline} onChange={(e) => setForm((f) => ({ ...f, registrationDeadline: e.target.value }))} />
          </FormField>
          <FormField label="Số lượng tối đa">
            <Input type="number" min={1} value={form.maxParticipants} onChange={(e) => setForm((f) => ({ ...f, maxParticipants: e.target.value }))} placeholder="Không giới hạn" />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Địa điểm">
            <Input value={form.location} maxLength={300} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Phòng 402 VJU / Online…" />
          </FormField>
          <FormField label="Trạng thái">
            <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="DRAFT">Bản nháp</option>
              <option value="OPEN_REGISTRATION">Đang mở đăng ký</option>
              <option value="CLOSED_REGISTRATION">Đã đóng đăng ký</option>
              <option value="COMPLETED">Đã hoàn thành</option>
              <option value="CANCELLED">Đã huỷ</option>
            </Select>
          </FormField>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" checked={form.allowCtv} onChange={(e) => setForm((f) => ({ ...f, allowCtv: e.target.checked }))} />
          <span>Cho phép cộng tác viên / sinh viên ngoài CLB đăng ký tham gia</span>
        </label>
        <FormField label="Nội dung chi tiết">
          <Textarea value={form.description} maxLength={4000} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </FormField>
      </ModalShell>

      <EntityDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? "Chi tiết sự kiện"}
        subtitle={selected ? EVENT_TYPE_LABELS[selected.eventType] ?? selected.eventType : undefined}
        icon={<Calendar />}
        footer={selected && canUpdate ? (
          <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>
            <Pencil size={14} /> Chỉnh sửa sự kiện
          </Button>
        ) : undefined}
      >
        {selected && (
          <>
            <DetailList
              rows={[
                ["Trạng thái", <StatusBadge key="s" status={selected.status} />],
                ["Ban phụ trách", selected.departmentName || "Toàn câu lạc bộ"],
                ["Địa điểm", selected.location ? <span key="l" className="inline-flex items-center gap-1"><MapPin size={13} /> {selected.location}</span> : "—"],
                ["Bắt đầu", formatDateTime(selected.startTime)],
                ["Kết thúc", formatDateTime(selected.endTime)],
                ["Hạn đăng ký", formatDateTime(selected.registrationDeadline)],
                ["Giới hạn", selected.maxParticipants ? `${selected.maxParticipants} người` : "Không giới hạn"],
                ["Đối tượng", selected.allowCtv ? "Thành viên CLB & Cộng tác viên" : "Thành viên CLB"],
                ["Mô tả", <p key="d" className="whitespace-pre-line">{selected.description || "—"}</p>],
              ]}
            />

            {selected.status === "OPEN_REGISTRATION" && (
              <Section title="Đăng ký tham gia" icon={<UserCheck />}>
                {myRegistration ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs">
                    <span>Bạn đã đăng ký tham gia sự kiện này.</span>
                    <Button size="sm" variant="destructive" disabled={cancelReg.isPending} onClick={() => cancelReg.mutate()}>
                      Huỷ đăng ký
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input value={regNote} onChange={(e) => setRegNote(e.target.value)} placeholder="Ghi chú khi đăng ký (tuỳ chọn)…" />
                    <Button size="sm" disabled={register.isPending} onClick={() => register.mutate()}>
                      Đăng ký tham gia
                    </Button>
                  </div>
                )}
              </Section>
            )}

            <Section title={`Danh sách đăng ký (${activeRegistrations.length})`} icon={<Users />}>
              {registrations.isPending ? (
                <LoadingRows rows={2} />
              ) : !activeRegistrations.length ? (
                <p className="text-xs text-muted-foreground">Chưa có người đăng ký tham gia.</p>
              ) : (
                <ul className="divide-y divide-border/60 rounded-lg border border-border">
                  {activeRegistrations.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                      <div>
                        <p className="font-semibold">{r.userFullName || r.userEmail || r.userId.slice(0, 8)}</p>
                        <p className="text-[11px] text-muted-foreground">{[r.studentCode, r.userEmail].filter(Boolean).join(" · ")}</p>
                      </div>
                      <Badge tone="neutral" dot={false}>{r.participantType === "CTV" ? "CTV" : "Thành viên"}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {canAttend && activeRegistrations.length > 0 && (
              <Section title="Điểm danh sự kiện" icon={<CheckCheck />}>
                <div className="space-y-2">
                  {activeRegistrations.map((r) => {
                    const current = savedStatusFor(r.userId);
                    return (
                      <div key={r.userId} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs">
                        <span className="truncate font-semibold">{r.userFullName || r.userEmail || r.userId.slice(0, 8)}</span>
                        <Select
                          className="h-8 w-36 text-xs"
                          value={current}
                          onChange={(e) =>
                            setAttendanceDraft((prev) => ({
                              ...prev,
                              [r.userId]: e.target.value as "PRESENT" | "ABSENT" | "LATE",
                            }))
                          }
                        >
                          <option value="PRESENT">Có mặt</option>
                          <option value="LATE">Đi muộn</option>
                          <option value="ABSENT">Vắng mặt</option>
                        </Select>
                      </div>
                    );
                  })}
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={saveAttendance.isPending}
                    onClick={() => saveAttendance.mutate()}
                  >
                    <CheckCheck size={14} /> {saveAttendance.isPending ? "Đang lưu…" : "Lưu điểm danh"}
                  </Button>
                </div>
              </Section>
            )}
          </>
        )}
      </EntityDrawer>
    </div>
  );
}
