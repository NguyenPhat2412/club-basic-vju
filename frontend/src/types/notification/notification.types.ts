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

export type NotificationAudienceType = 'ALL_USERS' | 'CLUB_LEADERS' | 'CLUBS';
export type NotificationCampaignCategory = 'SYSTEM' | 'DOCUMENT' | 'ANNOUNCEMENT';

export type CreateNotificationCampaignInput = {
  title: string;
  message: string;
  audienceType: NotificationAudienceType;
  clubIds?: string[];
  category?: NotificationCampaignCategory;
  documentId?: string | null;
  sendEmail?: boolean;
};

export type NotificationCampaign = {
  id: string;
  title: string;
  message: string;
  audienceType: NotificationAudienceType | string;
  targetClubIds: string[];
  category: NotificationCampaignCategory | string;
  documentId: string | null;
  documentTitle: string | null;
  sendEmail: boolean;
  totalRecipients: number;
  deliveredCount: number;
  readCount: number;
  emailQueuedCount: number;
  status: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type NotificationAudiencePreview = {
  audienceType: string;
  recipientCount: number;
};

export type NotificationCampaignRemindResult = {
  campaignId: string;
  remindedCount: number;
};
