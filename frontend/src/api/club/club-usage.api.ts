import { api } from "@/lib/api/client";
import { qk } from "@/lib/api/query-keys";
import type { ClubUsage } from "@/types/club/club.types";

export async function getClubUsage(clubId: string): Promise<ClubUsage> {
  return api<ClubUsage>(`/clubs/${encodeURIComponent(clubId)}/usage`);
}

export const clubUsageApi = {
  getClubUsage,
};

export function clubUsageQueryOptions(clubId: string) {
  return {
    queryKey: qk.clubUsage(clubId),
    queryFn: () => getClubUsage(clubId),
    enabled: Boolean(clubId),
    staleTime: 30_000,
  };
}
