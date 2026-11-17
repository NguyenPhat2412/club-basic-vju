import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import type { PermissionItem, Role, User } from "@/lib/api";
import {
  ALL_DEPARTMENTS_VALUE,
  analyzeUserDrawerDrafts,
  canGrantAtScope,
  EMPTY_DIRECT_PERM_DRAFT,
  EMPTY_ROLE_DRAFT,
  resolveNextPermScope,
  toAssignment,
  toDirectPermissionPayload,
} from "@/utils/access/user-access-draft";

const SRC_ROOT = path.join(process.cwd(), "src");

const ROLES: Role[] = [
  {
    id: "role-global",
    code: "ADMIN",
    name: "Quản trị viên",
    scope: "GLOBAL",
    system: true,
    active: true,
    locked: true,
    permissionKeys: [],
  },
  {
    id: "role-club",
    code: "CLUB_PRESIDENT",
    name: "Chủ nhiệm CLB",
    scope: "CLUB",
    system: true,
    active: true,
    locked: false,
    permissionKeys: [],
  },
  {
    id: "role-dept",
    code: "DEPT_HEAD",
    name: "Trưởng ban",
    scope: "DEPARTMENT",
    system: true,
    active: true,
    locked: false,
    permissionKeys: [],
  },
];

const PERMISSIONS: PermissionItem[] = [
  {
    id: "perm-global",
    permissionKey: "user.create",
    module: "user",
    action: "create",
    scope: "GLOBAL",
    active: true,
  },
  {
    id: "perm-club",
    permissionKey: "club.update",
    module: "club",
    action: "update",
    scope: "CLUB",
    active: true,
  },
  {
    id: "perm-dept",
    permissionKey: "application.approve",
    module: "application",
    action: "approve",
    scope: "DEPARTMENT",
    active: true,
  },
];

const BASE_USER: User = {
  id: "u-1",
  email: "24110228@st.vju.ac.vn",
  fullName: "Nguyễn Minh Khoa",
  studentCode: "24110228",
  phone: "0901234567",
  avatarUrl: "",
  status: "ACTIVE",
};

test("canGrantAtScope mirrors ScopeRules.java and resolveNextPermScope syncs fields below to selected permission scope", () => {
  assert.equal(canGrantAtScope("DEPARTMENT", "DEPARTMENT"), true);
  assert.equal(canGrantAtScope("DEPARTMENT", "CLUB"), true);
  assert.equal(canGrantAtScope("DEPARTMENT", "GLOBAL"), true);
  assert.equal(canGrantAtScope("CLUB", "DEPARTMENT"), false);
  assert.equal(canGrantAtScope("CLUB", "CLUB"), true);
  assert.equal(canGrantAtScope("CLUB", "GLOBAL"), true);
  assert.equal(canGrantAtScope("GLOBAL", "CLUB"), false);
  assert.equal(canGrantAtScope("GLOBAL", "GLOBAL"), true);

  // Selecting a permission always syncs Phạm vi áp dụng below to that permission's natural scope
  assert.equal(resolveNextPermScope("CLUB", "DEPARTMENT"), "DEPARTMENT");
  assert.equal(resolveNextPermScope("GLOBAL", "DEPARTMENT"), "DEPARTMENT");
  assert.equal(resolveNextPermScope("GLOBAL", "CLUB"), "CLUB");
  assert.equal(resolveNextPermScope("DEPARTMENT", "CLUB"), "CLUB");
  assert.equal(resolveNextPermScope("DEPARTMENT", "GLOBAL"), "GLOBAL");
  assert.equal(resolveNextPermScope("CLUB", "GLOBAL"), "GLOBAL");
  assert.equal(resolveNextPermScope("CLUB", undefined), "CLUB");
});

test("toAssignment supports GLOBAL, CLUB, and DEPARTMENT roles both club-wide and per-department", () => {
  assert.equal(toAssignment(EMPTY_ROLE_DRAFT, ROLES), null);

  assert.deepEqual(
    toAssignment({ roleId: "role-global", clubId: "", departmentId: "" }, ROLES),
    { roleId: "role-global", scope: "GLOBAL" }
  );

  assert.equal(toAssignment({ roleId: "role-club", clubId: "", departmentId: "" }, ROLES), null);
  assert.deepEqual(
    toAssignment({ roleId: "role-club", clubId: "club-1", departmentId: "" }, ROLES),
    { roleId: "role-club", scope: "CLUB", clubId: "club-1" }
  );

  // DEPARTMENT role requires clubId, allows club-wide (scope: CLUB) when departmentId is empty
  assert.equal(toAssignment({ roleId: "role-dept", clubId: "", departmentId: "" }, ROLES), null);
  assert.deepEqual(
    toAssignment({ roleId: "role-dept", clubId: "club-1", departmentId: "" }, ROLES),
    { roleId: "role-dept", scope: "CLUB", clubId: "club-1" }
  );

  // DEPARTMENT role with specific department sends scope: DEPARTMENT + departmentId (no clubId)
  assert.deepEqual(
    toAssignment({ roleId: "role-dept", clubId: "club-1", departmentId: "dept-9" }, ROLES),
    { roleId: "role-dept", scope: "DEPARTMENT", departmentId: "dept-9" }
  );
});

test("toDirectPermissionPayload enforces ScopeRules.targetMatches across GLOBAL, CLUB, and DEPARTMENT", () => {
  assert.equal(toDirectPermissionPayload(EMPTY_DIRECT_PERM_DRAFT, PERMISSIONS), null);

  // Scope mismatch rejected (GLOBAL perm cannot be granted at CLUB scope)
  assert.equal(
    toDirectPermissionPayload(
      { permissionId: "perm-global", scope: "CLUB", clubId: "club-1", departmentId: "", reason: "" },
      PERMISSIONS
    ),
    null
  );

  // GLOBAL payload omits clubId & departmentId
  assert.deepEqual(
    toDirectPermissionPayload(
      { permissionId: "perm-global", scope: "GLOBAL", clubId: "club-1", departmentId: "dept-1", reason: "  Hệ thống  " },
      PERMISSIONS
    ),
    { permissionId: "perm-global", scope: "GLOBAL", reason: "Hệ thống" }
  );

  // DEPARTMENT permission granted at CLUB scope (club-wide)
  assert.equal(
    toDirectPermissionPayload(
      { permissionId: "perm-dept", scope: "CLUB", clubId: "", departmentId: "", reason: "" },
      PERMISSIONS
    ),
    null
  );
  assert.deepEqual(
    toDirectPermissionPayload(
      { permissionId: "perm-dept", scope: "CLUB", clubId: "club-1", departmentId: "", reason: "" },
      PERMISSIONS
    ),
    { permissionId: "perm-dept", scope: "CLUB", clubId: "club-1" }
  );
  assert.deepEqual(
    toDirectPermissionPayload(
      { permissionId: "perm-dept", scope: "DEPARTMENT", clubId: "club-1", departmentId: ALL_DEPARTMENTS_VALUE, reason: "" },
      PERMISSIONS
    ),
    { permissionId: "perm-dept", scope: "CLUB", clubId: "club-1" }
  );

  // DEPARTMENT scope sends departmentId ONLY (never clubId, matching ScopeRules.targetMatches)
  const deptPayload = toDirectPermissionPayload(
    { permissionId: "perm-dept", scope: "DEPARTMENT", clubId: "club-1", departmentId: "dept-2", reason: "Phụ trách ban" },
    PERMISSIONS
  );
  assert.deepEqual(deptPayload, {
    permissionId: "perm-dept",
    scope: "DEPARTMENT",
    departmentId: "dept-2",
    reason: "Phụ trách ban",
  });
  assert.equal("clubId" in (deptPayload ?? {}), false);
});

test("analyzeUserDrawerDrafts detects savable changes, incomplete drafts, and unsaved close protection", () => {
  const baseProfile = {
    fullName: BASE_USER.fullName ?? "",
    studentCode: BASE_USER.studentCode ?? "",
    phone: BASE_USER.phone ?? "",
    avatarUrl: BASE_USER.avatarUrl ?? "",
  };

  const clean = analyzeUserDrawerDrafts({
    user: BASE_USER,
    profile: baseProfile,
    roleDraft: EMPTY_ROLE_DRAFT,
    roles: ROLES,
    permDraft: EMPTY_DIRECT_PERM_DRAFT,
    permissions: PERMISSIONS,
  });
  assert.equal(clean.profileDirty, false);
  assert.equal(clean.hasSavableChanges, false);
  assert.equal(clean.hasAnyUnsavedInput, false);
  assert.equal(clean.hasIncompleteRole, false);
  assert.equal(clean.hasIncompletePerm, false);

  const incompletePerm = analyzeUserDrawerDrafts({
    user: BASE_USER,
    profile: baseProfile,
    roleDraft: EMPTY_ROLE_DRAFT,
    roles: ROLES,
    permDraft: { permissionId: "perm-dept", scope: "CLUB", clubId: "", departmentId: "", reason: "" },
    permissions: PERMISSIONS,
  });
  assert.equal(incompletePerm.hasIncompletePerm, true);
  assert.equal(incompletePerm.hasSavableChanges, false);
  assert.equal(incompletePerm.hasAnyUnsavedInput, true);

  const completeCombo = analyzeUserDrawerDrafts({
    user: BASE_USER,
    profile: { ...baseProfile, phone: "0988888888" },
    roleDraft: { roleId: "role-dept", clubId: "club-1", departmentId: "" },
    roles: ROLES,
    permDraft: { permissionId: "perm-dept", scope: "CLUB", clubId: "club-1", departmentId: "", reason: "" },
    permissions: PERMISSIONS,
  });
  assert.equal(completeCombo.profileDirty, true);
  assert.equal(completeCombo.hasIncompleteRole, false);
  assert.equal(completeCombo.hasIncompletePerm, false);
  assert.equal(completeCombo.hasSavableChanges, true);
  assert.equal(completeCombo.hasAnyUnsavedInput, true);
  assert.deepEqual(completeCombo.rolePayload, { roleId: "role-dept", scope: "CLUB", clubId: "club-1" });
  assert.deepEqual(completeCombo.permPayload, { permissionId: "perm-dept", scope: "CLUB", clubId: "club-1" });
});

test("all profile, user management, and RolePicker modules stay <= 400 lines and wire shared query keys", () => {
  const checkedFiles = [
    "components/profile/ProfileView.tsx",
    "components/profile/ProfileMembershipsCard.tsx",
    "components/club/MyMembershipsView.tsx",
    "components/shared/RolePicker.tsx",
    "components/user/UserPermissionsSections.tsx",
    "components/user/UserDetailDrawer.tsx",
    "components/user/UsersManagementView.tsx",
    "components/user/UserAccountModals.tsx",
    "utils/access/user-access-draft.ts",
  ];

  for (const rel of checkedFiles) {
    const content = fs.readFileSync(path.join(SRC_ROOT, rel), "utf8");
    const lines = content.split("\n").length;
    assert.ok(lines <= 400, `Expected ${rel} <= 400 lines, got ${lines}`);
  }

  const profileView = fs.readFileSync(path.join(SRC_ROOT, "components/profile/ProfileView.tsx"), "utf8");
  const profileMemberships = fs.readFileSync(
    path.join(SRC_ROOT, "components/profile/ProfileMembershipsCard.tsx"),
    "utf8"
  );
  const drawer = fs.readFileSync(path.join(SRC_ROOT, "components/user/UserDetailDrawer.tsx"), "utf8");

  assert.ok(profileView.includes("<ProfileMembershipsCard"), "ProfileView must render ProfileMembershipsCard");
  assert.ok(profileView.includes("qk.myMemberships("), "ProfileView refresh must invalidate my-memberships");
  assert.ok(profileMemberships.includes("qk.myMemberships("), "ProfileMembershipsCard must share my-memberships key");
  assert.ok(drawer.includes("handleSaveAll"), "UserDetailDrawer must wire sticky footer handleSaveAll");
  assert.ok(drawer.includes("handleRequestClose"), "UserDetailDrawer must guard unsaved drafts on close");
});
