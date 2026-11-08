'use client';
import { useQuery } from '@tanstack/react-query';
import { statisticsApi } from '@/api/statistics/statistics.api';

export function useSystemStatistics(enabled = true) {
  return useQuery({
    queryKey: ['system-statistics'],
    queryFn: () => statisticsApi.systemStatistics(),
    enabled,
  });
}

export function useClubStatistics(clubId: string, q: { from?: string; to?: string } = {}, enabled = true) {
  return useQuery({
    queryKey: ['club-statistics', clubId, q.from, q.to],
    queryFn: () => statisticsApi.clubStatistics(clubId, q),
    enabled: Boolean(clubId && enabled),
  });
}
