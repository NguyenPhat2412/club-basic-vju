"use client";
import { useQuery } from "@tanstack/react-query";
import { apiModel, EffectivePermission } from "@/lib/api";

export const CLUB_WORKSPACE_KEYS = [
  "club.update", "club.active", "club.inactive",
  "application.create", "application.view", "application.view_detail", "application.review", "application.approve", "application.reject",
  "application.manage_form", "application.update",
  "member.view", "member.view_detail", "member.add", "member.update", "member.remove",
  "department.view", "department.create", "department.update", "department.activate", "department.inactive",
  "department.member.view", "department.member.add", "department.member.remove",
  "event.view", "event.create", "event.update", "event.attendance",
  "task.view", "task.create", "task.verify",
  "chat.view", "chat.send", "chat.summarize",
  "notification.send",
];

export function useSession() {
  const me = useQuery({ queryKey: ["me"], queryFn: apiModel.me, staleTime: 60_000 });
  const mustChangePassword = !!me.data?.requiresPasswordChange;
  const permissions = useQuery({ queryKey: ["me", "permissions"], queryFn: apiModel.effectivePermissions, enabled: me.isSuccess && !mustChangePassword, staleTime: 60_000 });
  const list = permissions.data ?? [];
  return {
    user: me.data,
    mustChangePassword,
    permissions: list,
    ready: me.isSuccess && (mustChangePassword || permissions.isSuccess),
    can: (key: string) => list.some((p) => p.permissionKey === key),
    canInClub: (key: string, clubId: string) => hasClubPermission(list, key, clubId),
    canClubWide: (key: string, clubId: string) => hasClubWidePermission(list, key, clubId),
    canInDepartment: (key: string, clubId: string, departmentId?: string) =>
      hasDepartmentPermission(list, key, clubId, departmentId),
    clubsWith: (keys: string[]) => clubIdsWith(list, keys),
    departmentsWith: (keys: string[], clubId: string) => departmentIdsWith(list, keys, clubId),
  };
}

export function hasClubPermission(list: EffectivePermission[], key: string, clubId: string) {
  return list.some((p) => p.permissionKey === key && (p.scope === "GLOBAL" || p.clubId === clubId));
}

export function hasClubWidePermission(list: EffectivePermission[], key: string, clubId: string) {
  return list.some((p) => p.permissionKey === key && (p.scope === "GLOBAL" || (p.scope === "CLUB" && p.clubId === clubId)));
}

export function hasDepartmentPermission(list: EffectivePermission[], key: string, clubId: string, departmentId?: string) {
  return list.some(
    (p) =>
      p.permissionKey === key &&
      (p.scope === "GLOBAL" ||
        (p.scope === "CLUB" && p.clubId === clubId) ||
        (departmentId ? p.clubId === clubId && p.departmentId === departmentId : p.clubId === clubId))
  );
}

export function clubIdsWith(list: EffectivePermission[], keys: string[]) {
  const relevant = list.filter((p) => keys.includes(p.permissionKey));
  return {
    global: relevant.some((p) => p.scope === "GLOBAL"),
    ids: new Set(relevant.map((p) => p.clubId).filter((id): id is string => !!id)),
  };
}

export function departmentIdsWith(list: EffectivePermission[], keys: string[], clubId: string) {
  const relevant = list.filter((p) => keys.includes(p.permissionKey));
  const all = relevant.some((p) => p.scope === "GLOBAL" || (p.scope === "CLUB" && p.clubId === clubId));
  const ids = new Set(relevant.filter((p) => p.clubId === clubId && p.departmentId).map((p) => p.departmentId!));
  return { all, ids };
}
