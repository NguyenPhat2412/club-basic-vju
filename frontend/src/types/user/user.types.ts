import type { RoleAssignmentInput } from '@/types/access/access.types';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export type User = {
  id: string;
  email: string;
  fullName?: string;
  studentCode?: string;
  phone?: string;
  avatarUrl?: string;
  status: string;
  requiresPasswordChange?: boolean;
  anonymizedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateUserInput = {
  email: string;
  password?: string;
  fullName: string;
  studentCode?: string;
  phone?: string;
  requiresPasswordChange?: boolean;
  roles?: RoleAssignmentInput[];
};

export type UpdateUserInput = {
  fullName?: string;
  studentCode?: string;
  phone?: string;
  avatarUrl?: string;
};
