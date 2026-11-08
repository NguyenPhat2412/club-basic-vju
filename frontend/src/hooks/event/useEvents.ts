'use client';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/api/event/events.api';

export function usePublicEvents(offset = 0, limit = 10, enabled = true) {
  return useQuery({
    queryKey: ['public-events', offset, limit],
    queryFn: () => eventsApi.publicEvents(offset, limit),
    enabled,
  });
}

export function useClubEvents(
  clubId: string,
  q: { status?: string; departmentId?: string; offset?: number; limit?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ['club-events', clubId, q.status, q.departmentId, q.offset, q.limit],
    queryFn: () => eventsApi.clubEvents(clubId, q),
    enabled: Boolean(clubId && enabled),
  });
}

export function useMyCalendar(from?: string, to?: string, enabled = true) {
  return useQuery({
    queryKey: ['my-calendar', from, to],
    queryFn: () => eventsApi.myCalendar(from, to),
    enabled,
  });
}
