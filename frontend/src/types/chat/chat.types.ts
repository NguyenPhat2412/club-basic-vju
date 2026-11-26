export type ChatAttachmentKind = 'IMAGE' | 'VIDEO' | 'FILE';

export type ChatAttachment = {
  id: string;
  channelId: string;
  messageId?: string | null;
  fileName: string;
  contentType: string;
  mediaKind: ChatAttachmentKind;
  sizeBytes: number;
  checksumSha256: string;
  sortOrder: number;
  localPreviewUrl?: string;
};

export type StagedChatMedia = {
  localId: string;
  file: File;
  previewUrl: string;
  mediaKind: ChatAttachmentKind;
};

export type ChatQuickReply = {
  id: string;
  clubId: string;
  createdBy?: string | null;
  creatorName?: string | null;
  shortcut: string;
  title: string;
  content: string;
  sortOrder: number;
  updatedAt: string;
};

export type ChatChannel = {
  id: string;
  clubId: string;
  departmentId?: string;
  departmentName?: string;
  eventId?: string;
  eventTitle?: string;
  name: string;
  channelType: string;
  unreadCount?: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessageDeliveryStatus =
  | 'uploading'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'seen'
  | 'failed';

export type ChatReactionSummary = {
  emoji: string;
  count: number;
  reactorIds: string[];
  reactorNames: string[];
};

export type ChatMessage = {
  id: string;
  channelId: string;
  senderId?: string;
  senderFullName?: string;
  senderAvatarUrl?: string;
  senderType: 'USER' | 'AI_BOT';
  replyToId?: string;
  replyToSenderName?: string;
  replyToPreview?: string;
  documentId?: string;
  documentName?: string;
  documentContentType?: string;
  documentSizeBytes?: number;
  documentPreviewable?: boolean;
  attachments?: ChatAttachment[];
  reactions?: ChatReactionSummary[];
  pinned?: boolean;
  pinnedAt?: string | null;
  pinnedByName?: string | null;
  clientTempId?: string;
  optimistic?: boolean;
  deliveryStatus?: ChatMessageDeliveryStatus | 'SENT' | 'DELIVERED' | 'SEEN';
  deliveredAt?: string | null;
  seenCount?: number;
  seenByNames?: string[];
  lastSeenAt?: string | null;
  editedAt?: string | null;
  deliveryError?: string;
  content: string;
  createdAt: string;
};

export type ChatRealtimeEvent = {
  type:
    | 'MESSAGE_CREATED'
    | 'MESSAGE_UPDATED'
    | 'MESSAGE_DELETED'
    | 'SUMMARY_POSTED'
    | 'MESSAGE_PINNED'
    | 'MESSAGE_UNPINNED'
    | 'MESSAGE_REACTION_UPDATED'
    | 'CHANNEL_DELIVERED'
    | 'CHANNEL_READ'
    | 'TYPING'
    | 'CHANNEL_CREATED'
    | 'CHANNEL_DELETED';
  clubId: string;
  channelId: string;
  actorId?: string;
  actorName?: string;
  message?: ChatMessage;
  channel?: ChatChannel;
  occurredAt: string;
};

export type AiSummary = {
  id: string;
  channelId: string;
  requestedBy: string;
  messageCount: number;
  summary: string;
  decisions: string[];
  suggestedTasks: string[];
  suggestedEvents: string[];
  model: string;
  createdAt: string;
};
