import { api, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Page } from '@/types/common.types';
import type {
  CreateNotificationCampaignInput,
  Notification,
  NotificationAudiencePreview,
  NotificationAudienceType,
  NotificationCampaign,
  NotificationCampaignRemindResult,
  NotificationUnreadSummary,
  ResourceNotificationInput,
  ResourceNotificationResult,
} from '@/types/notification/notification.types';

export const notificationsApi = {
  notifications: (offset = 0, limit = 30) =>
    api<Page<Notification>>(`${API_ROUTES.users.myNotifications}?${cleanParams({ offset, limit })}`),
  unreadNotificationSummary: () =>
    api<NotificationUnreadSummary>(API_ROUTES.users.myNotificationsUnreadSummary),
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
  notificationCampaigns: (offset = 0, limit = 20) =>
    api<Page<NotificationCampaign>>(`/notifications/campaigns?${cleanParams({ offset, limit })}`),
  previewNotificationAudience: (audienceType: NotificationAudienceType, clubIds: string[] = []) => {
    const params = new URLSearchParams({ audienceType });
    clubIds.forEach((id) => params.append('clubIds', id));
    return api<NotificationAudiencePreview>(`/notifications/campaigns/preview-count?${params.toString()}`);
  },
  createNotificationCampaign: (body: CreateNotificationCampaignInput) =>
    api<NotificationCampaign>('/notifications/campaigns', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  remindUnreadCampaign: (campaignId: string) =>
    api<NotificationCampaignRemindResult>(`/notifications/campaigns/${encodeURIComponent(campaignId)}/remind-unread`, {
      method: 'POST',
    }),
};
