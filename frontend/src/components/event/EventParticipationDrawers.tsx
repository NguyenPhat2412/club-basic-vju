"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, CheckCheck, Sparkles, UserCheck, XCircle } from "lucide-react";
import { DetailList, EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Textarea } from "@/components/ui/input";
import { participantRoleLabel } from "@/lib/club/youth-union";
import { cn, formatDateTime } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/media";
import { EVENT_TYPE_LABELS, getEventScopeLabel } from "@/forms/event/event-form";
import { EventParticipantRole, MyEventParticipation, PublicEvent } from "@/types";
import { EventSubmissionBlock } from "./EventSubmissionBlock";
import { EventFeedbackSection } from "./EventFeedbackSection";
import { EventFestivalDetailSection } from "./EventFestivalDetailSection";

interface EventParticipationDrawersProps {
  isLoggedIn: boolean;
  activeClubIds: Set<string>;
  activeRegByEvent: Map<string, MyEventParticipation>;
  registeringEvent: PublicEvent | null;
  setRegisteringEvent: (ev: PublicEvent | null) => void;
  regNote: string;
  setRegNote: (note: string) => void;
  selectedDiscover: PublicEvent | null;
  setSelectedDiscover: (ev: PublicEvent | null) => void;
  selectedParticipation: MyEventParticipation | null;
  setSelectedParticipation: (item: MyEventParticipation | null) => void;
  canRegisterNow: (ev: PublicEvent) => boolean;
  canCancelNow: (eventStatus: string, registrationStatus: string, deadline?: string) => boolean;
  registerPending: boolean;
  onRegister: (ev: PublicEvent, participantType: EventParticipantRole, needsShuttleBus?: boolean) => void;
  cancelPending: boolean;
  onCancel: (eventId: string) => void;
  onRefresh: () => void;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}

export function EventParticipationDrawers({
  isLoggedIn,
  activeClubIds,
  activeRegByEvent,
  registeringEvent,
  setRegisteringEvent,
  regNote,
  setRegNote,
  selectedDiscover,
  setSelectedDiscover,
  selectedParticipation,
  setSelectedParticipation,
  canRegisterNow,
  canCancelNow,
  registerPending,
  onRegister,
  cancelPending,
  onCancel,
  onRefresh,
  onNotice,
  onError,
}: EventParticipationDrawersProps) {
  const [rolePick, setRolePick] = useState<{ eventId: string; role: EventParticipantRole } | null>(null);
  const [shuttlePick, setShuttlePick] = useState<{ eventId: string; needed: boolean } | null>(null);
  const selectedDiscoverReg = selectedDiscover ? activeRegByEvent.get(selectedDiscover.id) : undefined;
  const needsShuttleBus = Boolean(
    registeringEvent?.allowShuttleBus && shuttlePick && shuttlePick.eventId === registeringEvent.id && shuttlePick.needed,
  );

  const isMemberOfRegEvent = registeringEvent ? activeClubIds.has(registeringEvent.clubId) : false;
  const allowPublicOfRegEvent = registeringEvent
    ? (registeringEvent.allowPublicAttendees ?? registeringEvent.allowCtv)
    : false;
  const allowCtvOfRegEvent = Boolean(registeringEvent?.allowCtv);
  const defaultRole: EventParticipantRole = isMemberOfRegEvent
    ? "MEMBER"
    : allowPublicOfRegEvent
      ? "ATTENDEE"
      : "CTV";
  const chosenRole: EventParticipantRole =
    registeringEvent && rolePick?.eventId === registeringEvent.id ? rolePick.role : defaultRole;
  const setChosenRole = (role: EventParticipantRole) => {
    if (registeringEvent) setRolePick({ eventId: registeringEvent.id, role });
  };

  const discoverCtaLabel = (ev: PublicEvent) => {
    if (activeClubIds.has(ev.clubId)) return "Đăng ký tham gia";
    const allowPublic = ev.allowPublicAttendees ?? ev.allowCtv;
    if (allowPublic && ev.allowCtv) return "Đăng ký tham dự / CTV";
    if (ev.allowCtv) return "Đăng ký làm Cộng tác viên";
    return "Đăng ký tham dự";
  };

  return (
    <>
      <ModalShell
        open={!!registeringEvent}
        onClose={() => setRegisteringEvent(null)}
        title="Xác nhận đăng ký tham gia sự kiện"
        icon={<Sparkles />}
        size="sm"
        onSubmit={() => registeringEvent && onRegister(registeringEvent, chosenRole, needsShuttleBus)}
        submitLabel={`Đăng ký (${participantRoleLabel(chosenRole)})`}
        submitLoading={registerPending}
      >
        {registeringEvent && (
          <div className="space-y-3 text-sm">
            <p>
              Sự kiện: <b>{registeringEvent.title}</b> ({registeringEvent.clubName})
            </p>
            {isMemberOfRegEvent ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Chọn vai trò tham gia (Thành viên CLB)</p>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Chọn vai trò thành viên">
                {([
                  { role: "MEMBER" as const, title: "Thành viên tham gia (MEMBER)", desc: "Tham dự hoạt động CLB & điểm danh ĐRL" },
                  { role: "ORGANIZER" as const, title: "Ban tổ chức (ORGANIZER)", desc: "Điều phối tổ chức & nhận công việc sự kiện" },
                ]).map((opt) => (
                    <button
                      key={opt.role}
                      type="button"
                      role="radio"
                      aria-checked={chosenRole === opt.role}
                      onClick={() => setChosenRole(opt.role)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left transition-colors",
                        chosenRole === opt.role
                          ? "border-primary bg-rose-50/70 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <p className="text-xs font-bold text-foreground">{opt.title}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : allowPublicOfRegEvent && allowCtvOfRegEvent ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Chọn hình thức tham gia sự kiện</p>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Chọn vai trò đăng ký">
                {([
                  { role: "ATTENDEE" as const, title: "Người tham dự (ATTENDEE)", desc: "Tham dự sự kiện & điểm danh ĐRL" },
                  { role: "CTV" as const, title: "Cộng tác viên (CTV)", desc: "Hỗ trợ tổ chức & nhận công việc sự kiện" },
                ]).map((opt) => (
                    <button
                      key={opt.role}
                      type="button"
                      role="radio"
                      aria-checked={chosenRole === opt.role}
                      onClick={() => setChosenRole(opt.role)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left transition-colors",
                        chosenRole === opt.role
                          ? "border-primary bg-rose-50/70 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <p className="text-xs font-bold text-foreground">{opt.title}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                <Badge tone={allowCtvOfRegEvent ? "pending" : "primary"} dot={false}>
                  {allowCtvOfRegEvent
                    ? "Đăng ký với vai trò: Cộng tác viên"
                    : "Đăng ký với vai trò: Người tham dự"}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {allowCtvOfRegEvent
                    ? "Bạn sẽ hỗ trợ tổ chức sự kiện với tư cách CTV — không tự động trở thành thành viên chính thức của CLB."
                    : "Bạn sẽ tham dự sự kiện với tư cách Người tham dự và được ghi nhận điểm danh ĐRL."}
                </p>
              </div>
            )}
            {registeringEvent.allowShuttleBus && (
              <label className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  checked={needsShuttleBus}
                  onChange={(e) => setShuttlePick({ eventId: registeringEvent.id, needed: e.target.checked })}
                />
                <span>
                  <b className="block text-foreground">Đăng ký xe bus đưa đón Mỹ Đình ↔ Hòa Lạc</b>
                  <span className="text-[11px] text-muted-foreground">BTC tổng hợp danh sách theo email &amp; MSSV của bạn.</span>
                </span>
              </label>
            )}
            <FormField label="Ghi chú / Nguyện vọng hỗ trợ">
              <Textarea
                value={regNote}
                maxLength={500}
                onChange={(e) => setRegNote(e.target.value)}
                placeholder="Ví dụ: Có thể hỗ trợ check-in, chụp ảnh, hậu cần…"
              />
            </FormField>
          </div>
        )}
      </ModalShell>

      <EntityDrawer
        open={!!selectedDiscover}
        onClose={() => setSelectedDiscover(null)}
        title={selectedDiscover?.title ?? "Chi tiết sự kiện"}
        subtitle={selectedDiscover?.clubName}
        icon={<Calendar />}
      >
        {selectedDiscover && (
          <>
            {resolveMediaUrl(selectedDiscover.coverImageUrl) && (
              <div className="mb-4 overflow-hidden rounded-xl border border-border bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveMediaUrl(selectedDiscover.coverImageUrl)!} alt={selectedDiscover.title} className="h-44 w-full object-cover" />
              </div>
            )}
            <DetailList
              rows={[
                ["Câu lạc bộ", selectedDiscover.clubName],
                ["Trạng thái", <StatusBadge key="s" status={selectedDiscover.status} />],
                ["Loại hoạt động", EVENT_TYPE_LABELS[selectedDiscover.eventType] ?? selectedDiscover.eventType],
                ["Đối tượng", getEventScopeLabel(selectedDiscover)],
                ["Hồ sơ xét tuyển", selectedDiscover.requiresSubmission ? "Yêu cầu nộp tệp hồ sơ (tự khoá khi hết hạn)" : "Không yêu cầu"],
                ["Địa điểm", selectedDiscover.location || "—"],
                ["Bắt đầu", formatDateTime(selectedDiscover.startTime)],
                ["Kết thúc", formatDateTime(selectedDiscover.endTime)],
                ["Hạn đăng ký", formatDateTime(selectedDiscover.registrationDeadline)],
                ["Số chỗ tối đa", selectedDiscover.maxParticipants ? `${selectedDiscover.maxParticipants} người` : "Không giới hạn"],
                ["Nội dung", <p key="d" className="whitespace-pre-line">{selectedDiscover.description || "—"}</p>],
              ]}
            />
            <EventFestivalDetailSection event={selectedDiscover} onSelectBooth={setSelectedDiscover} />
            <Section title="Đăng ký tham gia" icon={<UserCheck />}>
              {!isLoggedIn ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 text-xs">
                  <span>Đăng nhập để đăng ký tham gia sự kiện hoặc ứng tuyển Cộng tác viên.</span>
                  <Link href="/events?auth=login" className="rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground">
                    Đăng nhập
                  </Link>
                </div>
              ) : activeRegByEvent.has(selectedDiscover.id) ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs">
                  <span>
                    Bạn đã đăng ký sự kiện này với tư cách{" "}
                    <b>{participantRoleLabel(activeRegByEvent.get(selectedDiscover.id)?.participantType)}</b>.
                  </span>
                  {canCancelNow(selectedDiscover.status, "REGISTERED", selectedDiscover.registrationDeadline) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={cancelPending}
                      onClick={() => onCancel(selectedDiscover.id)}
                    >
                      Huỷ đăng ký
                    </Button>
                  )}
                </div>
              ) : canRegisterNow(selectedDiscover) ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setRegisteringEvent(selectedDiscover);
                    setRegNote("");
                  }}
                >
                  <UserCheck size={14} /> {discoverCtaLabel(selectedDiscover)}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sự kiện hiện không trong thời gian mở đăng ký hoặc chỉ dành riêng cho thành viên nội bộ CLB.
                </p>
              )}
            </Section>
            {isLoggedIn && selectedDiscoverReg && (
              <EventSubmissionBlock
                eventId={selectedDiscover.id}
                registrationId={selectedDiscoverReg.registrationId}
                eventStatus={selectedDiscover.status}
                registrationDeadline={selectedDiscover.registrationDeadline}
                requiresSubmission={selectedDiscover.requiresSubmission}
                submissionFileName={selectedDiscoverReg.submissionFileName}
                submissionUploadedAt={selectedDiscoverReg.submissionUploadedAt}
                onUploaded={onRefresh}
                onNotice={onNotice}
                onError={onError}
              />
            )}
            {isLoggedIn && (
              <EventFeedbackSection
                eventId={selectedDiscover.id}
                eventStatus={selectedDiscover.status}
                canSubmit={Boolean(selectedDiscoverReg?.countedAsAttended)}
                onNotice={onNotice}
                onError={onError}
              />
            )}
          </>
        )}
      </EntityDrawer>

      <EntityDrawer
        open={!!selectedParticipation}
        onClose={() => setSelectedParticipation(null)}
        title={selectedParticipation?.eventTitle ?? "Chi tiết tham gia sự kiện"}
        subtitle={selectedParticipation ? `${selectedParticipation.clubName} (${selectedParticipation.clubCode})` : undefined}
        icon={<CheckCheck />}
        footer={
          selectedParticipation &&
          canCancelNow(
            selectedParticipation.eventStatus,
            selectedParticipation.registrationStatus,
            selectedParticipation.registrationDeadline,
          ) ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={cancelPending}
              onClick={() => onCancel(selectedParticipation.eventId)}
            >
              <XCircle size={14} /> Huỷ đăng ký sự kiện
            </Button>
          ) : undefined
        }
      >
        {selectedParticipation && (
          <>
            <DetailList
              rows={[
                ["Trạng thái sự kiện", <StatusBadge key="es" status={selectedParticipation.eventStatus} />],
                ["Tư cách tham gia", <StatusBadge key="pt" status={selectedParticipation.participantType} />],
                ["Vai trò phân công", selectedParticipation.eventRole || "Tham gia chung"],
                ["Trạng thái đăng ký", <StatusBadge key="rs" status={selectedParticipation.registrationStatus} />],
                ["Thời gian diễn ra", `${formatDateTime(selectedParticipation.startTime)} → ${formatDateTime(selectedParticipation.endTime)}`],
                ["Địa điểm", selectedParticipation.location || "—"],
                ["Đăng ký lúc", formatDateTime(selectedParticipation.registeredAt)],
                ...(selectedParticipation.cancelledAt
                  ? ([["Huỷ đăng ký lúc", formatDateTime(selectedParticipation.cancelledAt)]] as [string, React.ReactNode][])
                  : []),
                [
                  "Kết quả điểm danh",
                  selectedParticipation.attendanceStatus ? (
                    <StatusBadge key="as" status={selectedParticipation.attendanceStatus} />
                  ) : (
                    "Chưa ghi nhận điểm danh"
                  ),
                ],
                [
                  "Ghi nhận tham gia thực tế",
                  selectedParticipation.countedAsAttended
                    ? "Được tính tham gia (Sự kiện hợp lệ & Có mặt / Đi muộn)"
                    : "Chưa tính tham gia",
                ],
                ...(selectedParticipation.checkedAt
                  ? ([["Thời điểm điểm danh", formatDateTime(selectedParticipation.checkedAt)]] as [string, React.ReactNode][])
                  : []),
                ...(selectedParticipation.attendanceNote
                  ? ([["Ghi chú điểm danh", selectedParticipation.attendanceNote]] as [string, React.ReactNode][])
                  : []),
                ...(selectedParticipation.attendanceEditReason
                  ? ([["Lý do điều chỉnh hậu kiểm", selectedParticipation.attendanceEditReason]] as [string, React.ReactNode][])
                  : []),
              ]}
            />
            {selectedParticipation.registrationStatus === "REGISTERED" && (
              <EventSubmissionBlock
                eventId={selectedParticipation.eventId}
                registrationId={selectedParticipation.registrationId}
                eventStatus={selectedParticipation.eventStatus}
                registrationDeadline={selectedParticipation.registrationDeadline}
                requiresSubmission={selectedParticipation.requiresSubmission}
                submissionFileName={selectedParticipation.submissionFileName}
                submissionUploadedAt={selectedParticipation.submissionUploadedAt}
                onUploaded={onRefresh}
                onNotice={onNotice}
                onError={onError}
              />
            )}
            <EventFeedbackSection
              eventId={selectedParticipation.eventId}
              eventStatus={selectedParticipation.eventStatus}
              canSubmit={selectedParticipation.countedAsAttended}
              onNotice={onNotice}
              onError={onError}
            />
          </>
        )}
      </EntityDrawer>
    </>
  );
}
