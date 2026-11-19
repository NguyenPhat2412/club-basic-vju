"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, LogIn, QrCode, RefreshCw } from "lucide-react";
import { apiModel, ClubEvent, EventAttendanceQrToken } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { ModalShell } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import {
  buildAttendanceQrCheckInUrl,
  parseAttendanceQrInput,
  renderAttendanceQrDataUrl,
} from "@/utils/event/attendance-qr";

export function EventQrOrganizerModal({
  open,
  event,
  activeRegistrationsCount,
  onClose,
  onAttendanceUpdated,
}: {
  open: boolean;
  event: ClubEvent | null;
  activeRegistrationsCount: number;
  onClose: () => void;
  onAttendanceUpdated?: () => void;
}) {
  const [qrState, setQrState] = useState<EventAttendanceQrToken | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [remainingSec, setRemainingSec] = useState<number>(0);

  const issueMutation = useMutation({
    mutationFn: (eventId: string) => apiModel.issueEventAttendanceQrToken(eventId),
    onSuccess: async (res) => {
      setQrState(res);
      const origin = typeof window !== "undefined" ? window.location.origin : "https://vju-club.all1.vn";
      const url = buildAttendanceQrCheckInUrl(origin, res.eventId, res.token);
      setQrDataUrl(await renderAttendanceQrDataUrl(url));
    },
  });

  const liveAttendances = useQuery({
    queryKey: qk.eventAttendances(event?.id),
    queryFn: () => apiModel.eventAttendances(event!.id),
    enabled: open && !!event,
    refetchInterval: open ? 5_000 : false,
  });

  useEffect(() => {
    if (!open || !event) return;
    issueMutation.mutate(event.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event?.id]);

  useEffect(() => {
    if (!open || !qrState) return;
    const updateRemaining = () => {
      const diff = Math.max(0, Math.floor((new Date(qrState.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSec(diff);
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [open, qrState]);

  useEffect(() => {
    if (open && liveAttendances.data) {
      onAttendanceUpdated?.();
    }
  }, [liveAttendances.data, onAttendanceUpdated, open]);

  const presentCount = (liveAttendances.data ?? []).filter(
    (a) => a.status === "PRESENT" || a.status === "LATE"
  ).length;

  const checkInUrl =
    qrState && typeof window !== "undefined"
      ? buildAttendanceQrCheckInUrl(window.location.origin, qrState.eventId, qrState.token)
      : "";

  const copyLink = async () => {
    if (!checkInUrl) return;
    await navigator.clipboard.writeText(checkInUrl);
    toast.success("Đã sao chép đường dẫn điểm danh QR.");
  };

  const mins = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const secs = String(remainingSec % 60).padStart(2, "0");

  return (
    <ModalShell
      open={open && !!event}
      onClose={onClose}
      title="Mã QR điểm danh sự kiện"
      icon={<QrCode />}
      size="sm"
    >
      {issueMutation.isPending && !qrState ? (
        <LoadingRows rows={3} />
      ) : issueMutation.isError ? (
        <ErrorState
          message={describeError(issueMutation.error)}
          onRetry={() => event && issueMutation.mutate(event.id)}
        />
      ) : qrState ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-bold text-foreground">{qrState.eventTitle}</p>
          <p className="text-xs text-muted-foreground">
            Đưa màn hình này cho thành viên / sinh viên đã đăng ký quét bằng Camera điện thoại hoặc Zalo.
          </p>

          {qrDataUrl && (
            <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR điểm danh ${qrState.eventTitle}`}
                width={256}
                height={256}
                className="mx-auto size-60 rounded-lg"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge tone={remainingSec > 60 ? "success" : "pending"}>
              Hiệu lực: {mins}:{secs}
            </Badge>
            <Badge tone="primary">
              Đã có mặt: {presentCount} / {activeRegistrationsCount} người
            </Badge>
          </div>

          <div className="flex w-full flex-wrap justify-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={issueMutation.isPending}
              onClick={() => event && issueMutation.mutate(event.id)}
            >
              <RefreshCw size={13} /> Tạo mã mới
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void copyLink()}>
              <Copy size={13} /> Sao chép link điểm danh
            </Button>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}

export function EventQrSelfCheckInModal({
  open,
  isLoggedIn,
  initialEventId,
  initialToken,
  onClose,
  onSuccess,
  onRequestLogin,
}: {
  open: boolean;
  isLoggedIn: boolean;
  initialEventId?: string | null;
  initialToken?: string | null;
  onClose: () => void;
  onSuccess: () => void;
  onRequestLogin?: () => void;
}) {
  const [manualInput, setManualInput] = useState("");
  const autoSubmittedKeyRef = useRef<string | null>(null);

  const checkInMutation = useMutation({
    mutationFn: ({ eventId, token }: { eventId: string; token: string }) =>
      apiModel.checkInEventWithQr(eventId, token),
    onSuccess: () => {
      onSuccess();
    },
  });

  useEffect(() => {
    if (!open || !isLoggedIn || !initialEventId || !initialToken) return;
    const key = `${initialEventId}:${initialToken}`;
    if (autoSubmittedKeyRef.current === key) return;
    autoSubmittedKeyRef.current = key;
    checkInMutation.mutate({ eventId: initialEventId, token: initialToken });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isLoggedIn, initialEventId, initialToken]);

  const submitManual = () => {
    const parsed = parseAttendanceQrInput(manualInput);
    if (!parsed) {
      toast.error("Vui lòng dán đúng đường dẫn hoặc mã QR điểm danh từ Ban tổ chức.");
      return;
    }
    checkInMutation.mutate(parsed);
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Điểm danh sự kiện bằng mã QR"
      icon={<QrCode />}
      size="sm"
      onSubmit={isLoggedIn && !initialToken && !checkInMutation.isSuccess ? submitManual : undefined}
      submitLabel="Xác nhận điểm danh"
      submitLoading={checkInMutation.isPending}
      submitDisabled={!manualInput.trim()}
    >
      {!isLoggedIn ? (
        <div className="space-y-3 text-center">
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            Vui lòng đăng nhập tài khoản VJU ClubHub để hoàn tất điểm danh sự kiện vừa quét.
          </p>
          {onRequestLogin && (
            <Button type="button" size="sm" onClick={onRequestLogin}>
              <LogIn size={14} /> Đăng nhập để điểm danh ngay
            </Button>
          )}
        </div>
      ) : checkInMutation.isPending ? (
        <LoadingRows rows={2} />
      ) : checkInMutation.isSuccess && checkInMutation.data ? (
        <div className="space-y-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 size={26} />
          </div>
          <p className="text-base font-bold text-foreground">Điểm danh thành công!</p>
          <p className="text-xs text-muted-foreground">
            Trạng thái ghi nhận: <strong>Có mặt</strong> lúc{" "}
            {formatDateTime(checkInMutation.data.checkedAt)}
          </p>
          <Button type="button" size="sm" className="w-full" onClick={onClose}>
            Hoàn tất
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {checkInMutation.isError && (
            <Notice tone="error">{describeError(checkInMutation.error)}</Notice>
          )}
          <FormField
            label="Đường dẫn hoặc mã phiên điểm danh QR"
            required
            hint="Bạn có thể quét trực tiếp bằng Camera điện thoại, hoặc dán link điểm danh do Ban tổ chức gửi tại đây."
          >
            <Input
              value={manualInput}
              maxLength={600}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="https://vju-club.all1.vn/events?checkin=...&token=v1...."
            />
          </FormField>
        </div>
      )}
    </ModalShell>
  );
}
