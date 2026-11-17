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
  googleLogin: (credential: string, register = true) =>
    api<AuthUserEnvelope>(API_ROUTES.auth.google, {
      method: 'POST',
      body: JSON.stringify({ credential, register }),
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
