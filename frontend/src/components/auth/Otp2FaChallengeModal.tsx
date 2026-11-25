"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import type {
  TwoFactorPurpose,
  TwoFactorSendResponse,
  TwoFactorVerifyResponse,
} from "@/api/auth/auth.api";
import { apiModel, ApiError, type AuthUserEnvelope } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { ModalShell } from "@/components/shared/Overlays";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type Otp2FaChallengeModalProps = {
  open: boolean;
  onClose: () => void;
  purpose: TwoFactorPurpose;
  actionContext?: string;
  email?: string;
  password?: string;
  credential?: string;
  title?: string;
  description?: string;
  autoSendOnOpen?: boolean;
  onSubmitOtp?: (otpCode: string) => Promise<void>;
  onVerified?: (result?: AuthUserEnvelope | TwoFactorVerifyResponse) => void;
};

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function Otp2FaChallengeModal(props: Otp2FaChallengeModalProps) {
  if (!props.open) return null;
  const openKey = `${props.purpose}:${props.actionContext ?? ""}:${props.email ?? ""}:${props.credential ? "google" : ""}`;
  return <Otp2FaChallengeModalContent key={openKey} {...props} />;
}

function Otp2FaChallengeModalContent({
  open,
  onClose,
  purpose,
  actionContext,
  email,
  password,
  credential,
  title,
  description,
  autoSendOnOpen = true,
  onSubmitOtp,
  onVerified,
}: Otp2FaChallengeModalProps) {
  const [otp, setOtp] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const [mailConfigured, setMailConfigured] = useState<boolean | null>(null);
  const [expiryLeft, setExpiryLeft] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const hasAutoSentRef = useRef(false);

  const sendOtp = useCallback(
    async (silentCooldown: boolean) => {
      setSending(true);
      setSubmitError(undefined);
      try {
        const res: TwoFactorSendResponse = await apiModel.sendTwoFactorOtp({
          purpose,
          actionContext,
          email,
          password,
          credential,
        });
        setHasSent(true);
        setMailConfigured(res.mailConfigured);
        setExpiryLeft(res.expirySeconds);
        setCooldownLeft(res.resendCooldownSeconds);
        setOtp("");
        setFieldError(undefined);
        if (!silentCooldown) {
          toast.success(
            res.mailConfigured
              ? "Đã gửi mã OTP 6 số đến email của bạn."
              : "Đã khởi tạo mã OTP 2FA (môi trường chưa cấu hình SMTP)."
          );
        }
      } catch (err) {
        if (silentCooldown && err instanceof ApiError && err.code === "OTP_COOLDOWN_ACTIVE") {
          setHasSent(true);
          return;
        }
        const msg = describeError(err);
        setSubmitError(msg);
        if (!silentCooldown) {
          toast.error(msg);
        }
      } finally {
        setSending(false);
      }
    },
    [actionContext, credential, email, password, purpose]
  );

  useEffect(() => {
    if (!autoSendOnOpen || hasAutoSentRef.current) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled || hasAutoSentRef.current) return;
      hasAutoSentRef.current = true;
      void sendOtp(true);
    });
    return () => {
      cancelled = true;
    };
  }, [autoSendOnOpen, sendOtp]);

  useEffect(() => {
    if (expiryLeft <= 0 && cooldownLeft <= 0) return;
    const timer = window.setInterval(() => {
      setExpiryLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setCooldownLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiryLeft, cooldownLeft]);

  const handleSubmit = async () => {
    const trimmed = otp.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setFieldError("Vui lòng nhập đủ 6 chữ số OTP.");
      return;
    }
    setFieldError(undefined);
    setSubmitError(undefined);
    setSubmitting(true);
    try {
      if (onSubmitOtp) {
        await onSubmitOtp(trimmed);
        onVerified?.();
        onClose();
        return;
      }
      const result = await apiModel.verifyTwoFactorOtp({
        purpose,
        actionContext,
        otp: trimmed,
        email,
        password,
        credential,
      });
      toast.success("Xác thực OTP 2FA thành công.");
      onVerified?.(result);
      onClose();
    } catch (err) {
      const msg = describeError(err);
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resolvedTitle =
    title ??
    (purpose === "LOGIN_2FA"
      ? "Xác thực 2 bước khi đăng nhập"
      : "Xác thực OTP thao tác trọng yếu");
  const resolvedDescription =
    description ??
    (purpose === "LOGIN_2FA"
      ? "Nhập mã OTP 6 số được gửi tới email tài khoản quản trị để hoàn tất đăng nhập."
      : "Thao tác này yêu cầu xác nhận mã OTP 6 số qua email để đảm bảo an toàn dữ liệu.");

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={resolvedTitle}
      icon={<ShieldCheck />}
      size="sm"
      onSubmit={handleSubmit}
      submitLabel="Xác nhận OTP"
      submitLoading={submitting}
      submitDisabled={sending || otp.trim().length < 6}
    >
      <p className="text-xs leading-relaxed text-muted-foreground">{resolvedDescription}</p>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-foreground">
          <Mail size={13} className="shrink-0 text-primary" />
          <span className="truncate font-medium">
            {email ? `Gửi tới ${email}` : "Gửi tới email tài khoản của bạn"}
          </span>
        </span>
        {hasSent && (
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] font-bold text-primary">
            <Clock3 size={12} />
            {expiryLeft > 0 ? formatCountdown(expiryLeft) : "Hết hạn"}
          </span>
        )}
      </div>

      {mailConfigured === false && (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Máy chủ chưa cấu hình SMTP gửi thư; mã OTP được ghi nhận ở nhật ký môi trường phát triển.
        </p>
      )}

      <div className="grid grid-cols-[1fr_auto] items-start gap-2">
        <FormField label="Mã OTP (6 chữ số)" required error={fieldError}>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            aria-invalid={Boolean(fieldError)}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
              if (fieldError) setFieldError(undefined);
              if (submitError) setSubmitError(undefined);
            }}
            placeholder="000000"
            className={cn(
              "h-10 text-center font-mono text-base font-extrabold tracking-[0.35em]",
              fieldError && "border-destructive focus:border-destructive focus:ring-destructive"
            )}
          />
        </FormField>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={sending || cooldownLeft > 0}
          onClick={() => void sendOtp(false)}
          className="mt-6 h-10 px-3"
        >
          <RefreshCw size={13} className={cn(sending && "animate-spin text-primary")} />
          {cooldownLeft > 0 ? `${cooldownLeft}s` : hasSent ? "Gửi lại" : "Gửi mã"}
        </Button>
      </div>

      {submitError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive"
        >
          {submitError}
        </p>
      )}
    </ModalShell>
  );
}
