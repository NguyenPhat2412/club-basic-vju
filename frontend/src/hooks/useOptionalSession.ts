"use client";
import { useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { getIntlLocale } from "@/i18n/config";
import { API_BASE, type EffectivePermission, type User } from "@/lib/api";
import {
  clubIdsWith,
  departmentIdsWith,
  hasClubPermission,
  hasClubWidePermission,
  hasDepartmentPermission,
} from "./useSession";

async function readOptional<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    credentials: "include",
    headers: { "Accept-Language": getIntlLocale() },
  });
  if (response.status === 401) {
    if (typeof response.text === "function") {
      await response.text().catch(() => undefined);
    } else {
      await response.body?.cancel?.().catch(() => undefined);
    }
    return null;
  }
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

const emptySubscribe = () => () => {};

export function useOptionalSession() {
  const queryClient = useQueryClient();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const me = useQuery({
    queryKey: qk.optionalMe(),
    queryFn: async () => {
      const user = await readOptional<User>("/auth/me");
      if (user) {
        queryClient.setQueryData(qk.me(), user);
      }
      return user;
    },
    staleTime: 60_000,
  });
  const mustChangePassword = !!me.data?.requiresPasswordChange;
  const userId = me.data?.id ?? null;
  const permissions = useQuery({
    queryKey: qk.optionalMe("permissions", userId),
    queryFn: async () => {
      const perms = await readOptional<EffectivePermission[]>("/users/me/effective-permissions");
      if (perms) {
        queryClient.setQueryData(qk.me("permissions", userId), perms);
      }
      return perms;
    },
    enabled: !!userId && !mustChangePassword,
    staleTime: 60_000,
  });
  const list = mounted ? (permissions.data ?? []) : [];
  const user = mounted ? (me.data ?? undefined) : undefined;

  return {
    user,
    permissions: list,
    ready: mounted && me.isSuccess && (!user || mustChangePassword || permissions.isSuccess),
    settled: mounted && (me.isSuccess || me.isError),
    mustChangePassword: mounted && mustChangePassword,
    can: (key: string) => list.some((permission) => permission.permissionKey === key),
    hasGlobal: (key: string) => list.some((p) => p.permissionKey === key && p.scope === "GLOBAL"),
    canInClub: (key: string, clubId: string) => hasClubPermission(list, key, clubId),
    canClubWide: (key: string, clubId: string) => hasClubWidePermission(list, key, clubId),
    canInDepartment: (key: string, clubId: string, departmentId?: string) =>
      hasDepartmentPermission(list, key, clubId, departmentId),
    clubsWith: (keys: string[]) => clubIdsWith(list, keys),
    departmentsWith: (keys: string[], clubId: string) => departmentIdsWith(list, keys, clubId),
  };
}
