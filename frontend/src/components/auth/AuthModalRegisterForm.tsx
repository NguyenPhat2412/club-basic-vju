"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, UserPlus } from "lucide-react";
import { apiModel, type AuthUserEnvelope } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { FormField, Input, PasswordInput } from "@/components/ui/input";
import {
  RegisterFieldErrors,
  toRegisterPayload,
  validateRegisterFields,
} from "@/forms/auth/auth-form";
import { toast } from "@/components/ui/toast";

export function AuthModalRegisterForm({
  email,
  password,
  loading,
  inputCls,
  onEmailChange,
  onPasswordChange,
  onLoadingChange,
  onSwitchToLogin,
  onSuccess,
}: {
  email: string;
  password: string;
  loading: boolean;
  inputCls: (hasError?: boolean, pad?: string) => string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onLoadingChange: (loading: boolean) => void;
  onSwitchToLogin: () => void;
  onSuccess: (envelope?: AuthUserEnvelope) => Promise<void>;
}) {
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [phone, setPhone] = useState("");
  const [registerErrors, setRegisterErrors] = useState<RegisterFieldErrors>({});

  const clearRegisterError = (field: keyof RegisterFieldErrors) =>
    setRegisterErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const submitRegister = async (event: FormEvent) => {
    event.preventDefault();
    const draft = { fullName, studentCode, email, phone, password, confirmPassword };
    const fieldErrors = validateRegisterFields(draft);
    if (Object.keys(fieldErrors).length > 0) {
      setRegisterErrors(fieldErrors);
      return;
    }
    onLoadingChange(true);
    try {
      const envelope = await apiModel.register(toRegisterPayload(draft));
      await onSuccess(envelope);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      onLoadingChange(false);
    }
  };

  return (
    <form noValidate onSubmit={submitRegister} className="mt-4 flex flex-1 flex-col justify-between gap-3">
      <div className="grid gap-2.5 sm:gap-3">
        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          <FormField label="Họ và tên" required error={registerErrors.fullName}>
            <Input
              type="text" maxLength={200} autoComplete="name" aria-invalid={Boolean(registerErrors.fullName)}
              value={fullName} onChange={(e) => { setFullName(e.target.value); clearRegisterError("fullName"); }}
              placeholder="Nguyễn Văn A" className={inputCls(Boolean(registerErrors.fullName))}
            />
          </FormField>
          <FormField label="Mã sinh viên" error={registerErrors.studentCode}>
            <Input
              type="text" maxLength={50} aria-invalid={Boolean(registerErrors.studentCode)}
              value={studentCode} onChange={(e) => { setStudentCode(e.target.value); clearRegisterError("studentCode"); }}
              placeholder="VD: 23110209" className={inputCls(Boolean(registerErrors.studentCode))}
            />
          </FormField>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          <FormField label="Địa chỉ email" required error={registerErrors.email}>
            <Input
              type="email" maxLength={320} autoComplete="email" aria-invalid={Boolean(registerErrors.email)}
              value={email} onChange={(e) => { onEmailChange(e.target.value); clearRegisterError("email"); }}
              placeholder="sinhvien@st.vju.ac.vn" className={inputCls(Boolean(registerErrors.email))}
            />
          </FormField>
          <FormField label="Số điện thoại" error={registerErrors.phone}>
            <Input
              type="tel" maxLength={32} autoComplete="tel" aria-invalid={Boolean(registerErrors.phone)}
              value={phone} onChange={(e) => { setPhone(e.target.value); clearRegisterError("phone"); }}
              placeholder="0901234567" className={inputCls(Boolean(registerErrors.phone))}
            />
          </FormField>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          <FormField label="Mật khẩu (8+ ký tự)" required error={registerErrors.password}>
            <PasswordInput
              autoComplete="new-password" maxLength={72} aria-invalid={Boolean(registerErrors.password)}
              value={password} onChange={(e) => { onPasswordChange(e.target.value); clearRegisterError("password"); }}
              placeholder="••••••••" className={inputCls(Boolean(registerErrors.password))}
            />
          </FormField>
          <FormField label="Xác nhận mật khẩu" required error={registerErrors.confirmPassword}>
            <PasswordInput
              autoComplete="new-password" maxLength={72} aria-invalid={Boolean(registerErrors.confirmPassword)}
              value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); clearRegisterError("confirmPassword"); }}
              placeholder="••••••••" className={inputCls(Boolean(registerErrors.confirmPassword))}
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
          <button type="button" onClick={onSwitchToLogin} className="font-bold text-primary hover:underline">
            Đăng nhập tại đây →
          </button>
        </p>
      </div>
    </form>
  );
}
