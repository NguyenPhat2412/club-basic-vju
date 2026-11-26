"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { Bell, Calendar, CheckCheck, MapPin, Pencil, QrCode, UserCheck } from "lucide-react";
import { apiModel, AttendanceStatus, ClubEvent, EventRegistration } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { ExportReportMenu } from "@/components/shared/ExportReportMenu";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/media";
import { EVENT_TYPE_LABELS } from "@/forms/event/event-form";
import { buildAttendanceStatusMap, filterEventRegistrations, ParticipantStatusFilter } from "@/utils/event-participants";
import { exportEventAttendanceReport } from "@/utils/export/club-reports";
import { EventQrOrganizerModal } from "@/components/event/EventQrModals";
import { EventAdminFormButton } from "@/components/event/EventAdminFormButton";
import { EventSubmissionBlock } from "@/components/event/EventSubmissionBlock";
import { EventAttendanceRosterSection } from "@/components/event/EventAttendanceRosterSection";
import { UserAvatar } from "@/components/user/UserAvatar";
import { EventAttendanceLockPanel } from "@/components/event/EventAttendanceLockPanel";
import { EventCertificatesSection } from "@/components/event/EventCertificatesSection";
import { EventFeedbackSection } from "@/components/event/EventFeedbackSection";

type EventAttendanceDrawerProps = {
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
};

export function EventAttendanceDrawer({
  clubId, selected, onClose, canUpdate, onOpenEdit, onOpenNotify, onOpenParticipantModal, onNotice, onError, onRefresh,
}: EventAttendanceDrawerProps) {
  const session = useSession();
  const [regNote, setRegNote] = useState("");
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceReason, setAttendanceReason] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [lockedSnapshot, setLockedSnapshot] = useState<ClubEvent | null>(null);
  const [filterState, setFilterState] = useState<{ eventId?: string; query: string; status: ParticipantStatusFilter }>({
    eventId: selected?.id,
    query: "",
    status: "ALL",
  });

  const effectiveSelected = selected && lockedSnapshot?.id === selected.id ? lockedSnapshot : selected;
  const isAttendanceLocked = Boolean(effectiveSelected?.attendanceLockedAt);
  const participantQuery = filterState.eventId === selected?.id ? filterState.query : "";
  const participantStatus: ParticipantStatusFilter = filterState.eventId === selected?.id ? filterState.status : "ALL";
  const updateFilter = (next: Partial<{ query: string; status: ParticipantStatusFilter }>) =>
    setFilterState({ eventId: selected?.id, query: next.query ?? participantQuery, status: next.status ?? participantStatus });

  const registrations = useQuery({
    queryKey: qk.eventRegistrations(selected?.id),
    queryFn: () => apiModel.eventRegistrations(selected!.id),
    enabled: !!selected,
  });

  const canAttendRecord = !!effectiveSelected && session.canInDepartment("event.attendance", clubId, effectiveSelected.departmentId);
  const canAttendEdit = !!effectiveSelected && session.canInDepartment("event.attendance_edit", clubId, effectiveSelected.departmentId);
  const canAttend = canAttendRecord || canAttendEdit;
  const canLockAttendance = canAttendEdit || canUpdate;
  const canNotify =
    !!effectiveSelected &&
    (session.canInDepartment("notification.send", clubId, effectiveSelected.departmentId) ||
      session.canInDepartment("event.update", clubId, effectiveSelected.departmentId));

  const attendances = useQuery({
    queryKey: qk.eventAttendances(selected?.id),
    queryFn: () => apiModel.eventAttendances(selected!.id),
    enabled: !!selected && canAttend,
  });

  const allRegistrations = useMemo(() => registrations.data?.items ?? [], [registrations.data?.items]);
  const myRegistration = allRegistrations.find((r) => r.userId === session.user?.id && r.status === "REGISTERED");
  const activeRegistrations = allRegistrations.filter((r) => r.status === "REGISTERED");
  const filteredRegistrations = useMemo(
    () => filterEventRegistrations(allRegistrations, participantQuery, participantStatus),
    [allRegistrations, participantQuery, participantStatus],
  );
  const attendanceMap = useMemo(() => buildAttendanceStatusMap(attendances.data), [attendances.data]);

  const existingAttendanceFor = (userId: string) => attendanceMap.get(userId);
  const savedStatusFor = (userId: string): AttendanceStatus =>
    attendanceDraft[userId] ?? existingAttendanceFor(userId)?.status ?? "PRESENT";

  const pendingAttendanceItems = activeRegistrations
    .map((r) => {
      const existing = existingAttendanceFor(r.userId);
      const nextStatus = savedStatusFor(r.userId);
      const changedExisting = Boolean(existing && attendanceDraft[r.userId] !== undefined && nextStatus !== existing.status);
      if (existing && !changedExisting) return null;
      return { userId: r.userId, status: nextStatus, expectedVersion: existing?.version, isUpdate: Boolean(existing) };
    })
    .filter((item): item is { userId: string; status: AttendanceStatus; expectedVersion: number | undefined; isUpdate: boolean } => item !== null);

  const modifyingExisting = pendingAttendanceItems.some((item) => item.isUpdate);
  const requiresEditReason = effectiveSelected?.status === "COMPLETED" || modifyingExisting;

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
      const items = pendingAttendanceItems.map(({ userId, status, expectedVersion }) => ({
        userId,
        status,
        expectedVersion,
      }));
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
      open={!!effectiveSelected}
      onClose={onClose}
      title={effectiveSelected?.title ?? "Chi tiết sự kiện"}
      subtitle={effectiveSelected ? EVENT_TYPE_LABELS[effectiveSelected.eventType] ?? effectiveSelected.eventType : undefined}
      icon={<Calendar />}
      footer={
        effectiveSelected ? (
          <div className="flex flex-wrap items-center gap-2">
            {canAttend && !isAttendanceLocked && effectiveSelected.status !== "DRAFT" && effectiveSelected.status !== "CANCELLED" && (
              <Button size="sm" onClick={() => setQrModalOpen(true)}>
                <QrCode size={14} /> Mã QR điểm danh
              </Button>
            )}
            {allRegistrations.length > 0 && (
              <ExportReportMenu
                compact
                onExport={(mode) =>
                  exportEventAttendanceReport({
                    mode,
                    event: effectiveSelected,
                    registrations: allRegistrations,
                    attendances: attendances.data ?? [],
                  })
                }
              />
            )}
            {canNotify && (
              <Button size="sm" variant="outline" onClick={onOpenNotify}>
                <Bell size={14} /> Thông báo Member & CTV
              </Button>
            )}
            {(canUpdate || canAttend) && (
              <EventAdminFormButton
                compact
                event={effectiveSelected}
                activeRegistrationsCount={activeRegistrations.length}
                requester={session.user ? { fullName: session.user.fullName, studentCode: session.user.studentCode, email: session.user.email } : undefined}
              />
            )}
            {canUpdate && (
              <Button size="sm" variant="outline" onClick={() => onOpenEdit(effectiveSelected)}>
                <Pencil size={14} /> Chỉnh sửa sự kiện
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {effectiveSelected && (
        <>
          {resolveMediaUrl(effectiveSelected.coverImageUrl) && (
            <div className="mb-4 overflow-hidden rounded-xl border border-border bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveMediaUrl(effectiveSelected.coverImageUrl)!} alt={effectiveSelected.title} className="h-44 w-full object-cover" />
            </div>
          )}
          <DetailList
            rows={[
              ["Trạng thái", <StatusBadge key="s" status={effectiveSelected.status} />],
              ["Ban phụ trách", effectiveSelected.departmentName || "Toàn câu lạc bộ"],
              ...(effectiveSelected.academicTerm ? ([["Học kỳ ĐRL", effectiveSelected.academicTerm]] as [string, React.ReactNode][]) : []),
              [
                "Địa điểm",
                effectiveSelected.location ? (
                  <span key="l" className="inline-flex items-center gap-1">
                    <MapPin size={13} /> {effectiveSelected.location}
                  </span>
                ) : (
                  "—"
                ),
              ],
              ["Bắt đầu", formatDateTime(effectiveSelected.startTime)],
              ["Kết thúc", formatDateTime(effectiveSelected.endTime)],
              ["Hạn đăng ký", formatDateTime(effectiveSelected.registrationDeadline)],
              ...(effectiveSelected.completedAt
                ? ([["Hoàn thành lúc", formatDateTime(effectiveSelected.completedAt)]] as [string, React.ReactNode][])
                : []),
              ["Giới hạn", effectiveSelected.maxParticipants ? `${effectiveSelected.maxParticipants} người` : "Không giới hạn"],
              ["Phạm vi", effectiveSelected.allowCtv ? "Công khai toàn trường (SV & CTV)" : "Nội bộ thành viên CLB"],
              ["Hồ sơ xét tuyển", effectiveSelected.requiresSubmission ? "Yêu cầu nộp tệp (tự khoá khi hết hạn)" : "Không yêu cầu"],
              ["Mô tả", <p key="d" className="whitespace-pre-line">{effectiveSelected.description || "—"}</p>],
            ]}
          />

          {effectiveSelected.status === "OPEN_REGISTRATION" && (
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
                  <FormField label="Ghi chú khi đăng ký">
                    <Input value={regNote} onChange={(e) => setRegNote(e.target.value)} placeholder="Ví dụ: Có thể hỗ trợ check-in, hậu cần…" />
                  </FormField>
                  <Button size="sm" disabled={register.isPending} onClick={() => register.mutate()}>Đăng ký tham gia</Button>
                </div>
              )}
            </Section>
          )}

          {myRegistration && (
            <EventSubmissionBlock
              eventId={effectiveSelected.id} registrationId={myRegistration.id} eventStatus={effectiveSelected.status}
              registrationDeadline={effectiveSelected.registrationDeadline} requiresSubmission={effectiveSelected.requiresSubmission}
              submissionFileName={myRegistration.submissionFileName} submissionUploadedAt={myRegistration.submissionUploadedAt}
              onUploaded={onRefresh} onNotice={onNotice} onError={onError}
            />
          )}

          <EventAttendanceRosterSection
            eventId={effectiveSelected.id}
            isPending={registrations.isPending}
            allRegistrationsCount={allRegistrations.length}
            activeRegistrationsCount={activeRegistrations.length}
            filteredRegistrations={filteredRegistrations}
            participantQuery={participantQuery}
            participantStatus={participantStatus}
            onUpdateFilter={updateFilter}
            attendanceMap={attendanceMap}
            canUpdate={canUpdate}
            onOpenParticipantModal={onOpenParticipantModal}
            onError={onError}
          />

          <EventAttendanceLockPanel
            event={effectiveSelected}
            canLock={canLockAttendance}
            onLocked={(updated) => {
              setLockedSnapshot(updated);
              onRefresh();
            }}
            onNotice={onNotice}
            onError={onError}
          />

          <EventCertificatesSection
            event={effectiveSelected}
            canManage={canAttend || canUpdate}
            canRevoke={canLockAttendance}
            onNotice={onNotice}
            onError={onError}
          />

          {canAttend && !isAttendanceLocked && activeRegistrations.length > 0 && effectiveSelected.status !== "DRAFT" && effectiveSelected.status !== "CANCELLED" && (
            <Section title="Điểm danh & Hậu kiểm sự kiện" icon={<CheckCheck />}>
              <div className="space-y-2.5">
                <div className="max-h-64 space-y-2 overflow-y-auto pr-0.5">
                {activeRegistrations.map((r) => {
                  const current = savedStatusFor(r.userId);
                  const existing = existingAttendanceFor(r.userId);
                  return (
                    <div key={r.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserAvatar avatarUrl={r.userAvatarUrl} name={r.userFullName} email={r.userEmail} size="chat" rounded="full" />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate font-semibold">{r.userFullName || r.userEmail || r.userId.slice(0, 8)}</span>
                            {existing ? <StatusBadge status={existing.status} /> : <Badge tone="neutral" dot={false}>Chưa lưu</Badge>}
                          </div>
                          {existing?.editReason && (
                            <p className="text-[11px] text-muted-foreground">Lý do sửa gần nhất (v{existing.version}): {existing.editReason}</p>
                          )}
                        </div>
                      </div>
                      <Select
                        className="h-8 w-40 text-xs"
                        value={current}
                        onChange={(e) => setAttendanceDraft((prev) => ({ ...prev, [r.userId]: e.target.value as AttendanceStatus }))}
                      >
                        <option value="PRESENT">Có mặt</option>
                        <option value="LATE">Đi muộn</option>
                        <option value="EXCUSED">Vắng có phép</option>
                        <option value="ABSENT">Vắng mặt</option>
                      </Select>
                    </div>
                  );
                })}
                </div>

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
                  disabled={saveAttendance.isPending || pendingAttendanceItems.length === 0 || (requiresEditReason && !attendanceReason.trim())}
                  onClick={() => saveAttendance.mutate()}
                >
                  <CheckCheck size={14} />{" "}
                  {saveAttendance.isPending
                    ? "Đang lưu…"
                    : pendingAttendanceItems.length > 0
                      ? `Lưu điểm danh (${pendingAttendanceItems.length})`
                      : "Đã lưu đầy đủ điểm danh"}
                </Button>
              </div>
            </Section>
          )}

          <EventFeedbackSection
            eventId={effectiveSelected.id}
            eventStatus={effectiveSelected.status}
            canSubmit={false}
          />

          <EventQrOrganizerModal
            open={qrModalOpen && !isAttendanceLocked}
            event={effectiveSelected}
            activeRegistrationsCount={activeRegistrations.length}
            onClose={() => setQrModalOpen(false)}
            onAttendanceUpdated={onRefresh}
          />
        </>
      )}
    </EntityDrawer>
  );
}
