import { api, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Page } from '@/types/common.types';
import type { AiSummary, ChatChannel, ChatMessage } from '@/types/chat/chat.types';

export const chatApi = {
  clubChannels: (clubId: string) => api<ChatChannel[]>(API_ROUTES.clubs.channels(clubId)),
  createChannel: (
    clubId: string,
    body: { name: string; channelType?: string; departmentId?: string; eventId?: string }
  ) => api<ChatChannel>(API_ROUTES.clubs.channels(clubId), { method: 'POST', body: JSON.stringify(body) }),
  channelMessages: (channelId: string, offset = 0, limit = 50) =>
    api<Page<ChatMessage>>(`/channels/${channelId}/messages?${cleanParams({ offset, limit })}`),
  sendMessage: (channelId: string, content: string) =>
    api<ChatMessage>(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  summarizeChannel: (
    channelId: string,
    body: { messageLimit?: number; postToChannel?: boolean } = { messageLimit: 50, postToChannel: true }
  ) => api<AiSummary>(`/channels/${channelId}/summaries`, { method: 'POST', body: JSON.stringify(body) }),
  channelSummaries: (channelId: string) => api<AiSummary[]>(`/channels/${channelId}/summaries`),
};
