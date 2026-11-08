'use client';
import { useQuery } from '@tanstack/react-query';
import { applicationsApi } from '@/api/application/applications.api';

export function useMyApplications(
  q: { status?: string; clubId?: string; sort?: string; offset?: number; limit?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ['my-applications', q.status, q.clubId, q.sort, q.offset, q.limit],
    queryFn: () => applicationsApi.myApplications(q),
    enabled,
  });
}

export function useClubApplications(
  clubId: string,
  q: { status?: string; search?: string; createdFrom?: string; createdTo?: string; sort?: string; offset?: number; limit?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ['club-applications', clubId, q],
    queryFn: () => applicationsApi.clubApplications(clubId, q),
    enabled: Boolean(clubId && enabled),
  });
}

export function useClubApplicationForms(clubId: string, enabled = true) {
  return useQuery({
    queryKey: ['club-application-forms', clubId],
    queryFn: () => applicationsApi.clubApplicationForms(clubId),
    enabled: Boolean(clubId && enabled),
  });
}
