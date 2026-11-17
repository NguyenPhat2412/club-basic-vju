import type {
  GrantPermissionInput,
  PermissionItem,
  Role,
  RoleAssignmentInput,
  Scope,
  User,
} from "@/lib/api";

export const ALL_DEPARTMENTS_VALUE = "__CLUB_WIDE__";

export type RoleDraft = {
  roleId: string;
  clubId: string;
  departmentId: string;
};

export const EMPTY_ROLE_DRAFT: RoleDraft = {
  roleId: "",
  clubId: "",
  departmentId: "",
};

export type DirectPermissionDraft = {
  permissionId: string;
  scope: Scope;
  clubId: string;
  departmentId: string;
  reason: string;
};

export const EMPTY_DIRECT_PERM_DRAFT: DirectPermissionDraft = {
  permissionId: "",
  scope: "CLUB",
  clubId: "",
  departmentId: "",
  reason: "",
};

const SCOPE_RANK: Record<Scope, number> = {
  DEPARTMENT: 0,
  CLUB: 1,
  GLOBAL: 2,
};

export function canGrantAtScope(itemScope: Scope, grantScope: Scope): boolean {
  return SCOPE_RANK[grantScope] >= SCOPE_RANK[itemScope];
}

export function resolveNextPermScope(currentScope: Scope, itemScope?: Scope): Scope {
  return itemScope ?? currentScope;
}

export function toAssignment(draft: RoleDraft, roles: Role[]): RoleAssignmentInput | null {
  const role = roles.find((r) => r.id === draft.roleId);
  if (!role) return null;
  if (role.scope === "GLOBAL") {
    return { roleId: role.id, scope: "GLOBAL" };
  }
  if (role.scope === "CLUB") {
    return draft.clubId ? { roleId: role.id, scope: "CLUB", clubId: draft.clubId } : null;
  }
  if (!draft.clubId) return null;
  if (draft.departmentId) {
    return { roleId: role.id, scope: "DEPARTMENT", departmentId: draft.departmentId };
  }
  return { roleId: role.id, scope: "CLUB", clubId: draft.clubId };
}

export function toDirectPermissionPayload(
  draft: DirectPermissionDraft,
  permissions: PermissionItem[],
): GrantPermissionInput | null {
  if (!draft.permissionId) return null;
  const perm = permissions.find((p) => p.id === draft.permissionId);
  if (!perm || !canGrantAtScope(perm.scope, draft.scope)) return null;

  const reason = draft.reason.trim() || undefined;
  const withReason = reason ? { reason } : {};

  if (draft.scope === "GLOBAL") {
    return { permissionId: perm.id, scope: "GLOBAL", ...withReason };
  }
  if (draft.scope === "CLUB") {
    if (!draft.clubId) return null;
    return { permissionId: perm.id, scope: "CLUB", clubId: draft.clubId, ...withReason };
  }
  if (draft.departmentId === ALL_DEPARTMENTS_VALUE) {
    if (!draft.clubId) return null;
    return { permissionId: perm.id, scope: "CLUB", clubId: draft.clubId, ...withReason };
  }
  if (!draft.departmentId) return null;
  return {
    permissionId: perm.id,
    scope: "DEPARTMENT",
    departmentId: draft.departmentId,
    ...withReason,
  };
}

export type UserProfileDraft = {
  fullName: string;
  studentCode: string;
  phone: string;
  avatarUrl: string;
};

export type AnalyzeUserDrawerInput = {
  user: Pick<User, "fullName" | "studentCode" | "phone" | "avatarUrl"> | null;
  profile: UserProfileDraft;
  canUpdateUser?: boolean;
  canAssign?: boolean;
  roleDraft: RoleDraft;
  roles: Role[];
  permDraft: DirectPermissionDraft;
  permissions: PermissionItem[];
};

export type UserDrawerDraftAnalysis = {
  profileDirty: boolean;
  hasIncompleteProfile: boolean;
  rolePayload: RoleAssignmentInput | null;
  permPayload: GrantPermissionInput | null;
  hasIncompleteRole: boolean;
  hasIncompletePerm: boolean;
  hasSavableChanges: boolean;
  hasAnyUnsavedInput: boolean;
};

export function analyzeUserDrawerDrafts({
  user,
  profile,
  canUpdateUser = true,
  canAssign = true,
  roleDraft,
  roles,
  permDraft,
  permissions,
}: AnalyzeUserDrawerInput): UserDrawerDraftAnalysis {
  const profileEdited =
    Boolean(user) &&
    canUpdateUser &&
    (profile.fullName.trim() !== (user?.fullName ?? "").trim() ||
      profile.studentCode.trim() !== (user?.studentCode ?? "").trim() ||
      profile.phone.trim() !== (user?.phone ?? "").trim() ||
      profile.avatarUrl.trim() !== (user?.avatarUrl ?? "").trim());

  const hasIncompleteProfile = profileEdited && !profile.fullName.trim();
  const profileDirty = profileEdited && Boolean(profile.fullName.trim());

  const rolePayload = canAssign ? toAssignment(roleDraft, roles) : null;
  const permPayload = canAssign ? toDirectPermissionPayload(permDraft, permissions) : null;

  const hasIncompleteRole = canAssign && Boolean(roleDraft.roleId) && !rolePayload;
  const hasIncompletePerm = canAssign && Boolean(permDraft.permissionId) && !permPayload;
  const hasSavableChanges = profileDirty || Boolean(rolePayload) || Boolean(permPayload);
  const hasAnyUnsavedInput =
    profileEdited ||
    (canAssign && Boolean(roleDraft.roleId)) ||
    (canAssign && Boolean(permDraft.permissionId));

  return {
    profileDirty,
    hasIncompleteProfile,
    rolePayload,
    permPayload,
    hasIncompleteRole,
    hasIncompletePerm,
    hasSavableChanges,
    hasAnyUnsavedInput,
  };
}
