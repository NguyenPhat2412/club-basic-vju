import type {
  ForgotPasswordInput,
  RegisterInput,
  ResetPasswordWithOtpInput,
} from '@/types/auth/auth.types';

export type AuthModalMode = 'login' | 'register' | 'forgot' | null;

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

export interface ForgotPasswordDraft {
  email: string;
  studentCode: string;
  note: string;
}

export interface ResetPasswordOtpDraft {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export type LoginFieldErrors = Partial<Record<keyof LoginDraft, string>>;
export type RegisterFieldErrors = Partial<Record<keyof RegisterDraft, string>>;
export type ForgotPasswordFieldErrors = Partial<Record<keyof ForgotPasswordDraft, string>>;
export type ResetPasswordOtpFieldErrors = Partial<Record<keyof ResetPasswordOtpDraft, string>>;

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

export function emptyForgotPasswordDraft(): ForgotPasswordDraft {
  return {
    email: '',
    studentCode: '',
    note: '',
  };
}

export function canSubmitLogin(draft: LoginDraft): boolean {
  return Boolean(draft.email.trim() && draft.password);
}

// mirrors LoginRequest / RegisterRequest / PasswordValidator / UserConstants.PHONE_PATTERN on the backend
const PHONE_PATTERN = /^[0-9+().\- ]*$/;
const EMAIL_PATTERN = /^[^\s@]+@(?:localhost|(?:[^\s@.]+\.)+[^\s@.]+)$/i;
const OTP_PATTERN = /^\d{6}$/;

function validateNewPasswordValue(password: string): string | undefined {
  if (!password) {
    return 'Vui lòng nhập mật khẩu.';
  }
  if (!password.trim()) {
    return 'Mật khẩu không được chỉ gồm khoảng trắng.';
  }
  if (password.length < 8) {
    return 'Mật khẩu phải có tối thiểu 8 ký tự.';
  }
  if (new TextEncoder().encode(password).length > 72) {
    return 'Mật khẩu quá dài (tối đa khoảng 72 ký tự không dấu).';
  }
  return undefined;
}

export function validateLoginFields(draft: LoginDraft): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const email = draft.email.trim();
  if (!email) {
    errors.email = 'Vui lòng nhập địa chỉ email.';
  } else if (email.length > 320) {
    errors.email = 'Email tối đa 320 ký tự.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Địa chỉ email không đúng định dạng.';
  }

  if (!draft.password) {
    errors.password = 'Vui lòng nhập mật khẩu.';
  } else if (draft.password.length > 256) {
    errors.password = 'Mật khẩu quá dài.';
  }

  return errors;
}

export function validateRegisterFields(draft: RegisterDraft): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const fullName = draft.fullName.trim();
  if (!fullName) {
    errors.fullName = 'Vui lòng nhập họ và tên.';
  } else if (fullName.length > 200) {
    errors.fullName = 'Họ và tên tối đa 200 ký tự.';
  }

  const email = draft.email.trim();
  if (!email) {
    errors.email = 'Vui lòng nhập email.';
  } else if (email.length > 320) {
    errors.email = 'Email quá dài.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Địa chỉ email không đúng định dạng.';
  }

  if (draft.studentCode.trim().length > 50) {
    errors.studentCode = 'Mã sinh viên tối đa 50 ký tự.';
  }

  const phone = draft.phone.trim();
  if (phone.length > 32 || !PHONE_PATTERN.test(phone)) {
    errors.phone = 'Số điện thoại chỉ gồm chữ số, dấu +, ( ), - hoặc khoảng trắng.';
  }

  const pwError = validateNewPasswordValue(draft.password);
  if (pwError) {
    errors.password = pwError;
  }

  if (!draft.confirmPassword) {
    errors.confirmPassword = 'Vui lòng nhập lại mật khẩu xác nhận.';
  } else if (draft.password !== draft.confirmPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
  }

  return errors;
}

const REGISTER_FIELD_ORDER: (keyof RegisterDraft)[] = [
  'fullName',
  'email',
  'studentCode',
  'phone',
  'password',
  'confirmPassword',
];

export function validateRegisterDraft(draft: RegisterDraft): string | null {
  const errors = validateRegisterFields(draft);
  for (const key of REGISTER_FIELD_ORDER) {
    if (errors[key]) return errors[key] ?? null;
  }
  return null;
}

export function validateForgotPasswordFields(draft: ForgotPasswordDraft): ForgotPasswordFieldErrors {
  const errors: ForgotPasswordFieldErrors = {};
  const email = draft.email.trim();
  if (!email) {
    errors.email = 'Vui lòng nhập địa chỉ email.';
  } else if (email.length > 320) {
    errors.email = 'Email tối đa 320 ký tự.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Địa chỉ email không đúng định dạng.';
  }

  if (draft.studentCode.trim().length > 50) {
    errors.studentCode = 'Mã sinh viên tối đa 50 ký tự.';
  }

  if (draft.note.trim().length > 500) {
    errors.note = 'Ghi chú xác minh tối đa 500 ký tự.';
  }

  return errors;
}

export function validateResetPasswordOtpFields(
  draft: ResetPasswordOtpDraft,
): ResetPasswordOtpFieldErrors {
  const errors: ResetPasswordOtpFieldErrors = {};
  const email = draft.email.trim();
  if (!email) {
    errors.email = 'Vui lòng nhập địa chỉ email.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Địa chỉ email không đúng định dạng.';
  }

  const otp = draft.otp.trim();
  if (!otp) {
    errors.otp = 'Vui lòng nhập mã xác thực OTP 6 chữ số.';
  } else if (!OTP_PATTERN.test(otp)) {
    errors.otp = 'Mã xác thực OTP phải gồm đúng 6 chữ số.';
  }

  const pwError = validateNewPasswordValue(draft.newPassword);
  if (pwError) {
    errors.newPassword = pwError;
  }

  if (!draft.confirmPassword) {
    errors.confirmPassword = 'Vui lòng nhập lại mật khẩu xác nhận.';
  } else if (draft.newPassword !== draft.confirmPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
  }

  return errors;
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

export function toForgotPasswordPayload(draft: ForgotPasswordDraft): ForgotPasswordInput {
  return {
    email: draft.email.trim(),
    studentCode: draft.studentCode.trim() || undefined,
    note: draft.note.trim() || undefined,
  };
}

export function toResetPasswordOtpPayload(draft: ResetPasswordOtpDraft): ResetPasswordWithOtpInput {
  return {
    email: draft.email.trim(),
    otp: draft.otp.trim(),
    newPassword: draft.newPassword,
  };
}
