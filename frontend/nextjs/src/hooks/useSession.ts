"use client";
import { useQuery } from "@tanstack/react-query";
import { apiModel, EffectivePermission } from "@/lib/api";

export function useSession() {
  const me = useQuery({ queryKey: ["me"], queryFn: apiModel.me, staleTime: 60_000 });
  const permissions = useQuery({ queryKey: ["me", "permissions"], queryFn: apiModel.effectivePermissions, enabled: me.isSuccess, staleTime: 60_000 });
  const list = permissions.data ?? [];
  return {
    user: me.data,
    permissions: list,
    ready: me.isSuccess && permissions.isSuccess,
    can: (key: string) => list.some((p) => p.permissionKey === key),
    canInClub: (key: string, clubId: string) => list.some((p) => p.permissionKey === key && (p.scope === "GLOBAL" || p.clubId === clubId)),
    clubsWith: (keys: string[]) => clubIdsWith(list, keys),
  };
}

function clubIdsWith(list: EffectivePermission[], keys: string[]) {
  const relevant = list.filter((p) => keys.includes(p.permissionKey));
  return { global: relevant.some((p) => p.scope === "GLOBAL"), ids: new Set(relevant.map((p) => p.clubId).filter((id): id is string => !!id)) };
}
