"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { ArrowRight, LockKeyhole, UserPlus, X } from "lucide-react";
import { apiModel, type AuthUserEnvelope } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { GoogleSignInButton, OrDivider, useGoogleSignIn } from "@/components/shared/GoogleSignInButton";
import { FormField, Input, PasswordInput } from "@/components/ui/input";
import {
  AuthModalMode,
  LoginFieldErrors,
  RegisterFieldErrors,
  toRegisterPayload,
  validateLoginFields,
  validateRegisterFields,
} from "@/forms/auth/auth-form";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { AuthModalBanner } from "./AuthModalBanner";
import { AuthModalForgotForm } from "./AuthModalForgotForm";

export type { AuthModalMode };

const authInputCls = (hasError?: boolean, pad = "px-3") =>
  cn(
    "h-10 rounded-lg border-slate-300 bg-white text-sm text-slate-900",
    pad,
    hasError && "border-destructive focus:border-destructive focus:ring-destructive",
  );

export function AuthModal({
  open,
  initialMode = "login",
  onClose,
  onSuccessRedirect = "/dashboard",
}: {
  open: boolean;
  initialMode?: AuthModalMode;
  onClose: () => void;
  onSuccessRedirect?: string | null;
}) {
  // Warm Google GSI config + script while browsing /home so modal opens with zero delay.
  useGoogleSignIn();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <AuthModalDialog
      initialMode={initialMode}
      onClose={onClose}
      onSuccessRedirect={onSuccessRedirect}
    />
  );
}

function AuthModalDialog({
  initialMode,
  onClose,
  onSuccessRedirect,
}: {
  initialMode: AuthModalMode;
  onClose: () => void;
  onSuccessRedirect: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const google = useGoogleSignIn();
  const googleOn = !!google.data?.enabled;
  const allowedDomain = google.data?.allowedDomains[0] ?? "st.vju.ac.vn";

  const [mode, setMode] = useState<AuthModalMode>(initialMode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loginErrors, setLoginErrors] = useState<LoginFieldErrors>({});
  const [registerErrors, setRegisterErrors] = useState<RegisterFieldErrors>({});
  const [loading, setLoading] = useState(false);

  const switchMode = (nextMode: AuthModalMode) => {
    setLoginErrors({});
    setRegisterErrors({});
    setMode(nextMode);
  };

  const clearLoginError = (field: keyof LoginFieldErrors) =>
    setLoginErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const clearRegisterError = (field: keyof RegisterFieldErrors) =>
    setRegisterErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const handleAuthSuccess = async (envelope?: AuthUserEnvelope) => {
    await queryClient.cancelQueries();
    queryClient.removeQueries({ queryKey: qk.me("permissions") });
    queryClient.removeQueries({ queryKey: qk.optionalMe("permissions") });
    queryClient.removeQueries({ queryKey: qk.dashboard() });
    if (envelope?.user) {
      queryClient.setQueryData(qk.optionalMe(), envelope.user);
      queryClient.setQueryData(qk.me(), envelope.user);
    }
    try {
      window.sessionStorage.setItem("vju_clubhub_auto_auth_prompted_v1", "1");
    } catch {
      // Ignore storage restrictions
    }
    await queryClient.invalidateQueries();
    onClose();
    if (onSuccessRedirect) {
      router.push(onSuccessRedirect);
    } else {
      router.refresh();
    }
  };

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    const fieldErrors = validateLoginFields({ email, password });
    if (Object.keys(fieldErrors).length > 0) {
      setLoginErrors(fieldErrors);
      return;
    }
    setLoading(true);
    try {
      const envelope = await apiModel.login(email.trim(), password);
      await handleAuthSuccess(envelope);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (event: FormEvent) => {
    event.preventDefault();
    const draft = { fullName, studentCode, email, phone, password, confirmPassword };
    const fieldErrors = validateRegisterFields(draft);
    if (Object.keys(fieldErrors).length > 0) {
      setRegisterErrors(fieldErrors);
      return;
    }
    setLoading(true);
    try {
      const envelope = await apiModel.register(toRegisterPayload(draft));
      await handleAuthSuccess(envelope);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  const eyebrow =
    mode === "login"
      ? "KHU VỰC THÀNH VIÊN"
      : mode === "forgot"
        ? "KHÔI PHỤC TÀI KHOẢN"
        : "THÀNH VIÊN MỚI · VJU CLUBHUB";

  const heading =
    mode === "login"
      ? "Đăng nhập hệ thống"
      : mode === "forgot"
        ? "Quên mật khẩu đăng nhập"
        : "Hãy gia nhập cộng đồng CLB";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/65 p-2.5 sm:p-4 lg:p-6 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative my-auto max-h-[92dvh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl",
          mode === "forgot"
            ? "max-w-[400px]"
            : "grid max-w-[432px] md:min-h-[595px] md:max-w-[718px] md:grid-cols-[270px_1fr] md:overflow-hidden lg:max-w-[830px] lg:grid-cols-[374px_1fr]",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {mode !== "forgot" && <AuthModalBanner mode={mode} onClose={onClose} />}

        <div
          className={cn(
            "flex flex-col justify-between md:max-h-[92dvh] md:overflow-y-auto",
            mode === "forgot" ? "p-5" : "p-4 sm:p-6 lg:p-7",
          )}
        >
          <div>
            <div className={cn("items-start justify-between gap-3", mode === "forgot" ? "flex" : "hidden md:flex")}>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-primary">
                  {mode === "forgot" ? "MÃ OTP BẢO MẬT" : eyebrow}
                </p>
                <h2
                  id="auth-modal-title"
                  className={cn(
                    "mt-0.5 font-extrabold tracking-tight text-slate-900",
                    mode === "forgot" ? "text-lg" : "text-xl lg:text-2xl",
                  )}
                >
                  {mode === "forgot" ? "Đặt lại mật khẩu" : heading}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng cửa sổ"
                className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={16} />
              </button>
            </div>

            {mode !== "forgot" && (
              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 md:mt-4">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={cn(
                    "rounded-lg py-2 text-xs font-bold transition-all sm:text-sm",
                    mode === "login" ? "bg-white text-primary shadow-2xs" : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className={cn(
                    "rounded-lg py-2 text-xs font-bold transition-all sm:text-sm",
                    mode === "register" ? "bg-white text-primary shadow-2xs" : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  Hãy gia nhập (Đăng ký)
                </button>
              </div>
            )}

            {googleOn && (
              <div className={cn("mt-4 grid gap-2", mode === "forgot" && "hidden")}>
                <p className="truncate whitespace-nowrap text-center text-xs font-medium text-slate-600">
                  Sinh viên VJU: Đăng nhập nhanh bằng email{" "}
                  <span className="font-semibold text-slate-800">@{allowedDomain}</span>
                </p>
                <GoogleSignInButton onSignedIn={handleAuthSuccess} width={400} />
                <OrDivider />
              </div>
            )}
          </div>

          {mode === "forgot" ? (
            <AuthModalForgotForm
              initialEmail={email}
              onEmailSync={setEmail}
              onBackToLogin={() => switchMode("login")}
            />
          ) : mode === "login" ? (
            <form noValidate onSubmit={submitLogin} className="mt-4 flex flex-1 flex-col justify-between gap-4 sm:mt-5">
              <div className="grid gap-3.5 sm:gap-4">
                <FormField label="Địa chỉ email" required error={loginErrors.email}>
                  <Input
                    type="email" maxLength={320} autoComplete="username" aria-invalid={Boolean(loginErrors.email)}
                    value={email} onChange={(e) => { setEmail(e.target.value); clearLoginError("email"); }}
                    placeholder="sinhvien@st.vju.ac.vn" className={authInputCls(Boolean(loginErrors.email), "px-3.5")}
                  />
                </FormField>

                <div className="relative">
                  <FormField label="Mật khẩu" required error={loginErrors.password}>
                    <PasswordInput
                      maxLength={128} autoComplete="current-password" aria-invalid={Boolean(loginErrors.password)}
                      value={password} onChange={(e) => { setPassword(e.target.value); clearLoginError("password"); }}
                      placeholder="••••••••" className={authInputCls(Boolean(loginErrors.password), "px-3.5")}
                    />
                  </FormField>
                  <button
                    type="button" onClick={() => switchMode("forgot")}
                    className="absolute top-0 right-0 text-xs font-semibold text-primary hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                <button type="submit" disabled={loading} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-60">
                  <LockKeyhole size={15} />
                  {loading ? "ĐANG ĐĂNG NHẬP…" : "ĐĂNG NHẬP VÀO CỘNG ĐỒNG"}
                  <ArrowRight size={15} />
                </button>
                <p className="border-t border-slate-100 pt-3 text-center text-xs text-slate-600">
                  Bạn chưa có tài khoản?{" "}
                  <button type="button" onClick={() => switchMode("register")} className="font-bold text-primary hover:underline">
                    Hãy gia nhập cùng chúng mình →
                  </button>
                </p>
              </div>
            </form>
          ) : (
            <form noValidate onSubmit={submitRegister} className="mt-4 flex flex-1 flex-col justify-between gap-3">
              <div className="grid gap-2.5 sm:gap-3">
                <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                  <FormField label="Họ và tên" required error={registerErrors.fullName}>
                    <Input
                      type="text" maxLength={200} autoComplete="name" aria-invalid={Boolean(registerErrors.fullName)}
                      value={fullName} onChange={(e) => { setFullName(e.target.value); clearRegisterError("fullName"); }}
                      placeholder="Nguyễn Văn A" className={authInputCls(Boolean(registerErrors.fullName))}
                    />
                  </FormField>
                  <FormField label="Mã sinh viên" error={registerErrors.studentCode}>
                    <Input
                      type="text" maxLength={50} aria-invalid={Boolean(registerErrors.studentCode)}
                      value={studentCode} onChange={(e) => { setStudentCode(e.target.value); clearRegisterError("studentCode"); }}
                      placeholder="VD: 23110209" className={authInputCls(Boolean(registerErrors.studentCode))}
                    />
                  </FormField>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                  <FormField label="Địa chỉ email" required error={registerErrors.email}>
                    <Input
                      type="email" maxLength={320} autoComplete="email" aria-invalid={Boolean(registerErrors.email)}
                      value={email} onChange={(e) => { setEmail(e.target.value); clearRegisterError("email"); }}
                      placeholder="sinhvien@st.vju.ac.vn" className={authInputCls(Boolean(registerErrors.email))}
                    />
                  </FormField>
                  <FormField label="Số điện thoại" error={registerErrors.phone}>
                    <Input
                      type="tel" maxLength={32} autoComplete="tel" aria-invalid={Boolean(registerErrors.phone)}
                      value={phone} onChange={(e) => { setPhone(e.target.value); clearRegisterError("phone"); }}
                      placeholder="0901234567" className={authInputCls(Boolean(registerErrors.phone))}
                    />
                  </FormField>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                  <FormField label="Mật khẩu (8+ ký tự)" required error={registerErrors.password}>
                    <PasswordInput
                      autoComplete="new-password" maxLength={72} aria-invalid={Boolean(registerErrors.password)}
                      value={password} onChange={(e) => { setPassword(e.target.value); clearRegisterError("password"); }}
                      placeholder="••••••••" className={authInputCls(Boolean(registerErrors.password))}
                    />
                  </FormField>
                  <FormField label="Xác nhận mật khẩu" required error={registerErrors.confirmPassword}>
                    <PasswordInput
                      autoComplete="new-password" maxLength={72} aria-invalid={Boolean(registerErrors.confirmPassword)}
                      value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); clearRegisterError("confirmPassword"); }}
                      placeholder="••••••••" className={authInputCls(Boolean(registerErrors.confirmPassword))}
                    />
                  </FormField>
                </div>
              </div>

              <div className="grid gap-2.5">
                <button type="submit" disabled={loading} className="flex h-10 sm:h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-60">
                  <UserPlus size={15} />
                  {loading ? "ĐANG KHỞI TẠO TÀI KHOẢN…" : "HÃY GIA NHẬP NGAY"}
                  <ArrowRight size={15} />
                </button>
                <p className="border-t border-slate-100 pt-2.5 text-center text-xs text-slate-600">
                  Đã là thành viên trên hệ thống?{" "}
                  <button type="button" onClick={() => switchMode("login")} className="font-bold text-primary hover:underline">
                    Đăng nhập tại đây →
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
