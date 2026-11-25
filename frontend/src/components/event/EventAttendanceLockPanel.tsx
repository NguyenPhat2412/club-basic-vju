"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Copy, Lock, ShieldCheck } from "lucide-react";
import { ApiError, apiModel, ClubEvent } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { Section } from "@/components/shared/Overlays";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { Otp2FaChallengeModal } from "@/components/auth/Otp2FaChallengeModal";

export function EventAttendanceLockPanel({
  event,
  canLock,
  onLocked,
  onNotice,
  onError,
}: {
  event: ClubEvent;
  canLock: boolean;
  onLocked: (updated: ClubEvent) => void;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [otpModalOpen, setOtpModalOpen] = useState(false);

  const lockMutation = useMutation({
    mutationFn: (otpCode?: string) => apiModel.lockEventAttendance(event.id, otpCode),
    onSuccess: (updated) => {
      setOtpModalOpen(false);
      onError("");
      onNotice("Đã chốt & ký xác nhận điện tử SHA-256 bảng điểm danh.");
      onLocked(updated);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "TWO_FACTOR_REQUIRED") {
        onError("");
        setOtpModalOpen(true);
        return;
      }
      if (!otpModalOpen) {
        onError(describeError(err));
      }
    },
  });

  const isLocked = Boolean(event.attendanceLockedAt && event.attendanceSignatureSha256);
  const canAttemptLock = canLock && event.status !== "DRAFT" && event.status !== "CANCELLED";

  if (!isLocked && !canAttemptLock) {
    return null;
  }

  const copySignature = async () => {
    if (!event.attendanceSignatureSha256) return;
    await navigator.clipboard.writeText(event.attendanceSignatureSha256);
    toast.success("Đã sao chép mã xác thực SHA-256.");
  };

  return (
    <Section
      title="Chốt sổ & Ký xác nhận bảng điểm danh"
      icon={isLocked ? <ShieldCheck /> : <Lock />}
    >
      {isLocked ? (
        <div className="space-y-2.5 rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-foreground">
              Bảng điểm danh đã khoá chỉnh sửa
            </span>
            <span className="text-muted-foreground">
              Chốt lúc: {formatDateTime(event.attendanceLockedAt ?? undefined)}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">
              Chữ ký điện tử SHA-256
            </p>
            <div className="flex items-center gap-2">
              <code
                title={event.attendanceSignatureSha256 ?? undefined}
                className="block min-w-0 flex-1 truncate whitespace-nowrap rounded border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-foreground"
              >
                {event.attendanceSignatureSha256}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 shrink-0 px-2.5 text-xs"
                onClick={() => void copySignature()}
              >
                <Copy size={12} /> Sao chép
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 rounded-lg border border-border bg-muted/30 p-3 text-xs">
          <p className="text-muted-foreground">
            Sau khi chốt sổ, danh sách điểm danh và mã QR sẽ không thể chỉnh sửa; hệ thống tự động tạo chữ ký SHA-256 để đính kèm trên báo cáo xuất ra.
          </p>
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={lockMutation.isPending}
            onClick={() => lockMutation.mutate(undefined)}
          >
            <Lock size={14} />{" "}
            {lockMutation.isPending ? "Đang chốt sổ…" : "Chốt & Ký xác nhận bảng điểm danh"}
          </Button>
        </div>
      )}

      <Otp2FaChallengeModal
        open={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        purpose="CRITICAL_ACTION"
        actionContext={`EVENT_ATTENDANCE_LOCK:${event.id}`}
        title="Xác thực OTP để chốt bảng điểm danh"
        description="Tài khoản quản trị của bạn đang bật xác thực 2 yếu tố. Vui lòng nhập mã OTP 6 chữ số đã gửi về email."
        autoSendOnOpen
        onSubmitOtp={async (otpCode) => {
          await lockMutation.mutateAsync(otpCode);
        }}
      />
    </Section>
  );
}
