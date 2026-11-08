"use client";
import { useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE, type EffectivePermission, type User } from "@/lib/api";
import {
  clubIdsWith,
  departmentIdsWith,
  hasClubPermission,
  hasClubWidePermission,
  hasDepartmentPermission,
} from "./useSession";

async function readOptional<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API_BASE}/api/v1${path}`, { credentials: "include" });
  if (response.status === 401) return null;
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
    queryKey: ["optional-me"],
    queryFn: async () => {
      const user = await readOptional<User>("/auth/me");
      if (user) {
        queryClient.setQueryData(["me"], user);
      }
      return user;
    },
    staleTime: 60_000,
  });
  const mustChangePassword = !!me.data?.requiresPasswordChange;
  const userId = me.data?.id ?? null;
  const permissions = useQuery({
    queryKey: ["optional-me", "permissions", userId],
    queryFn: async () => {
      const perms = await readOptional<EffectivePermission[]>("/users/me/effective-permissions");
      if (perms) {
        queryClient.setQueryData(["me", "permissions", userId], perms);
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
    canInClub: (key: string, clubId: string) => hasClubPermission(list, key, clubId),
    canClubWide: (key: string, clubId: string) => hasClubWidePermission(list, key, clubId),
    canInDepartment: (key: string, clubId: string, departmentId?: string) =>
      hasDepartmentPermission(list, key, clubId, departmentId),
    clubsWith: (keys: string[]) => clubIdsWith(list, keys),
    departmentsWith: (keys: string[], clubId: string) => departmentIdsWith(list, keys, clubId),
  };
}
