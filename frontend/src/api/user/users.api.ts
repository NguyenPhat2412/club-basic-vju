import { api, cleanParams } from '@/lib/api/client';
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
  updateUserStatus: (id: string, status: UserStatus) =>
    api<User>(API_ROUTES.users.status(id), {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
