"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, KeyRound, RefreshCw, Send } from "lucide-react";
import { apiModel, type ForgotPasswordOtpResponse } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { FormField, Input, PasswordInput } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  ForgotPasswordFieldErrors,
  ResetPasswordOtpFieldErrors,
  toForgotPasswordPayload,
  toResetPasswordOtpPayload,
  validateForgotPasswordFields,
  validateResetPasswordOtpFields,
} from "@/forms/auth/auth-form";
import { cn } from "@/lib/utils";

interface AuthModalForgotFormProps {
  initialEmail: string;
  onEmailSync: (email: string) => void;
  onBackToLogin: () => void;
}

type ForgotStep = "request" | "verify" | "done";

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const inputCls = (hasError?: boolean, extra?: string) =>
  cn(
    "h-9.5 rounded-lg border-slate-300 bg-white px-3 text-sm text-slate-900",
    extra,
    hasError && "border-destructive focus:border-destructive focus:ring-destructive",
  );

export function AuthModalForgotForm({
  initialEmail,
  onEmailSync,
  onBackToLogin,
}: AuthModalForgotFormProps) {
  const [step, setStep] = useState<ForgotStep>("request");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requestErrors, setRequestErrors] = useState<ForgotPasswordFieldErrors>({});
  const [resetErrors, setResetErrors] = useState<ResetPasswordOtpFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [expiryLeft, setExpiryLeft] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (step !== "verify" || (expiryLeft <= 0 && cooldownLeft <= 0)) return;
    const timer = window.setInterval(() => {
      setExpiryLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setCooldownLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step, expiryLeft, cooldownLeft]);

  const applyOtpPolicy = (res: ForgotPasswordOtpResponse) => {
    setExpiryLeft(res.expirySeconds);
    setCooldownLeft(res.resendCooldownSeconds);
  };

  const handleRequestOtp = async (event: FormEvent) => {
    event.preventDefault();
    const draft = { email, studentCode: "", note: "" };
    const nextErrors = validateForgotPasswordFields(draft);
    if (Object.keys(nextErrors).length > 0) {
      setRequestErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    try {
      const payload = toForgotPasswordPayload(draft);
      const res = await apiModel.requestPasswordReset(payload);
      setEmail(payload.email);
      onEmailSync(payload.email);
      setOtp("");
      setResetErrors({});
      applyOtpPolicy(res);
      setStep("verify");
      toast.success("Đã gửi mã OTP đến email của bạn.");
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldownLeft > 0 || resending) return;
    setResending(true);
    try {
      const payload = toForgotPasswordPayload({ email, studentCode: "", note: "" });
      const res = await apiModel.requestPasswordReset(payload);
      setOtp("");
      setResetErrors((prev) => ({ ...prev, otp: undefined }));
      applyOtpPolicy(res);
      toast.success("Đã gửi lại mã OTP mới.");
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    const draft = { email, otp, newPassword, confirmPassword };
    const nextErrors = validateResetPasswordOtpFields(draft);
    if (Object.keys(nextErrors).length > 0) {
      setResetErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    try {
      await apiModel.resetPasswordWithOtp(toResetPasswordOtpPayload(draft));
      setStep("done");
      toast.success("Đã đặt lại mật khẩu thành công.");
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="mt-3.5 grid gap-3.5">
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-700">
          <CheckCircle2 size={18} className="shrink-0 text-primary" />
          <p className="leading-5">
            Đã cập nhật mật khẩu mới cho <span className="font-semibold text-slate-900">{email}</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToLogin}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <form noValidate onSubmit={handleResetPassword} className="mt-3 grid gap-3">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="min-w-0 truncate text-slate-600">
            Mã gửi tới <strong className="text-slate-900">{email}</strong>
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-primary">
              <Clock3 size={11} />
              {expiryLeft > 0 ? formatCountdown(expiryLeft) : "Hết hạn"}
            </span>
            <button
              type="button"
              onClick={() => setStep("request")}
              className="font-semibold text-slate-500 hover:text-slate-900 hover:underline"
            >
              Đổi
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-start gap-2">
          <FormField label="Mã OTP (6 số)" required error={resetErrors.otp}>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              aria-invalid={Boolean(resetErrors.otp)}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (resetErrors.otp) setResetErrors((prev) => ({ ...prev, otp: undefined }));
              }}
              placeholder="000000"
              className={inputCls(Boolean(resetErrors.otp), "text-center font-mono text-sm font-extrabold tracking-[0.3em]")}
            />
          </FormField>
          <button
            type="button"
            disabled={cooldownLeft > 0 || resending}
            onClick={handleResendOtp}
            className="mt-6 inline-flex h-9.5 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={12} className={cn(resending && "animate-spin text-primary")} />
            {cooldownLeft > 0 ? `${cooldownLeft}s` : "Gửi lại"}
          </button>
        </div>

        <FormField label="Mật khẩu mới" required error={resetErrors.newPassword}>
          <PasswordInput
            autoComplete="new-password"
            maxLength={72}
            aria-invalid={Boolean(resetErrors.newPassword)}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (resetErrors.newPassword) setResetErrors((prev) => ({ ...prev, newPassword: undefined }));
            }}
            placeholder="Tối thiểu 8 ký tự"
            className={inputCls(Boolean(resetErrors.newPassword))}
          />
        </FormField>

        <FormField label="Xác nhận mật khẩu" required error={resetErrors.confirmPassword}>
          <PasswordInput
            autoComplete="new-password"
            maxLength={72}
            aria-invalid={Boolean(resetErrors.confirmPassword)}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (resetErrors.confirmPassword) setResetErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            placeholder="Nhập lại mật khẩu mới"
            className={inputCls(Boolean(resetErrors.confirmPassword))}
          />
        </FormField>

        <button
          type="submit"
          disabled={submitting}
          className="mt-0.5 flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <KeyRound size={14} />
          {submitting ? "Đang cập nhật…" : "Đặt lại mật khẩu"}
        </button>

        <button
          type="button"
          onClick={onBackToLogin}
          className="mx-auto inline-flex items-center gap-1 pt-0.5 text-xs font-semibold text-slate-600 hover:text-primary"
        >
          <ArrowLeft size={13} />
          Quay lại đăng nhập
        </button>
      </form>
    );
  }

  return (
    <form noValidate onSubmit={handleRequestOtp} className="mt-3 grid gap-3.5">
      <p className="text-xs leading-5 text-slate-600">
        Nhập email tài khoản để nhận mã xác thực 6 số đặt lại mật khẩu.
      </p>

      <FormField label="Email tài khoản" required error={requestErrors.email}>
        <Input
          type="email"
          maxLength={320}
          autoComplete="email"
          aria-invalid={Boolean(requestErrors.email)}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            onEmailSync(e.target.value);
            if (requestErrors.email) setRequestErrors((prev) => ({ ...prev, email: undefined }));
          }}
          placeholder="sinhvien@st.vju.ac.vn"
          className={inputCls(Boolean(requestErrors.email))}
        />
      </FormField>

      <button
        type="submit"
        disabled={submitting}
        className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <Send size={14} />
        {submitting ? "Đang gửi…" : "Gửi mã OTP"}
      </button>

      <button
        type="button"
        onClick={onBackToLogin}
        className="mx-auto inline-flex items-center gap-1 pt-0.5 text-xs font-semibold text-slate-600 hover:text-primary"
      >
        <ArrowLeft size={13} />
        Quay lại đăng nhập
      </button>
    </form>
  );
}
