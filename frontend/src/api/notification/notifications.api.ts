import { api, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Page } from '@/types/common.types';
import type {
  Notification,
  ResourceNotificationInput,
  ResourceNotificationResult,
} from '@/types/notification/notification.types';

export const notificationsApi = {
  notifications: (offset = 0, limit = 30) =>
    api<Page<Notification>>(`${API_ROUTES.users.myNotifications}?${cleanParams({ offset, limit })}`),
  notificationDetail: (id: string) => api<Notification>(API_ROUTES.users.myNotificationDetail(id)),
  markNotificationRead: (id: string) =>
    api<void>(API_ROUTES.users.myNotificationRead(id), { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    api<void>(API_ROUTES.users.myNotificationsReadAll, { method: 'PATCH' }),
  broadcastNotification: (clubId: string, body: { title: string; message: string; departmentId?: string }) =>
    api<{ clubId: string; departmentId?: string; recipientCount: number }>(
      API_ROUTES.clubs.notifications(clubId),
      { method: 'POST', body: JSON.stringify(body) }
    ),
  notifyEventParticipants: (eventId: string, body: ResourceNotificationInput) =>
    api<ResourceNotificationResult>(`/events/${eventId}/notifications`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  notifyTaskAssignees: (taskId: string, body: ResourceNotificationInput) =>
    api<ResourceNotificationResult>(`/tasks/${taskId}/notifications`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
