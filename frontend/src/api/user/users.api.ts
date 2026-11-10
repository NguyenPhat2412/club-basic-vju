import { api, apiForm, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Page } from '@/types/common.types';
import type { CreateUserInput, UpdateUserInput, User, UserStatus } from '@/types/user/user.types';

export const usersApi = {
  users: (query = '', offset = 0, limit = 20) =>
    api<Page<User>>(
      `${API_ROUTES.users.list}?${new URLSearchParams({ query, offset: String(offset), limit: String(limit) })}`
    ),
  createUser: (body: CreateUserInput) =>
    api<User>(API_ROUTES.users.list, { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: string, body: UpdateUserInput) =>
    api<User>(API_ROUTES.users.detail(id), { method: 'PATCH', body: JSON.stringify(body) }),
  deleteUser: (id: string, anonymize?: boolean) =>
    api<void>(
      `${API_ROUTES.users.detail(id)}${anonymize !== undefined ? `?${cleanParams({ anonymize })}` : ''}`,
      { method: 'DELETE' }
    ),
  resetPassword: (id: string, newPassword: string, requiresPasswordChange = true) =>
    api<void>(API_ROUTES.users.password(id), {
      method: 'PATCH',
      body: JSON.stringify({ newPassword, requiresPasswordChange }),
    }),
  uploadUserAvatar: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiForm<User>(API_ROUTES.users.avatar(id), form);
  },
  uploadMyAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiForm<User>(API_ROUTES.users.myAvatar, form);
  },
  updateUserStatus: (id: string, status: UserStatus) =>
    api<User>(API_ROUTES.users.status(id), {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
