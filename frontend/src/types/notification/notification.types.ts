export type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  referenceType?: string;
  referenceId?: string;
  clubId?: string;
  createdAt: string;
};

export type NotificationUnreadSummary = {
  unreadNotifications: number;
  unreadChatMessages: number;
  latestUnreadClubId?: string | null;
  latestUnreadChannelId?: string | null;
};

export type NotificationRealtimeEvent = {
  type: 'NOTIFICATION_CREATED' | 'NOTIFICATION_READ_SYNC';
  userId: string;
  notification?: Notification | null;
  unreadCount: number;
  occurredAt: string;
};

export type ResourceNotificationInput = {
  title: string;
  message: string;
  idempotencyKey?: string;
  includeSubtasks?: boolean;
};

export type ResourceNotificationResult = {
  referenceType: string;
  referenceId: string;
  clubId: string;
  recipientCount: number;
};
