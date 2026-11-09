"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LockKeyhole, UserPlus, X } from "lucide-react";
import { apiModel, type AuthUserEnvelope } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { GoogleSignInButton, OrDivider, useGoogleSignIn } from "@/components/shared/GoogleSignInButton";
import { FormField, Input } from "@/components/ui/input";
import { AuthModalMode, validateRegisterDraft } from "@/forms/auth/auth-form";
import { AuthModalBanner } from "./AuthModalBanner";

export type { AuthModalMode };

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
      key={initialMode}
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

  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (nextMode: AuthModalMode) => {
    setMode(nextMode);
    setError("");
  };

  const handleAuthSuccess = async (envelope?: AuthUserEnvelope) => {
    await queryClient.cancelQueries();
    queryClient.removeQueries({ queryKey: ["me", "permissions"] });
    queryClient.removeQueries({ queryKey: ["optional-me", "permissions"] });
    queryClient.removeQueries({ queryKey: ["dashboard"] });
    if (envelope?.user) {
      queryClient.setQueryData(["optional-me"], envelope.user);
      queryClient.setQueryData(["me"], envelope.user);
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
    setError("");
    setLoading(true);
    try {
      const envelope = await apiModel.login(email.trim(), password);
      await handleAuthSuccess(envelope);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const validationErr = validateRegisterDraft({
      fullName,
      studentCode,
      email,
      phone,
      password,
      confirmPassword,
    });
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setLoading(true);
    try {
      const envelope = await apiModel.register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        studentCode: studentCode.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      await handleAuthSuccess(envelope);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/65 p-2.5 sm:p-4 lg:p-6 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
    >
      <div
        className="relative my-auto grid max-h-[92dvh] w-full max-w-[460px] overflow-y-auto rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl md:max-w-[760px] md:grid-cols-[265px_1fr] md:overflow-hidden lg:max-w-[920px] lg:grid-cols-[380px_1fr]"
        onClick={(event) => event.stopPropagation()}
      >
        <AuthModalBanner mode={mode} onClose={onClose} />

        <div className="flex flex-col p-4 sm:p-6 md:max-h-[92dvh] md:overflow-y-auto lg:p-7">
          <div className="hidden items-start justify-between gap-3 md:flex">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-primary">
                {mode === "login" ? "KHU VỰC THÀNH VIÊN" : "THÀNH VIÊN MỚI · VJU CLUBHUB"}
              </p>
              <h2 id="auth-modal-title" className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 lg:text-2xl">
                {mode === "login" ? "Đăng nhập hệ thống" : "Hãy gia nhập cộng đồng CLB"}
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

          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 md:mt-4">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-lg py-2 text-xs font-bold transition-all sm:text-sm ${
                mode === "login"
                  ? "bg-white text-primary shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`rounded-lg py-2 text-xs font-bold transition-all sm:text-sm ${
                mode === "register"
                  ? "bg-white text-primary shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Hãy gia nhập (Đăng ký)
            </button>
          </div>

          {googleOn && (
            <div className="mt-4 grid gap-2">
              <p className="text-center text-xs font-medium text-slate-600">
                Sinh viên VJU: bấm 1 lần với email trường{" "}
                <span className="font-semibold text-slate-800">@{google.data?.allowedDomains[0]}</span>{" "}
                để gia nhập hoặc đăng nhập ngay
              </p>
              <GoogleSignInButton
                onSignedIn={handleAuthSuccess}
                width={360}
                mode={mode === "register" ? "signup" : "signin"}
              />
              <OrDivider />
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={submitLogin} className="mt-4 grid gap-3.5 sm:mt-5 sm:gap-4">
              <FormField label="Địa chỉ email">
                <Input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sinhvien@st.vju.ac.vn" className="h-10 rounded-lg border-slate-300 bg-white px-3.5 text-sm text-slate-900" />
              </FormField>
              <FormField label="Mật khẩu">
                <Input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-10 rounded-lg border-slate-300 bg-white px-3.5 text-sm text-slate-900" />
              </FormField>
              {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">{error}</p>}
              <button type="submit" disabled={loading} className="mt-1 flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-60">
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
            </form>
          ) : (
            <form onSubmit={submitRegister} className="mt-4 grid gap-2.5 sm:gap-3">
              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                <FormField label="Họ và tên">
                  <Input required type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" className="h-10 rounded-lg border-slate-300 bg-white px-3 text-sm text-slate-900" />
                </FormField>
                <FormField label="Mã sinh viên">
                  <Input type="text" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} placeholder="VD: 23110209" className="h-10 rounded-lg border-slate-300 bg-white px-3 text-sm text-slate-900" />
                </FormField>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                <FormField label="Địa chỉ email">
                  <Input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sinhvien@st.vju.ac.vn" className="h-10 rounded-lg border-slate-300 bg-white px-3 text-sm text-slate-900" />
                </FormField>
                <FormField label="Số điện thoại">
                  <Input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" className="h-10 rounded-lg border-slate-300 bg-white px-3 text-sm text-slate-900" />
                </FormField>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                <FormField label="Mật khẩu (8+ ký tự)">
                  <Input required type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-10 rounded-lg border-slate-300 bg-white px-3 text-sm text-slate-900" />
                </FormField>
                <FormField label="Xác nhận mật khẩu">
                  <Input required type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="h-10 rounded-lg border-slate-300 bg-white px-3 text-sm text-slate-900" />
                </FormField>
              </div>
              {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700">{error}</p>}
              <button type="submit" disabled={loading} className="mt-1 flex h-10 sm:h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-60">
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
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
