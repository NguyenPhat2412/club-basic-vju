"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiModel, type Club, type Membership, type UserRole } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { CLUB_MANAGEMENT_KEYS } from "@/hooks/useSession";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { useBrowserStorage, writeBrowserStorage } from "@/hooks/useBrowserStorage";
import { getPresentationLocale } from "@/i18n/config";
import { translateUiText } from "@/i18n/translator";

export const ACTIVE_UNIT_STORAGE_KEY = "vju-club:active-unit-id:v1";

export type ActiveUnit = {
  clubId: string;
  clubCode: string;
  clubName: string;
  logoUrl?: string;
  roleLabel: string;
  roleCode?: string;
  isMember: boolean;
  isLeadership: boolean;
};

const UNIT_FALLBACK_LABELS = {
  vi: { member: "Thành viên", systemAdmin: "Quản trị hệ thống", coordinator: "Điều phối" },
  en: { member: "Member", systemAdmin: "System Admin", coordinator: "Coordinator" },
  ja: { member: "メンバー", systemAdmin: "システム管理者", coordinator: "運営担当" },
} as const;

function rolePriority(roleCode: string): number {
  if (roleCode === "SYSTEM_ADMIN") return 5;
  if (roleCode === "CLUB_PRESIDENT") return 4;
  if (roleCode === "CLUB_VICE_PRESIDENT") return 3;
  if (roleCode && roleCode !== "CLUB_MEMBER") return 2;
  return 1;
}

function formatRoleText(raw: string, locale: ReturnType<typeof getPresentationLocale>): string {
  const translated = translateUiText(raw, locale);
  return translated;
}

export function useActiveUnit() {
  const session = useOptionalSession();
  const userId = session.user?.id ?? "";
  const authenticated = Boolean(userId) && !session.mustChangePassword;
  const storedUnitId = useBrowserStorage(ACTIVE_UNIT_STORAGE_KEY, "");
  const locale = getPresentationLocale();
  const fallbackLabels = UNIT_FALLBACK_LABELS[locale];

  const clubsQuery = useQuery({
    queryKey: qk.clubs("active-units"),
    queryFn: () => apiModel.clubs("", "", 0, 100),
    enabled: authenticated,
    staleTime: 60_000,
  });

  const membershipsQuery = useQuery({
    queryKey: qk.myMemberships("active-units"),
    queryFn: () => apiModel.myMemberships({ status: "ACTIVE", limit: 100 }),
    enabled: authenticated,
    staleTime: 60_000,
  });

  const userRolesQuery = useQuery({
    queryKey: qk.userRoles(userId, "active-units"),
    queryFn: () => apiModel.userRoles(userId),
    enabled: authenticated && Boolean(userId),
    staleTime: 60_000,
  });

  const hasGlobalAdmin = useMemo(
    () =>
      CLUB_MANAGEMENT_KEYS.some((k) => session.hasGlobal(k)) ||
      session.hasGlobal("role.manage") ||
      session.hasGlobal("user.view") ||
      (userRolesQuery.data ?? []).some((r) => r.scope === "GLOBAL"),
    [session, userRolesQuery.data],
  );

  const units = useMemo<ActiveUnit[]>(() => {
    if (!authenticated) return [];

    const clubMap = new Map<string, Club>();
    for (const c of clubsQuery.data?.items ?? []) {
      clubMap.set(c.id, c);
    }

    const membershipMap = new Map<string, Membership>();
    const deptToClub = new Map<string, string>();
    for (const m of membershipsQuery.data?.items ?? []) {
      membershipMap.set(m.clubId, m);
      for (const d of m.departments ?? []) {
        deptToClub.set(d.id, m.clubId);
      }
      if (!clubMap.has(m.clubId)) {
        clubMap.set(m.clubId, {
          id: m.clubId,
          code: m.clubCode,
          name: m.clubName,
          status: "ACTIVE",
        });
      }
    }
    for (const p of session.permissions) {
      if (p.departmentId && p.clubId && !deptToClub.has(p.departmentId)) {
        deptToClub.set(p.departmentId, p.clubId);
      }
    }

    const rolesByClub = new Map<string, UserRole[]>();
    for (const ur of userRolesQuery.data ?? []) {
      const targetClubId = ur.clubId ?? (ur.departmentId ? deptToClub.get(ur.departmentId) : undefined);
      if (!targetClubId) continue;
      const list = rolesByClub.get(targetClubId) ?? [];
      list.push(ur);
      rolesByClub.set(targetClubId, list);
    }

    const permClubIds = new Set(
      session.permissions.map((p) => p.clubId).filter((id): id is string => Boolean(id)),
    );

    const eligibleIds = new Set<string>();
    if (hasGlobalAdmin) {
      for (const id of clubMap.keys()) eligibleIds.add(id);
    } else {
      for (const id of membershipMap.keys()) eligibleIds.add(id);
      for (const id of rolesByClub.keys()) eligibleIds.add(id);
      for (const id of permClubIds) eligibleIds.add(id);
    }

    const built: ActiveUnit[] = [];
    for (const id of eligibleIds) {
      const club = clubMap.get(id);
      if (!club) continue;

      const unitRoles = [...(rolesByClub.get(id) ?? [])].sort(
        (a, b) => rolePriority(b.roleCode) - rolePriority(a.roleCode),
      );
      const primaryRole = unitRoles[0];
      const isMember = membershipMap.has(id);
      const isLeadership = Boolean(primaryRole && rolePriority(primaryRole.roleCode) >= 2);

      let roleLabelText: string = fallbackLabels.member;
      if (primaryRole) {
        roleLabelText = formatRoleText(primaryRole.roleName || primaryRole.roleCode, locale);
      } else if (!isMember && permClubIds.has(id)) {
        roleLabelText = fallbackLabels.coordinator;
      } else if (!isMember && hasGlobalAdmin) {
        roleLabelText = fallbackLabels.systemAdmin;
      }

      built.push({
        clubId: club.id,
        clubCode: club.code,
        clubName: club.name,
        logoUrl: club.logoUrl,
        roleLabel: roleLabelText,
        roleCode: primaryRole?.roleCode,
        isMember,
        isLeadership,
      });
    }

    built.sort((a, b) => {
      if (a.isLeadership !== b.isLeadership) return a.isLeadership ? -1 : 1;
      if (a.clubCode === "DOANVJU" && b.clubCode !== "DOANVJU") return -1;
      if (b.clubCode === "DOANVJU" && a.clubCode !== "DOANVJU") return 1;
      if (a.isMember !== b.isMember) return a.isMember ? -1 : 1;
      return a.clubCode.localeCompare(b.clubCode, "vi");
    });

    return built;
  }, [
    authenticated,
    clubsQuery.data?.items,
    fallbackLabels.coordinator,
    fallbackLabels.member,
    fallbackLabels.systemAdmin,
    hasGlobalAdmin,
    locale,
    membershipsQuery.data?.items,
    session.permissions,
    userRolesQuery.data,
  ]);

  const activeUnit = useMemo(
    () => units.find((u) => u.clubId === storedUnitId) ?? units[0] ?? null,
    [storedUnitId, units],
  );

  const activeClubId = activeUnit?.clubId ?? "";

  const setActiveUnitId = useCallback((clubId: string | null) => {
    writeBrowserStorage(ACTIVE_UNIT_STORAGE_KEY, clubId && clubId.trim() ? clubId : null);
  }, []);

  const canInActiveUnit = useCallback(
    (permissionKey: string) => (activeClubId ? session.canInClub(permissionKey, activeClubId) : false),
    [activeClubId, session],
  );

  const isLoading =
    authenticated &&
    (!session.ready || clubsQuery.isPending || membershipsQuery.isPending || userRolesQuery.isPending);

  return {
    units,
    activeUnit,
    activeClubId,
    setActiveUnitId,
    canInActiveUnit,
    hasGlobalAdmin,
    isLoading,
  };
}
