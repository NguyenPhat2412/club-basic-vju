import { api, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type {
  ClubStatistics,
  EventsTimelineQuery,
  EventsTimelineResponse,
  SystemStatistics,
  TrainingPointReportQuery,
  TrainingPointReportResponse,
} from '@/types/statistics/statistics.types';

export const statisticsApi = {
  systemStatistics: () => api<SystemStatistics>('/statistics/system'),
  clubStatistics: (clubId: string, q: { from?: string; to?: string } = {}) => {
    const qs = cleanParams({ from: q.from, to: q.to });
    return api<ClubStatistics>(`${API_ROUTES.clubs.statistics(clubId)}${qs ? `?${qs}` : ''}`);
  },
  trainingPointsReport: (q: TrainingPointReportQuery = {}) => {
    const qs = cleanParams({
      clubId: q.clubId || undefined,
      academicTerm: q.academicTerm || undefined,
      search: q.search?.trim() || undefined,
      from: q.from || undefined,
      to: q.to || undefined,
    });
    return api<TrainingPointReportResponse>(`/reports/training-points${qs ? `?${qs}` : ''}`);
  },
  eventsTimeline: (q: EventsTimelineQuery = {}) => {
    const qs = cleanParams({
      clubId: q.clubId || undefined,
      academicTerm: q.academicTerm || undefined,
      from: q.from || undefined,
      to: q.to || undefined,
    });
    return api<EventsTimelineResponse>(`/events/timeline${qs ? `?${qs}` : ''}`);
  },
};
