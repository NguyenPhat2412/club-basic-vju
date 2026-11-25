"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiModel, type Club, type UserRole } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { Badge } from "@/components/ui/badge";

function roleWeight(roleCode: string): number {
  if (roleCode === "SYSTEM_ADMIN") return 5;
  if (roleCode === "CLUB_PRESIDENT") return 4;
  if (roleCode === "CLUB_VICE_PRESIDENT") return 3;
  if (roleCode === "DEPARTMENT_HEAD") return 2;
  return 1;
}

type RoleClubEntry = {
  key: string;
  label: string;
  clubCode?: string;
  isLeader: boolean;
  weight: number;
};

function summarizeUserRoles(roles: UserRole[], clubsById: Map<string, Club>): RoleClubEntry[] {
  const globalEntries: RoleClubEntry[] = [];
  const bestByClub = new Map<string, RoleClubEntry>();
  const standaloneDept: RoleClubEntry[] = [];

  for (const r of roles) {
    const weight = roleWeight(r.roleCode);
    const name = r.roleName || r.roleCode;
    if (r.scope === "GLOBAL") {
      if (!globalEntries.some((g) => g.label === name)) {
        globalEntries.push({ key: `g:${r.roleCode}`, label: name, isLeader: true, weight });
      }
      continue;
    }
    if (r.clubId) {
      const club = clubsById.get(r.clubId);
      const clubCode = club?.code ?? r.clubId.slice(0, 6).toUpperCase();
      const prev = bestByClub.get(r.clubId);
      if (!prev || weight > prev.weight) {
        bestByClub.set(r.clubId, {
          key: `c:${r.clubId}`,
          label: name,
          clubCode,
          isLeader: weight >= 2,
          weight,
        });
      }
      continue;
    }
    if (!standaloneDept.some((d) => d.label === name)) {
      standaloneDept.push({ key: `d:${r.roleCode}`, label: name, isLeader: true, weight });
    }
  }

  return [
    ...globalEntries,
    ...Array.from(bestByClub.values()).sort((a, b) => b.weight - a.weight || (a.clubCode ?? "").localeCompare(b.clubCode ?? "")),
    ...standaloneDept,
  ];
}

export function UserRoleClubCell({
  userId,
  clubsById,
  canViewRoles,
  mode,
}: {
  userId: string;
  clubsById: Map<string, Club>;
  canViewRoles: boolean;
  mode: "role" | "club";
}) {
  const rolesQuery = useQuery({
    queryKey: qk.userRoles(userId),
    queryFn: () => apiModel.userRoles(userId),
    enabled: canViewRoles && Boolean(userId),
    staleTime: 60_000,
  });

  const entries = useMemo(
    () => summarizeUserRoles(rolesQuery.data ?? [], clubsById),
    [clubsById, rolesQuery.data],
  );

  if (!canViewRoles) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (rolesQuery.isPending) {
    return <span className="text-[11px] text-muted-foreground">…</span>;
  }

  if (mode === "role") {
    const allRoles: { label: string; isLeader: boolean }[] = [];
    for (const e of entries) {
      if (!allRoles.some((r) => r.label === e.label)) {
        allRoles.push({ label: e.label, isLeader: e.isLeader });
      }
    }
    if (allRoles.length === 0) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    const leaders = allRoles.filter((r) => r.isLeader);
    const displayRoles = leaders.length > 0 ? leaders : allRoles;
    const primary = displayRoles[0]!;
    const extraCount = displayRoles.length - 1;
    const full = allRoles.map((r) => r.label).join(", ");
    return (
      <div className="flex items-center gap-1 whitespace-nowrap" title={full}>
        <Badge tone={primary.isLeader ? "primary" : "neutral"} dot={false}>
          <span className="max-w-[110px] truncate">{primary.label}</span>
        </Badge>
        {extraCount > 0 && <Badge tone="neutral" dot={false}>+{extraCount}</Badge>}
      </div>
    );
  }

  const clubs = entries.filter((e) => Boolean(e.clubCode));
  if (clubs.length === 0) {
    return <span className="whitespace-nowrap text-xs text-muted-foreground">Chưa tham gia</span>;
  }
  const primaryClub = clubs[0]!;
  const extraClubs = clubs.length - 1;
  const fullClubs = clubs
    .map((e) => {
      const id = e.key.replace(/^c:/, "");
      const name = clubsById.get(id)?.name;
      return name ? `${e.clubCode} — ${name}` : e.clubCode;
    })
    .join(", ");

  return (
    <div className="flex items-center gap-1 whitespace-nowrap" title={fullClubs}>
      <code className="max-w-[88px] truncate rounded-md bg-primary/8 px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary">
        {primaryClub.clubCode}
      </code>
      {extraClubs > 0 && <Badge tone="neutral" dot={false}>+{extraClubs}</Badge>}
    </div>
  );
}
