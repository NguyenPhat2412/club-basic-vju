"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Info,
  KeyRound,
  MailCheck,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
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
  allowedDomain?: string;
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
    "h-10 rounded-lg border-slate-300 bg-white px-3 text-sm text-slate-900",
    extra,
    hasError && "border-destructive focus:border-destructive focus:ring-destructive",
  );

export function AuthModalForgotForm({
  initialEmail,
  allowedDomain = "st.vju.ac.vn",
  onEmailSync,
  onBackToLogin,
}: AuthModalForgotFormProps) {
  const [step, setStep] = useState<ForgotStep>("request");
  const [email, setEmail] = useState(initialEmail);
  const [studentCode, setStudentCode] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requestErrors, setRequestErrors] = useState<ForgotPasswordFieldErrors>({});
  const [resetErrors, setResetErrors] = useState<ResetPasswordOtpFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [policy, setPolicy] = useState<ForgotPasswordOtpResponse | null>(null);
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
    setPolicy(res);
    setExpiryLeft(res.expirySeconds);
    setCooldownLeft(res.resendCooldownSeconds);
  };

  const handleRequestOtp = async (event: FormEvent) => {
    event.preventDefault();
    const draft = { email, studentCode, note: "" };
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
      toast.success("Đã gửi mã xác thực OTP khôi phục mật khẩu.");
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
      const payload = toForgotPasswordPayload({ email, studentCode, note: "" });
      const res = await apiModel.requestPasswordReset(payload);
      setOtp("");
      setResetErrors((prev) => ({ ...prev, otp: undefined }));
      applyOtpPolicy(res);
      toast.success("Đã gửi lại mã xác thực OTP mới.");
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
      toast.success("Đã đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.");
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="mt-4 flex flex-1 flex-col justify-between gap-4 sm:mt-5">
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-slate-900">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/20 bg-white text-primary">
              <CheckCircle2 size={18} />
            </span>
            <div className="space-y-1.5 text-xs leading-5 sm:text-sm">
              <p className="font-bold text-slate-900">Đặt lại mật khẩu thành công</p>
              <p className="text-slate-700">
                Mật khẩu mới cho tài khoản <span className="font-semibold text-slate-900">{email}</span> đã
                được cập nhật và toàn bộ phiên đăng nhập cũ đã được thu hồi an toàn.
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onBackToLogin}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-xs transition-opacity hover:opacity-90"
        >
          <ShieldCheck size={16} />
          ĐĂNG NHẬP VỚI MẬT KHẨU MỚI
          <ArrowRight size={15} />
        </button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <form noValidate onSubmit={handleResetPassword} className="mt-3.5 flex flex-1 flex-col justify-between gap-3">
        <div className="grid gap-2.5">
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs leading-5 text-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                <MailCheck size={14} className="shrink-0 text-primary" />
                Mã OTP gửi tới <span className="text-primary">{email}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-900">
                <Clock3 size={11} className="text-primary" />
                {expiryLeft > 0 ? formatCountdown(expiryLeft) : "Hết hạn"}
              </span>
            </div>
            <p className="mt-1 text-[11.5px] text-slate-600">
              {policy?.mailConfigured
                ? `Kiểm tra hộp thư đến (hoặc mục Quảng cáo/Spam). Tối đa ${policy.maxVerifyAttempts} lần nhập mã.`
                : `Chưa cấu hình máy chủ SMTP trong Cài đặt hệ thống — yêu cầu đã báo tới Quản trị viên (môi trường local có thể xem mã OTP trong log backend). Tối đa ${policy?.maxVerifyAttempts ?? 5} lần nhập.`}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <FormField label="Mã xác thực OTP (6 chữ số)" required error={resetErrors.otp}>
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
                className={inputCls(Boolean(resetErrors.otp), "text-center font-mono text-base font-extrabold tracking-[0.35em]")}
              />
            </FormField>
            <button
              type="button"
              disabled={cooldownLeft > 0 || resending}
              onClick={handleResendOtp}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <RefreshCw size={13} className={cn(resending && "animate-spin text-primary")} />
              {cooldownLeft > 0 ? `Gửi lại (${cooldownLeft}s)` : "Gửi lại mã"}
            </button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            <FormField label="Mật khẩu mới (8+ ký tự)" required error={resetErrors.newPassword}>
              <PasswordInput
                autoComplete="new-password"
                maxLength={72}
                aria-invalid={Boolean(resetErrors.newPassword)}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (resetErrors.newPassword) setResetErrors((prev) => ({ ...prev, newPassword: undefined }));
                }}
                placeholder="••••••••"
                className={inputCls(Boolean(resetErrors.newPassword))}
              />
            </FormField>
            <FormField label="Xác nhận mật khẩu mới" required error={resetErrors.confirmPassword}>
              <PasswordInput
                autoComplete="new-password"
                maxLength={72}
                aria-invalid={Boolean(resetErrors.confirmPassword)}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (resetErrors.confirmPassword) setResetErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                placeholder="••••••••"
                className={inputCls(Boolean(resetErrors.confirmPassword))}
              />
            </FormField>
          </div>
        </div>

        <div className="grid gap-2.5">
          <button
            type="submit"
            disabled={submitting}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-11 sm:text-sm"
          >
            <KeyRound size={15} />
            {submitting ? "ĐANG XÁC MINH & CẬP NHẬT…" : "XÁC NHẬN OTP & ĐẶT MẬT KHẨU MỚI"}
          </button>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
            <button type="button" onClick={() => setStep("request")} className="font-semibold text-slate-700 hover:text-slate-900 hover:underline">
              Đổi địa chỉ email khác
            </button>
            <button type="button" onClick={onBackToLogin} className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
              <ArrowLeft size={13} />
              Quay lại đăng nhập
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form noValidate onSubmit={handleRequestOtp} className="mt-4 flex flex-1 flex-col justify-between gap-3.5">
      <div className="grid gap-3">
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-5 text-slate-700">
          <Info size={15} className="mt-0.5 shrink-0 text-primary" />
          <p>
            Nhập địa chỉ email tài khoản để nhận <span className="font-semibold text-slate-900">mã xác thực OTP 6 chữ số</span> đặt lại mật khẩu.
            Sinh viên có email <span className="font-semibold text-slate-900">@{allowedDomain}</span> cũng có thể{" "}
            <button type="button" onClick={onBackToLogin} className="font-semibold text-primary hover:underline">
              đăng nhập nhanh bằng Google
            </button>.
          </p>
        </div>

        <FormField label="Địa chỉ email nhận mã OTP" required error={requestErrors.email}>
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
            className={inputCls(Boolean(requestErrors.email), "px-3.5")}
          />
        </FormField>

        <FormField
          label="Mã sinh viên"
          hint="Giúp đối chiếu hồ sơ nhanh trong trường hợp cần Quản trị viên hỗ trợ."
          error={requestErrors.studentCode}
        >
          <Input
            type="text"
            maxLength={50}
            aria-invalid={Boolean(requestErrors.studentCode)}
            value={studentCode}
            onChange={(e) => {
              setStudentCode(e.target.value);
              if (requestErrors.studentCode) setRequestErrors((prev) => ({ ...prev, studentCode: undefined }));
            }}
            placeholder="VD: 23110209"
            className={inputCls(Boolean(requestErrors.studentCode), "px-3.5")}
          />
        </FormField>
      </div>

      <div className="grid gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-11 sm:text-sm"
        >
          {submitting ? <KeyRound size={15} /> : <Send size={15} />}
          {submitting ? "ĐANG GỬI MÃ OTP…" : "NHẬN MÃ XÁC THỰC OTP QUA EMAIL"}
        </button>
        <p className="border-t border-slate-100 pt-2.5 text-center text-xs text-slate-600">
          Đã nhớ mật khẩu tài khoản?{" "}
          <button type="button" onClick={onBackToLogin} className="inline-flex items-center gap-1 align-baseline font-bold text-primary hover:underline">
            <ArrowLeft size={13} />
            Quay lại đăng nhập
          </button>
        </p>
      </div>
    </form>
  );
}
