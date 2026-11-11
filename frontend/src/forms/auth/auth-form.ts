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

// mirrors RegisterRequest / PasswordValidator / UserConstants.PHONE_PATTERN on the backend
const PHONE_PATTERN = /^[0-9+().\- ]*$/;

export function validateRegisterDraft(draft: RegisterDraft): string | null {
  if (!draft.fullName.trim()) return 'Vui lòng nhập họ và tên.';
  if (draft.fullName.trim().length > 200) return 'Họ và tên tối đa 200 ký tự.';
  if (!draft.email.trim()) return 'Vui lòng nhập email.';
  if (draft.email.trim().length > 320) return 'Email quá dài.';
  if (draft.studentCode.trim().length > 50) return 'Mã sinh viên tối đa 50 ký tự.';
  if (draft.phone.trim().length > 32 || !PHONE_PATTERN.test(draft.phone.trim()))
    return 'Số điện thoại chỉ gồm chữ số, dấu +, ( ), - hoặc khoảng trắng.';
  if (!draft.password.trim()) return 'Mật khẩu không được chỉ gồm khoảng trắng.';
  if (draft.password.length < 8) return 'Mật khẩu phải có tối thiểu 8 ký tự.';
  if (new TextEncoder().encode(draft.password).length > 72) return 'Mật khẩu quá dài (tối đa khoảng 72 ký tự không dấu).';
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
