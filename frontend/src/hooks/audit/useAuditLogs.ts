'use client';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/api/audit/audit.api';

export function useAuditLogs(
  q: { resourceType?: string; clubId?: string; action?: string; offset?: number; limit?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ['audit-logs', q.resourceType, q.clubId, q.action, q.offset, q.limit],
    queryFn: () => auditApi.auditLogs(q),
    enabled,
  });
}
