import { api } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type {
  AuthUserEnvelope,
  ForgotPasswordInput,
  ForgotPasswordOtpResponse,
  GoogleSignInConfig,
  RegisterInput,
  ResetPasswordWithOtpInput,
} from '@/types/auth/auth.types';
import type { User } from '@/types/user/user.types';

export type TwoFactorPurpose = 'LOGIN_2FA' | 'CRITICAL_ACTION';

export type TwoFactorSendInput = {
  purpose: TwoFactorPurpose;
  actionContext?: string;
  email?: string;
  password?: string;
  credential?: string;
};

export type TwoFactorSendResponse = {
  expirySeconds: number;
  resendCooldownSeconds: number;
  maxVerifyAttempts: number;
  mailConfigured: boolean;
  purpose: TwoFactorPurpose;
  actionContext?: string | null;
};

export type TwoFactorVerifyInput = {
  purpose: TwoFactorPurpose;
  actionContext?: string;
  otp: string;
  email?: string;
  password?: string;
  credential?: string;
};

export type TwoFactorVerifyResponse = {
  userId: string;
  email: string;
  purpose: TwoFactorPurpose;
  actionContext?: string | null;
};

export const authApi = {
  login: (email: string, password: string) =>
    api<AuthUserEnvelope>(API_ROUTES.auth.login, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (body: RegisterInput) =>
    api<AuthUserEnvelope>(API_ROUTES.auth.register, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  googleConfig: () => api<GoogleSignInConfig>(API_ROUTES.auth.googleConfig),
  googleLogin: (credential: string, register = true, otpCode?: string) =>
    api<AuthUserEnvelope>(API_ROUTES.auth.google, {
      method: 'POST',
      body: JSON.stringify({ credential, register, ...(otpCode ? { otpCode } : {}) }),
    }),
  requestPasswordReset: (body: ForgotPasswordInput) =>
    api<ForgotPasswordOtpResponse>(API_ROUTES.auth.forgotPassword, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  resetPasswordWithOtp: (body: ResetPasswordWithOtpInput) =>
    api<void>(API_ROUTES.auth.resetPassword, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  sendTwoFactorOtp: (body: TwoFactorSendInput) =>
    api<TwoFactorSendResponse>('/auth/2fa/send', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  verifyTwoFactorOtp: (body: TwoFactorVerifyInput) =>
    api<AuthUserEnvelope | TwoFactorVerifyResponse>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  setMyTwoFactor: (enabled: boolean, otpCode?: string) =>
    api<User>('/users/me/2fa', {
      method: 'PATCH',
      body: JSON.stringify({ enabled, otpCode }),
    }),
  logout: () => api<void>(API_ROUTES.auth.logout, { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<void>(API_ROUTES.auth.changePassword, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  me: () => api<User>(API_ROUTES.auth.me),
  updateProfile: (body: { fullName?: string; phone?: string; avatarUrl?: string }) =>
    api<User>(API_ROUTES.users.me, { method: 'PATCH', body: JSON.stringify(body) }),
};
