import type { RoleAssignmentInput } from '@/types/access/access.types';
import type { CreateUserInput, UpdateUserInput, User } from '@/types/user/user.types';

export interface CreateUserDraft {
  email: string;
  fullName: string;
  studentCode: string;
  phone: string;
  password: string;
  requiresPasswordChange: boolean;
}

export type CreateUserFormValues = CreateUserDraft;

export const EMPTY_CREATE_USER_FORM: CreateUserDraft = {
  email: '',
  fullName: '',
  studentCode: '',
  phone: '',
  password: '',
  requiresPasswordChange: true,
};

export interface EditUserDraft {
  fullName: string;
  studentCode: string;
  phone: string;
  avatarUrl: string;
}

export function emptyCreateUserDraft(): CreateUserDraft {
  return { ...EMPTY_CREATE_USER_FORM };
}

export function userToEditDraft(user: User): EditUserDraft {
  return {
    fullName: user.fullName ?? '',
    studentCode: user.studentCode ?? '',
    phone: user.phone ?? '',
    avatarUrl: user.avatarUrl ?? '',
  };
}

export function canSubmitCreateUser(draft: CreateUserDraft): boolean {
  return Boolean(draft.email.trim() && draft.fullName.trim());
}

export function toCreateUserPayload(
  draft: CreateUserDraft,
  roles?: RoleAssignmentInput[]
): CreateUserInput {
  return {
    email: draft.email.trim(),
    fullName: draft.fullName.trim(),
    studentCode: draft.studentCode.trim() || undefined,
    phone: draft.phone.trim() || undefined,
    password: draft.password || undefined,
    requiresPasswordChange: draft.requiresPasswordChange,
    roles: roles && roles.length > 0 ? roles : undefined,
  };
}

export function toUpdateUserPayload(draft: EditUserDraft): UpdateUserInput {
  return {
    fullName: draft.fullName.trim() || undefined,
    studentCode: draft.studentCode.trim() || undefined,
    phone: draft.phone.trim() || undefined,
    avatarUrl: draft.avatarUrl.trim() || undefined,
  };
}
