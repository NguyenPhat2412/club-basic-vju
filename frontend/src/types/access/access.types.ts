import type { Scope } from '@/types/common.types';

export type Role = {
  id: string;
  code: string;
  name: string;
  description?: string;
  scope: Scope;
  system: boolean;
  active: boolean;
  locked: boolean;
  maxHolders?: number | null;
  permissionKeys: string[];
};

export type UserRole = {
  id: string;
  userId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  scope: Scope;
  clubId?: string;
  departmentId?: string;
  grantedAt: string;
};

export type RoleAssignmentInput = {
  roleId: string;
  scope: Scope;
  clubId?: string;
  departmentId?: string;
  reason?: string;
};

export type UserPermission = {
  id: string;
  userId: string;
  permissionId: string;
  permissionKey: string;
  scope: Scope;
  clubId?: string;
  departmentId?: string;
  grantedAt: string;
  revokedAt?: string | null;
};

export type GrantPermissionInput = {
  permissionId: string;
  scope: Scope;
  clubId?: string;
  departmentId?: string;
  reason?: string;
};

export type ClubPositionHolder = {
  assignmentId: string;
  userId: string;
  fullName: string;
  email: string;
  studentCode?: string;
  avatarUrl?: string;
  grantedAt: string;
};

export type ClubPositionSlot = {
  roleId: string;
  roleCode: string;
  roleName: string;
  scope: Scope;
  departmentId?: string;
  departmentName?: string;
  departmentStatus?: string;
  maxHolders: number;
  holders: ClubPositionHolder[];
};

export type ClubStructure = {
  clubId: string;
  clubPositions: ClubPositionSlot[];
  departmentPositions: ClubPositionSlot[];
};

export type AssignClubPositionInput = {
  userId: string;
  roleId: string;
  departmentId?: string;
  replaceHolder?: boolean;
  reason?: string;
};

export type PermissionItem = {
  id: string;
  permissionKey: string;
  module: string;
  action: string;
  scope: Scope;
  description?: string;
  active: boolean;
};

export type PermissionGroup = {
  module: string;
  permissions: PermissionItem[];
};

export type EffectivePermission = {
  permissionKey: string;
  scope: string;
  clubId?: string;
  departmentId?: string;
  source: string;
  roleCode?: string;
};
