'use client';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/api/chat/chat.api';

export function useClubChannels(clubId: string, enabled = true) {
  return useQuery({
    queryKey: ['club-channels', clubId],
    queryFn: () => chatApi.clubChannels(clubId),
    enabled: Boolean(clubId && enabled),
  });
}

export function useChannelMessages(channelId: string, offset = 0, limit = 50, enabled = true) {
  return useQuery({
    queryKey: ['channel-messages', channelId, offset, limit],
    queryFn: () => chatApi.channelMessages(channelId, offset, limit),
    enabled: Boolean(channelId && enabled),
    refetchInterval: 8_000,
  });
}
