"use client";
import { useQuery } from "@tanstack/react-query";
import { type EffectivePermission, type User } from "@/lib/api";
import { clubIdsWith, departmentIdsWith } from "./useSession";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function readOptional<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API}/api/v1${path}`, { credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

export function useOptionalSession() {
  const me = useQuery({ queryKey: ["optional-me"], queryFn: () => readOptional<User>("/auth/me"), staleTime: 60_000 });
  const permissions = useQuery({
    queryKey: ["optional-me", "permissions"],
    queryFn: () => readOptional<EffectivePermission[]>("/users/me/effective-permissions"),
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
    canClubWide: (key: string, clubId: string) => list.some((permission) => permission.permissionKey === key && (permission.scope === "GLOBAL" || (permission.scope === "CLUB" && permission.clubId === clubId))),
    canInDepartment: (key: string, clubId: string, departmentId?: string) =>
      list.some((permission) => permission.permissionKey === key && (permission.scope === "GLOBAL" || (permission.scope === "CLUB" && permission.clubId === clubId) || (departmentId ? permission.departmentId === departmentId : permission.clubId === clubId))),
    clubsWith: (keys: string[]) => clubIdsWith(list, keys),
    departmentsWith: (keys: string[], clubId: string) => departmentIdsWith(list, keys, clubId),
  };
}
