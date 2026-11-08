import { api, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Scope } from '@/types/common.types';
import type {
  AssignClubPositionInput,
  ClubStructure,
  EffectivePermission,
  GrantPermissionInput,
  PermissionGroup,
  Role,
  RoleAssignmentInput,
  UserPermission,
  UserRole,
} from '@/types/access/access.types';

export const accessApi = {
  roles: () => api<Role[]>(API_ROUTES.roles.list),
  createRole: (body: { code: string; name: string; description?: string; scope: Scope; permissionIds: string[] }) =>
    api<Role>(API_ROUTES.roles.list, { method: 'POST', body: JSON.stringify(body) }),
  updateRolePermissions: (id: string, permissionIds: string[]) =>
    api<Role>(API_ROUTES.roles.detail(id), { method: 'PATCH', body: JSON.stringify({ permissionIds }) }),
  permissionGroups: () => api<PermissionGroup[]>(API_ROUTES.roles.permissionGroups),
  userRoles: (userId: string) => api<UserRole[]>(API_ROUTES.users.roles(userId)),
  assignRole: (userId: string, body: RoleAssignmentInput) =>
    api<UserRole>(API_ROUTES.users.roles(userId), { method: 'POST', body: JSON.stringify(body) }),
  revokeRole: (userId: string, assignmentId: string) =>
    api<void>(API_ROUTES.users.roleAssignment(userId, assignmentId), { method: 'DELETE' }),
  userPermissions: (userId: string) => api<UserPermission[]>(API_ROUTES.users.permissions(userId)),
  userEffectivePermissions: (userId: string) =>
    api<EffectivePermission[]>(API_ROUTES.users.effectivePermissions(userId)),
  grantPermission: (userId: string, body: GrantPermissionInput) =>
    api<UserPermission>(API_ROUTES.users.permissions(userId), { method: 'POST', body: JSON.stringify(body) }),
  revokePermission: (
    userId: string,
    permissionId: string,
    q: { scope?: Scope; clubId?: string; departmentId?: string } = {}
  ) =>
    api<void>(
      `${API_ROUTES.users.permissionItem(userId, permissionId)}${cleanParams(q) ? `?${cleanParams(q)}` : ''}`,
      { method: 'DELETE' }
    ),
  effectivePermissions: () => api<EffectivePermission[]>(API_ROUTES.users.myEffectivePermissions),
  clubPositions: (clubId: string) => api<ClubStructure>(API_ROUTES.clubs.positions(clubId)),
  assignClubPosition: (clubId: string, body: AssignClubPositionInput) =>
    api<UserRole>(API_ROUTES.clubs.positions(clubId), { method: 'PUT', body: JSON.stringify(body) }),
  revokeClubPosition: (clubId: string, assignmentId: string) =>
    api<void>(API_ROUTES.clubs.positionItem(clubId, assignmentId), { method: 'DELETE' }),
};
