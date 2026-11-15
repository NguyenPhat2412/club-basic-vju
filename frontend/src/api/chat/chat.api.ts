import { API_BASE, api, apiBlob, apiForm, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Page } from '@/types/common.types';
import type {
  AiSummary,
  ChatAttachment,
  ChatChannel,
  ChatMessage,
  ChatQuickReply,
} from '@/types/chat/chat.types';

export type SendMessageInput =
  | string
  | {
      content: string;
      replyToId?: string;
      documentId?: string;
      attachmentIds?: string[];
      clientTempId?: string;
    };

export type QuickReplyInput = {
  shortcut: string;
  title: string;
  content: string;
};

export const chatApi = {
  clubChannels: (clubId: string) => api<ChatChannel[]>(API_ROUTES.clubs.channels(clubId)),
  createChannel: (
    clubId: string,
    body: { name: string; channelType?: string; departmentId?: string; eventId?: string }
  ) => api<ChatChannel>(API_ROUTES.clubs.channels(clubId), { method: 'POST', body: JSON.stringify(body) }),
  channelMessages: (channelId: string, offset = 0, limit = 50, beforeId?: string) =>
    api<Page<ChatMessage>>(
      `${API_ROUTES.channels.messages(channelId)}?${cleanParams({ beforeId, offset, limit })}`
    ),
  sendMessage: (channelId: string, input: SendMessageInput) => {
    const body = typeof input === 'string' ? { content: input } : input;
    return api<ChatMessage>(API_ROUTES.channels.messages(channelId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  uploadChatAttachment: (channelId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiForm<ChatAttachment>(API_ROUTES.channels.attachments(channelId), form);
  },
  streamChatAttachment: (attachmentId: string, download = false) =>
    apiBlob(`${API_ROUTES.chatAttachments.stream(attachmentId)}${download ? '?download=true' : ''}`),
  chatAttachmentStreamUrl: (attachmentId: string, download = false) =>
    `${API_BASE}/api/v1${API_ROUTES.chatAttachments.stream(attachmentId)}${download ? '?download=true' : ''}`,
  clubQuickReplies: (clubId: string) => api<ChatQuickReply[]>(API_ROUTES.clubs.quickReplies(clubId)),
  createQuickReply: (clubId: string, body: QuickReplyInput) =>
    api<ChatQuickReply>(API_ROUTES.clubs.quickReplies(clubId), {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateQuickReply: (clubId: string, replyId: string, body: QuickReplyInput) =>
    api<ChatQuickReply>(API_ROUTES.clubs.quickReplyItem(clubId, replyId), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteQuickReply: (clubId: string, replyId: string) =>
    api<void>(API_ROUTES.clubs.quickReplyItem(clubId, replyId), { method: 'DELETE' }),
  markChannelRead: (channelId: string, lastReadMessageId?: string) =>
    api<void>(API_ROUTES.channels.read(channelId), {
      method: 'POST',
      body: JSON.stringify(lastReadMessageId ? { lastReadMessageId } : {}),
    }),
  summarizeChannel: (
    channelId: string,
    body: { messageLimit?: number; postToChannel?: boolean } = { messageLimit: 50, postToChannel: true }
  ) =>
    api<AiSummary>(API_ROUTES.channels.summaries(channelId), {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  channelSummaries: (channelId: string) => api<AiSummary[]>(API_ROUTES.channels.summaries(channelId)),
};
