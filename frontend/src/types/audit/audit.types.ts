export type AuditLogItem = {
  id: string;
  actorUserId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  clubId?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};
