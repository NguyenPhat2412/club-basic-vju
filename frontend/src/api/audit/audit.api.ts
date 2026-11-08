import { api, cleanParams } from '@/lib/api/client';
import type { Page } from '@/types/common.types';
import type { AuditLogItem } from '@/types/audit/audit.types';

export const auditApi = {
  auditLogs: (
    q: { resourceType?: string; clubId?: string; action?: string; offset?: number; limit?: number } = {}
  ) =>
    api<Page<AuditLogItem>>(
      `/audit-logs?${cleanParams({
        resourceType: q.resourceType,
        clubId: q.clubId,
        action: q.action,
        offset: q.offset ?? 0,
        limit: q.limit ?? 20,
      })}`
    ),
};
