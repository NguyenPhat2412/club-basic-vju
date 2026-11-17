'use client';

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from "@/lib/api/query-keys";
import { chatApi } from '@/api/chat/chat.api';
import {
  getCachedChannelWindow,
  getCachedPinnedMessages,
  preloadChannelMedia,
  saveCachedChannelWindow,
  saveCachedPinnedMessages,
} from '@/lib/chat-message-cache';
import type { ChatChannel } from '@/types/chat/chat.types';

export function useClubChannels(clubId: string, enabled = true) {
  return useQuery({
    queryKey: qk.clubChannels(clubId),
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
    queryKey: qk.channelMessages(channelId),
    queryFn: async ({ signal }) => {
      const page = await chatApi.channelMessages(channelId, 0, limit, undefined, signal);
      saveCachedChannelWindow(channelId, page, userId, channelId);
      preloadChannelMedia(page.items, 12);
      return page;
    },
    initialData: () => getCachedChannelWindow(channelId, userId)?.page,
    initialDataUpdatedAt: () => getCachedChannelWindow(channelId, userId)?.savedAt,
    staleTime: 15_000,
    enabled: Boolean(channelId && enabled),
  });
}

export function useChannelPinnedMessages(
  channelId: string,
  enabled = true,
  userId?: string
) {
  return useQuery({
    queryKey: qk.channelPinnedMessages(channelId),
    queryFn: async ({ signal }) => {
      const items = await chatApi.pinnedMessages(channelId, signal);
      saveCachedPinnedMessages(channelId, items, userId, channelId);
      return items;
    },
    initialData: () => getCachedPinnedMessages(channelId, userId)?.items,
    initialDataUpdatedAt: () => getCachedPinnedMessages(channelId, userId)?.savedAt,
    staleTime: 20_000,
    enabled: Boolean(channelId && enabled),
  });
}

export function useWarmClubChannels(
  channels: ChatChannel[] | undefined,
  activeChannelId: string,
  userId?: string,
  limit = 50
) {
  const queryClient = useQueryClient();

  const warmChannel = useCallback(
    (targetChannelId: string) => {
      if (!targetChannelId) return;
      void queryClient.prefetchQuery({
        queryKey: qk.channelMessages(targetChannelId),
        queryFn: async ({ signal }) => {
          const page = await chatApi.channelMessages(targetChannelId, 0, limit, undefined, signal);
          saveCachedChannelWindow(targetChannelId, page, userId, activeChannelId || targetChannelId);
          preloadChannelMedia(page.items, 6);
          return page;
        },
        staleTime: 25_000,
      });
      void queryClient.prefetchQuery({
        queryKey: qk.channelPinnedMessages(targetChannelId),
        queryFn: async ({ signal }) => {
          const items = await chatApi.pinnedMessages(targetChannelId, signal);
          saveCachedPinnedMessages(targetChannelId, items, userId, activeChannelId || targetChannelId);
          return items;
        },
        staleTime: 30_000,
      });
    },
    [activeChannelId, limit, queryClient, userId]
  );

  useEffect(() => {
    if (!channels?.length) return;
    const idleTimer = window.setTimeout(() => {
      for (const ch of channels.slice(0, 10)) {
        if (ch.id !== activeChannelId && !getCachedChannelWindow(ch.id, userId)) {
          warmChannel(ch.id);
        }
      }
    }, 80);
    return () => window.clearTimeout(idleTimer);
  }, [activeChannelId, channels, userId, warmChannel]);

  return { warmChannel };
}

export function useClubQuickReplies(clubId: string, enabled = true) {
  return useQuery({
    queryKey: qk.clubQuickReplies(clubId),
    queryFn: () => chatApi.clubQuickReplies(clubId),
    enabled: Boolean(clubId && enabled),
    staleTime: 60_000,
  });
}
