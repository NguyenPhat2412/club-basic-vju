'use client';
import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '@/api/document/documents.api';

export function useClubDocuments(
  clubId: string,
  q: { name?: string; appDetailKey?: string; deleted?: boolean; offset?: number; limit?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ['documents', clubId, q.name, q.appDetailKey, q.deleted, q.offset, q.limit],
    queryFn: () => documentsApi.documents(clubId, q),
    enabled: Boolean(clubId && enabled),
  });
}
