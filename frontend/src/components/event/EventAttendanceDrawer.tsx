"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, Calendar, CheckCheck, MapPin, Pencil, Settings2, UserCheck, Users } from "lucide-react";
import { apiModel, AttendanceStatus, ClubEvent, EventRegistration } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import { LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { EVENT_TYPE_LABELS } from "@/forms/event/event-form";

export function EventAttendanceDrawer({
  clubId,
  selected,
  onClose,
  canUpdate,
  onOpenEdit,
  onOpenNotify,
  onOpenParticipantModal,
  onNotice,
  onError,
  onRefresh,
}: {
  clubId: string;
  selected: ClubEvent | null;
  onClose: () => void;
  canUpdate: boolean;
  onOpenEdit: (ev: ClubEvent) => void;
  onOpenNotify: () => void;
  onOpenParticipantModal: (r: EventRegistration) => void;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
  onRefresh: () => void;
}) {
  const session = useSession();
  const [regNote, setRegNote] = useState("");
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceReason, setAttendanceReason] = useState("");

  const registrations = useQuery({
    queryKey: ["event-registrations", selected?.id],
    queryFn: () => apiModel.eventRegistrations(selected!.id),
    enabled: !!selected,
  });

  const canAttendRecord = !!selected && session.canInDepartment("event.attendance", clubId, selected.departmentId);
  const canAttendEdit = !!selected && session.canInDepartment("event.attendance_edit", clubId, selected.departmentId);
  const canAttend = canAttendRecord || canAttendEdit;
  const canNotify =
    !!selected &&
    (session.canInDepartment("notification.send", clubId, selected.departmentId) ||
      session.canInDepartment("event.update", clubId, selected.departmentId));

  const attendances = useQuery({
    queryKey: ["event-attendances", selected?.id],
    queryFn: () => apiModel.eventAttendances(selected!.id),
    enabled: !!selected && canAttend,
  });

  const allRegistrations = registrations.data?.items ?? [];
  const myRegistration = allRegistrations.find((r) => r.userId === session.user?.id && r.status === "REGISTERED");
  const activeRegistrations = allRegistrations.filter((r) => r.status === "REGISTERED");

  const existingAttendanceFor = (userId: string) => (attendances.data ?? []).find((a) => a.userId === userId);
  const savedStatusFor = (userId: string): AttendanceStatus =>
    attendanceDraft[userId] ?? existingAttendanceFor(userId)?.status ?? "PRESENT";

  const hasExistingAttendances = (attendances.data?.length ?? 0) > 0;
  const requiresEditReason = selected?.status === "COMPLETED" || hasExistingAttendances;

  const register = useMutation({
    mutationFn: () => apiModel.registerEvent(selected!.id, regNote.trim() || undefined),
    onSuccess: () => {
      onNotice(`Đã đăng ký tham gia "${selected!.title}".`);
      onError("");
      setRegNote("");
      onRefresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const cancelReg = useMutation({
    mutationFn: () => apiModel.cancelEventRegistration(selected!.id),
    onSuccess: () => {
      onNotice("Đã huỷ đăng ký tham gia sự kiện.");
      onError("");
      onRefresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const saveAttendance = useMutation({
    mutationFn: () => {
      const items = activeRegistrations.map((r) => {
        const existing = existingAttendanceFor(r.userId);
        return {
          userId: r.userId,
          status: savedStatusFor(r.userId),
          expectedVersion: existing?.version,
        };
      });
      return apiModel.recordAttendance(selected!.id, items, attendanceReason.trim() || undefined);
    },
    onSuccess: () => {
      onNotice("Đã lưu kết quả điểm danh sự kiện.");
      onError("");
      setAttendanceDraft({});
      setAttendanceReason("");
      onRefresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <EntityDrawer
      open={!!selected}
      onClose={onClose}
      title={selected?.title ?? "Chi tiết sự kiện"}
      subtitle={selected ? EVENT_TYPE_LABELS[selected.eventType] ?? selected.eventType : undefined}
      icon={<Calendar />}
      footer={
        selected ? (
          <div className="flex flex-wrap items-center gap-2">
            {canNotify && (
              <Button size="sm" variant="outline" onClick={onOpenNotify}>
                <Bell size={14} /> Thông báo Member & CTV
              </Button>
            )}
            {canUpdate && (
              <Button size="sm" variant="outline" onClick={() => onOpenEdit(selected)}>
                <Pencil size={14} /> Chỉnh sửa sự kiện
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
              ["Trạng thái", <StatusBadge key="s" status={selected.status} />],
              ["Ban phụ trách", selected.departmentName || "Toàn câu lạc bộ"],
              [
                "Địa điểm",
                selected.location ? (
                  <span key="l" className="inline-flex items-center gap-1">
                    <MapPin size={13} /> {selected.location}
                  </span>
                ) : (
                  "—"
                ),
              ],
              ["Bắt đầu", formatDateTime(selected.startTime)],
              ["Kết thúc", formatDateTime(selected.endTime)],
              ["Hạn đăng ký", formatDateTime(selected.registrationDeadline)],
              ...(selected.completedAt
                ? ([["Hoàn thành lúc", formatDateTime(selected.completedAt)]] as [string, React.ReactNode][])
                : []),
              ["Giới hạn", selected.maxParticipants ? `${selected.maxParticipants} người` : "Không giới hạn"],
              ["Đối tượng", selected.allowCtv ? "Thành viên CLB & Cộng tác viên (CTV)" : "Thành viên CLB"],
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
                  <Input
                    value={regNote}
                    onChange={(e) => setRegNote(e.target.value)}
                    placeholder="Ghi chú khi đăng ký (tuỳ chọn)…"
                  />
                  <Button size="sm" disabled={register.isPending} onClick={() => register.mutate()}>
                    Đăng ký tham gia
                  </Button>
                </div>
              )}
            </Section>
          )}

          <Section
            title={`Danh sách nhân sự đăng ký (${activeRegistrations.length} hiệu lực / ${allRegistrations.length} tổng)`}
            icon={<Users />}
          >
            {registrations.isPending ? (
              <LoadingRows rows={2} />
            ) : !allRegistrations.length ? (
              <p className="text-xs text-muted-foreground">Chưa có người đăng ký tham gia.</p>
            ) : (
              <ul className="divide-y divide-border/60 rounded-lg border border-border">
                {allRegistrations.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold">{r.userFullName || r.userEmail || r.userId.slice(0, 8)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {[r.studentCode, r.userEmail].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={r.participantType} />
                      {r.eventRole && <Badge tone="neutral">{r.eventRole}</Badge>}
                      {r.status === "CANCELLED" && <StatusBadge status="CANCELLED" />}
                      {canUpdate && (
                        <Button size="sm" variant="outline" onClick={() => onOpenParticipantModal(r)}>
                          <Settings2 size={12} /> Phân vai
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {canAttend && activeRegistrations.length > 0 && selected.status !== "DRAFT" && selected.status !== "CANCELLED" && (
            <Section title="Điểm danh & Hậu kiểm sự kiện" icon={<CheckCheck />}>
              <div className="space-y-2.5">
                {activeRegistrations.map((r) => {
                  const current = savedStatusFor(r.userId);
                  const existing = existingAttendanceFor(r.userId);
                  return (
                    <div
                      key={r.userId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="truncate font-semibold">
                          {r.userFullName || r.userEmail || r.userId.slice(0, 8)}
                        </span>
                        {existing?.editReason && (
                          <p className="text-[11px] text-muted-foreground">
                            Lý do sửa gần nhất (v{existing.version}): {existing.editReason}
                          </p>
                        )}
                      </div>
                      <Select
                        className="h-8 w-40 text-xs"
                        value={current}
                        onChange={(e) =>
                          setAttendanceDraft((prev) => ({
                            ...prev,
                            [r.userId]: e.target.value as AttendanceStatus,
                          }))
                        }
                      >
                        <option value="PRESENT">Có mặt</option>
                        <option value="LATE">Đi muộn</option>
                        <option value="EXCUSED">Vắng có phép</option>
                        <option value="ABSENT">Vắng mặt</option>
                      </Select>
                    </div>
                  );
                })}

                {requiresEditReason && (
                  <FormField
                    label="Lý do điều chỉnh điểm danh"
                    required={requiresEditReason}
                    hint="Bắt buộc khi sửa kết quả điểm danh đã lưu hoặc điều chỉnh trong cửa sổ hậu kiểm sau khi sự kiện hoàn thành."
                  >
                    <Input
                      value={attendanceReason}
                      maxLength={500}
                      onChange={(e) => setAttendanceReason(e.target.value)}
                      placeholder="Ví dụ: Bổ sung xác nhận minh chứng có mặt từ trưởng ban…"
                    />
                  </FormField>
                )}

                <Button
                  size="sm"
                  className="w-full"
                  disabled={saveAttendance.isPending || (requiresEditReason && !attendanceReason.trim())}
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
  );
}
