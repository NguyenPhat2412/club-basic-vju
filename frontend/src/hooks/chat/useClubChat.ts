'use client';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/api/chat/chat.api';
import {
  getCachedChannelWindow,
  preloadChannelMedia,
  saveCachedChannelWindow,
} from '@/lib/chat-message-cache';

export function useClubChannels(clubId: string, enabled = true) {
  return useQuery({
    queryKey: ['club-channels', clubId],
    queryFn: () => chatApi.clubChannels(clubId),
    enabled: Boolean(clubId && enabled),
  });
}

export function useChannelMessages(
  channelId: string,
  limit = 50,
  enabled = true,
  userId?: string
) {
  return useQuery({
    queryKey: ['channel-messages', channelId],
    queryFn: async () => {
      const page = await chatApi.channelMessages(channelId, 0, limit);
      saveCachedChannelWindow(channelId, page, userId, channelId);
      preloadChannelMedia(page.items, 12);
      return page;
    },
    initialData: () => getCachedChannelWindow(channelId, userId)?.page,
    initialDataUpdatedAt: () => getCachedChannelWindow(channelId, userId)?.savedAt,
    enabled: Boolean(channelId && enabled),
  });
}

export function useClubQuickReplies(clubId: string, enabled = true) {
  return useQuery({
    queryKey: ['club-quick-replies', clubId],
    queryFn: () => chatApi.clubQuickReplies(clubId),
    enabled: Boolean(clubId && enabled),
    staleTime: 60_000,
  });
}
