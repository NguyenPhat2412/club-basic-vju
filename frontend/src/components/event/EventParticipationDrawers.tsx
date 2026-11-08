"use client";

import Link from "next/link";
import { Calendar, CheckCheck, Sparkles, UserCheck, XCircle } from "lucide-react";
import { DetailList, EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Textarea } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { EVENT_TYPE_LABELS } from "@/forms/event/event-form";
import { MyEventParticipation, PublicEvent } from "@/types";

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
  onRegister: (ev: PublicEvent) => void;
  cancelPending: boolean;
  onCancel: (eventId: string) => void;
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
}: EventParticipationDrawersProps) {
  return (
    <>
      <ModalShell
        open={!!registeringEvent}
        onClose={() => setRegisteringEvent(null)}
        title="Xác nhận đăng ký tham gia sự kiện"
        icon={<Sparkles />}
        size="sm"
        onSubmit={() => registeringEvent && onRegister(registeringEvent)}
        submitLabel={
          registeringEvent && activeClubIds.has(registeringEvent.clubId)
            ? "Đăng ký (Thành viên CLB)"
            : "Đăng ký Cộng tác viên (CTV)"
        }
        submitLoading={registerPending}
      >
        {registeringEvent && (
          <div className="space-y-3 text-sm">
            <p>
              Sự kiện: <b>{registeringEvent.title}</b> ({registeringEvent.clubName})
            </p>
            <p className="text-xs text-muted-foreground">
              {activeClubIds.has(registeringEvent.clubId)
                ? "Bạn đang là thành viên chính thức của CLB này."
                : "Bạn sẽ tham gia với tư cách Cộng tác viên (CTV) theo sự kiện — không tự động trở thành thành viên chính thức của CLB."}
            </p>
            <FormField label="Ghi chú / Nguyện vọng hỗ trợ (tuỳ chọn)">
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
            <DetailList
              rows={[
                ["Câu lạc bộ", selectedDiscover.clubName],
                ["Trạng thái", <StatusBadge key="s" status={selectedDiscover.status} />],
                ["Loại hoạt động", EVENT_TYPE_LABELS[selectedDiscover.eventType] ?? selectedDiscover.eventType],
                ["Đối tượng", selectedDiscover.allowCtv ? "Thành viên CLB & Cộng tác viên (CTV)" : "Thành viên CLB"],
                ["Địa điểm", selectedDiscover.location || "—"],
                ["Bắt đầu", formatDateTime(selectedDiscover.startTime)],
                ["Kết thúc", formatDateTime(selectedDiscover.endTime)],
                ["Hạn đăng ký", formatDateTime(selectedDiscover.registrationDeadline)],
                ["Số chỗ tối đa", selectedDiscover.maxParticipants ? `${selectedDiscover.maxParticipants} người` : "Không giới hạn"],
                ["Nội dung", <p key="d" className="whitespace-pre-line">{selectedDiscover.description || "—"}</p>],
              ]}
            />
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
                    <b>{activeRegByEvent.get(selectedDiscover.id)?.participantType === "CTV" ? "Cộng tác viên" : "Thành viên CLB"}</b>.
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
                  <UserCheck size={14} />{" "}
                  {activeClubIds.has(selectedDiscover.clubId) ? "Đăng ký tham gia" : "Đăng ký làm Cộng tác viên"}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sự kiện hiện không trong thời gian mở đăng ký hoặc chỉ dành riêng cho thành viên nội bộ CLB.
                </p>
              )}
            </Section>
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
        )}
      </EntityDrawer>
    </>
  );
}
