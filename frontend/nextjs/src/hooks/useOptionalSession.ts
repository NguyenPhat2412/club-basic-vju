"use client";
import { useFetchQuery } from "@/lib/fetch-hooks";
import { apiModel, type EffectivePermission, type User } from "@/lib/api";

export function useOptionalSession() {
  const me = useFetchQuery({ queryKey: ["optional-me"], queryFn: apiModel.optionalMe, staleTime: 60_000 });
  const permissions = useFetchQuery({
    queryKey: ["optional-me", "permissions"],
    queryFn: apiModel.optionalEffectivePermissions,
    enabled: !!me.data,
    staleTime: 60_000,
  });
  const list = permissions.data ?? [];
  const user = me.data ?? undefined;

  return {
    user,
    permissions: list,
    ready: me.isSuccess && (!user || permissions.isSuccess),
    settled: me.isSuccess || me.isError,
    mustChangePassword: !!me.data?.requiresPasswordChange,
    can: (key: string) => list.some((permission) => permission.permissionKey === key),
    canInClub: (key: string, clubId: string) => list.some((permission) => permission.permissionKey === key && (permission.scope === "GLOBAL" || permission.clubId === clubId)),
    clubsWith: (keys: string[]) => clubIdsWith(list, keys),
  };
}

function clubIdsWith(list: EffectivePermission[], keys: string[]) {
  const relevant = list.filter((permission) => keys.includes(permission.permissionKey));
  return {
    global: relevant.some((permission) => permission.scope === "GLOBAL"),
    ids: new Set(relevant.map((permission) => permission.clubId).filter((id): id is string => !!id)),
  };
}
