"use client";
import { useQuery } from "@tanstack/react-query";
import { apiModel, User } from "@/lib/api";

export function useUserNames(enabled: boolean) {
  const users = useQuery({ queryKey: ["users", "lookup"], queryFn: () => apiModel.users("", 0, 100), enabled, staleTime: 60_000 });
  const byId = new Map<string, User>((users.data?.items ?? []).map((u) => [u.id, u]));
  return (id: string) => byId.get(id);
}
