'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/user/users.api';
import type { CreateUserInput, UpdateUserInput, User, UserStatus } from '@/types/user/user.types';

export function useUsersList(query = '', offset = 0, limit = 20, enabled = true) {
  return useQuery({
    queryKey: ['users', query, offset, limit],
    queryFn: () => usersApi.users(query, offset, limit),
    enabled,
  });
}

export function useUserNames(enabled = true) {
  const { data } = useQuery({
    queryKey: ['users', 'lookup'],
    queryFn: () => usersApi.users('', 0, 100),
    enabled,
    staleTime: 60_000,
  });
  const byId = new Map<string, User>((data?.items ?? []).map((u) => [u.id, u]));
  return (id?: string) => (id ? byId.get(id) : undefined);
}

export function useUserMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['system-statistics'] });
  };

  const createUser = useMutation({
    mutationFn: (body: CreateUserInput) => usersApi.createUser(body),
    onSuccess: invalidate,
  });

  const updateUser = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateUserInput }) => usersApi.updateUser(id, body),
    onSuccess: invalidate,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) => usersApi.updateUserStatus(id, status),
    onSuccess: invalidate,
  });

  const resetPassword = useMutation({
    mutationFn: ({
      id,
      newPassword,
      requiresPasswordChange = true,
    }: {
      id: string;
      newPassword: string;
      requiresPasswordChange?: boolean;
    }) => usersApi.resetPassword(id, newPassword, requiresPasswordChange),
  });

  const deleteUser = useMutation({
    mutationFn: ({ id, anonymize }: { id: string; anonymize?: boolean }) => usersApi.deleteUser(id, anonymize),
    onSuccess: invalidate,
  });

  return { createUser, updateUser, updateStatus, resetPassword, deleteUser };
}
