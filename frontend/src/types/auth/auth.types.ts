import type { User } from '@/types/user/user.types';

export type GoogleSignInConfig = {
  enabled: boolean;
  clientId: string | null;
  allowedDomains: string[];
};

export type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  studentCode?: string;
  phone?: string;
};

export type ForgotPasswordInput = {
  email: string;
  studentCode?: string;
  note?: string;
};

export type ForgotPasswordOtpResponse = {
  expirySeconds: number;
  resendCooldownSeconds: number;
  maxVerifyAttempts: number;
  mailConfigured: boolean;
};

export type ResetPasswordWithOtpInput = {
  email: string;
  otp: string;
  newPassword: string;
};

export type AuthUserEnvelope = {
  user: User;
};
