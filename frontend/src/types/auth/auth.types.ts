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

export type AuthUserEnvelope = {
  user: User;
};
