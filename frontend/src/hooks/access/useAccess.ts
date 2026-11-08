'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accessApi } from '@/api/access/access.api';
import type { Scope } from '@/types/common.types';
import type { AssignClubPositionInput, GrantPermissionInput, RoleAssignmentInput } from '@/types/access/access.types';

export function useRolesList(enabled = true) {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => accessApi.roles(),
    enabled,
  });
}

export function usePermissionGroups(enabled = true) {
  return useQuery({
    queryKey: ['permission-groups'],
    queryFn: () => accessApi.permissionGroups(),
    enabled,
  });
}

export function useClubPositions(clubId: string, enabled = true) {
  return useQuery({
    queryKey: ['club-positions', clubId],
    queryFn: () => accessApi.clubPositions(clubId),
    enabled: Boolean(clubId && enabled),
  });
}

export function useAccessMutations(clubId?: string) {
  const queryClient = useQueryClient();
  const invalidateRoles = () => {
    queryClient.invalidateQueries({ queryKey: ['roles'] });
    if (clubId) queryClient.invalidateQueries({ queryKey: ['club-positions', clubId] });
  };

  const createRole = useMutation({
    mutationFn: (body: { code: string; name: string; description?: string; scope: Scope; permissionIds: string[] }) =>
      accessApi.createRole(body),
    onSuccess: invalidateRoles,
  });

  const updateRolePermissions = useMutation({
    mutationFn: ({ id, permissionIds }: { id: string; permissionIds: string[] }) =>
      accessApi.updateRolePermissions(id, permissionIds),
    onSuccess: invalidateRoles,
  });

  const assignRole = useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: RoleAssignmentInput }) =>
      accessApi.assignRole(userId, body),
    onSuccess: (_d, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions', userId] });
    },
  });

  const grantPermission = useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: GrantPermissionInput }) =>
      accessApi.grantPermission(userId, body),
    onSuccess: (_d, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions', userId] });
    },
  });

  const assignClubPosition = useMutation({
    mutationFn: ({ targetClubId, body }: { targetClubId: string; body: AssignClubPositionInput }) =>
      accessApi.assignClubPosition(targetClubId, body),
    onSuccess: (_d, { targetClubId }) => {
      queryClient.invalidateQueries({ queryKey: ['club-positions', targetClubId] });
    },
  });

  return { createRole, updateRolePermissions, assignRole, grantPermission, assignClubPosition };
}
