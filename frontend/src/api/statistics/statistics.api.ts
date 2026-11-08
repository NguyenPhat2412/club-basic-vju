import { api, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { ClubStatistics, SystemStatistics } from '@/types/statistics/statistics.types';

export const statisticsApi = {
  systemStatistics: () => api<SystemStatistics>('/statistics/system'),
  clubStatistics: (clubId: string, q: { from?: string; to?: string } = {}) => {
    const qs = cleanParams({ from: q.from, to: q.to });
    return api<ClubStatistics>(`${API_ROUTES.clubs.statistics(clubId)}${qs ? `?${qs}` : ''}`);
  },
};
