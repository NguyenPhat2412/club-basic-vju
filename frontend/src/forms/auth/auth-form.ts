import type { RegisterInput } from '@/types/auth/auth.types';

export type AuthModalMode = 'login' | 'register' | null;

export interface LoginDraft {
  email: string;
  password: string;
}

export interface RegisterDraft {
  fullName: string;
  email: string;
  studentCode: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export function emptyLoginDraft(): LoginDraft {
  return { email: '', password: '' };
}

export function emptyRegisterDraft(): RegisterDraft {
  return {
    fullName: '',
    email: '',
    studentCode: '',
    phone: '',
    password: '',
    confirmPassword: '',
  };
}

export function canSubmitLogin(draft: LoginDraft): boolean {
  return Boolean(draft.email.trim() && draft.password);
}

export function validateRegisterDraft(draft: RegisterDraft): string | null {
  if (!draft.fullName.trim()) return 'Vui lòng nhập họ và tên.';
  if (!draft.email.trim()) return 'Vui lòng nhập email.';
  if (draft.password.length < 8) return 'Mật khẩu phải có tối thiểu 8 ký tự.';
  if (draft.password !== draft.confirmPassword) return 'Mật khẩu xác nhận không khớp.';
  return null;
}

export function toRegisterPayload(draft: RegisterDraft): RegisterInput {
  return {
    fullName: draft.fullName.trim(),
    email: draft.email.trim(),
    password: draft.password,
    studentCode: draft.studentCode.trim() || undefined,
    phone: draft.phone.trim() || undefined,
  };
}
