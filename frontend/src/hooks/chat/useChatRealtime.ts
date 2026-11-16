'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Client, IFrame, IMessage } from '@stomp/stompjs';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '@/lib/api/client';
import { chatApi } from '@/api/chat/chat.api';
import {
  applyChannelDeliveredReceipt,
  applyChannelReadReceipt,
} from '@/forms/chat/chat-status-meta';
import {
  canApplyActiveChannelMessage,
  getCachedChannelWindow,
  getCachedPinnedMessages,
  preloadChannelMedia,
  readRealtimeChatMessage,
  reconcileIncomingChatMessage,
  reconcilePinnedChatMessage,
  saveCachedChannelWindow,
  saveCachedPinnedMessages,
} from '@/lib/chat-message-cache';
import type { Page } from '@/types/common.types';
import type { ChatChannel, ChatMessage, ChatRealtimeEvent } from '@/types/chat/chat.types';

export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected';

type TypingEntry = {
  channelId: string;
  userId: string;
  name: string;
  expiresAt: number;
};

type ScopedWsError = {
  channelId: string;
  message: string;
};

export function resolveWsBrokerUrl(apiBase: string = API_BASE): string {
  const trimmed = apiBase.replace(/\/+$/, '');
  if (trimmed.startsWith('https://')) {
    return `wss://${trimmed.slice('https://'.length)}/api/v1/ws`;
  }
  if (trimmed.startsWith('http://')) {
    return `ws://${trimmed.slice('http://'.length)}/api/v1/ws`;
  }
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${trimmed}/api/v1/ws`;
  }
  return 'ws://localhost:8080/api/v1/ws';
}

export function useChatRealtime({
  clubId,
  activeChannelId,
  currentUserId,
  enabled = true,
}: {
  clubId: string;
  activeChannelId: string;
  currentUserId?: string;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [rawStatus, setRawStatus] = useState<WsConnectionStatus>('connecting');
  const [scopedError, setScopedError] = useState<ScopedWsError | null>(null);
  const [typingMap, setTypingMap] = useState<Record<string, TypingEntry>>({});

  const clientRef = useRef<Client | null>(null);
  const activeChannelRef = useRef(activeChannelId);
  const clubIdRef = useRef(clubId);
  const userIdRef = useRef(currentUserId);
  const lastTypingSentRef = useRef(0);
  const lastMarkedReadIdRef = useRef<string>('');
  const hadConnectedOnceRef = useRef(false);

  useEffect(() => {
    activeChannelRef.current = activeChannelId;
    clubIdRef.current = clubId;
    userIdRef.current = currentUserId;
  }, [activeChannelId, clubId, currentUserId]);

  const handleEvent = useCallback(
    (raw: IMessage) => {
      let event: ChatRealtimeEvent;
      try {
        event = JSON.parse(raw.body) as ChatRealtimeEvent;
      } catch {
        return;
      }

      if (event.type === 'CHANNEL_CREATED' && event.clubId === clubIdRef.current) {
        queryClient.invalidateQueries({ queryKey: ['club-channels', clubIdRef.current] });
        return;
      }

      if (event.type === 'TYPING') {
        if (
          event.channelId === activeChannelRef.current &&
          event.actorId &&
          event.actorId !== userIdRef.current
        ) {
          setTypingMap((prev) => ({
            ...prev,
            [`${event.channelId}:${event.actorId!}`]: {
              channelId: event.channelId!,
              userId: event.actorId!,
              name: event.actorName || 'Thành viên',
              expiresAt: Date.now() + 3_200,
            },
          }));
        }
        return;
      }

      if (
        (event.type === 'CHANNEL_DELIVERED' || event.type === 'CHANNEL_READ') &&
        event.channelId
      ) {
        queryClient.setQueryData<Page<ChatMessage>>(
          ['channel-messages', event.channelId],
          (old) => {
            const base = old ?? getCachedChannelWindow(event.channelId, userIdRef.current)?.page;
            if (!base) return old;
            const nextItems =
              event.type === 'CHANNEL_READ'
                ? applyChannelReadReceipt(
                    base.items,
                    event.actorId,
                    event.actorName,
                    userIdRef.current,
                    event.occurredAt
                  )
                : applyChannelDeliveredReceipt(
                    base.items,
                    event.actorId,
                    userIdRef.current,
                    event.occurredAt
                  );
            if (nextItems === base.items) return old;
            const nextPage = { ...base, items: nextItems };
            saveCachedChannelWindow(
              event.channelId,
              nextPage,
              userIdRef.current,
              activeChannelRef.current || event.channelId
            );
            return nextPage;
          }
        );
        return;
      }

      if (
        (event.type === 'MESSAGE_PINNED' ||
          event.type === 'MESSAGE_UNPINNED' ||
          event.type === 'MESSAGE_REACTION_UPDATED') &&
        event.message
      ) {
        const incoming = readRealtimeChatMessage(event.message, event.channelId);
        if (!incoming) return;
        const isPinned =
          event.type === 'MESSAGE_REACTION_UPDATED'
            ? Boolean(incoming.pinned)
            : event.type === 'MESSAGE_PINNED';
        queryClient.setQueryData<ChatMessage[]>(
          ['channel-pinned-messages', event.channelId],
          (old) => {
            const base = old ?? getCachedPinnedMessages(event.channelId, userIdRef.current)?.items;
            const next = reconcilePinnedChatMessage(base, incoming, isPinned);
            saveCachedPinnedMessages(
              event.channelId,
              next,
              userIdRef.current,
              activeChannelRef.current || event.channelId
            );
            return next;
          }
        );
        queryClient.setQueryData<Page<ChatMessage>>(
          ['channel-messages', event.channelId],
          (old) => {
            const base = old ?? getCachedChannelWindow(event.channelId, userIdRef.current)?.page;
            if (!base) return old;
            const reconciled = reconcileIncomingChatMessage(base, { ...incoming, pinned: isPinned });
            saveCachedChannelWindow(
              event.channelId,
              reconciled.page,
              userIdRef.current,
              activeChannelRef.current || event.channelId
            );
            return reconciled.page;
          }
        );
        return;
      }

      if ((event.type === 'MESSAGE_CREATED' || event.type === 'SUMMARY_POSTED') && event.message) {
        const incoming = readRealtimeChatMessage(event.message, event.channelId);
        if (!incoming) return;
        const isCurrentChannel = canApplyActiveChannelMessage({
          activeChannelId: activeChannelRef.current,
          channelId: event.channelId,
          message: incoming,
        });

        preloadChannelMedia([incoming], 8);

        if (event.type === 'SUMMARY_POSTED') {
          queryClient.invalidateQueries({ queryKey: ['channel-summaries', event.channelId] });
        }

        let insertedNew = false;
        queryClient.setQueryData<Page<ChatMessage>>(
          ['channel-messages', event.channelId],
          (old) => {
            const base = old ?? getCachedChannelWindow(event.channelId, userIdRef.current)?.page;
            const reconciled = reconcileIncomingChatMessage(base, incoming);
            insertedNew = reconciled.insertedNew;
            saveCachedChannelWindow(
              event.channelId,
              reconciled.page,
              userIdRef.current,
              activeChannelRef.current || event.channelId
            );
            return reconciled.page;
          }
        );

        if (isCurrentChannel) {
          if (incoming.senderId && incoming.senderId !== userIdRef.current) {
            const key = `${event.channelId}:${incoming.senderId}`;
            setTypingMap((prev) => {
              if (!prev[key]) return prev;
              const next = { ...prev };
              delete next[key];
              return next;
            });
          }

          if (
            (insertedNew || lastMarkedReadIdRef.current !== incoming.id) &&
            incoming.senderId !== userIdRef.current &&
            lastMarkedReadIdRef.current !== incoming.id
          ) {
            lastMarkedReadIdRef.current = incoming.id;
            chatApi.markChannelRead(event.channelId, incoming.id).catch(() => {});
          }
        }

        if (event.clubId === clubIdRef.current) {
          queryClient.setQueryData<ChatChannel[]>(
            ['club-channels', clubIdRef.current],
            (channels) => {
              if (!channels) return channels;
              return channels.map((ch) => {
                if (ch.id !== event.channelId) return ch;
                const isAlreadyCounted = ch.lastMessageAt === incoming.createdAt;
                const increment =
                  !isCurrentChannel && !isAlreadyCounted && incoming.senderId !== userIdRef.current
                    ? 1
                    : 0;
                return {
                  ...ch,
                  lastMessageAt: incoming.createdAt,
                  unreadCount: isCurrentChannel ? 0 : (ch.unreadCount ?? 0) + increment,
                };
              });
            }
          );
        }
      }
    },
    [queryClient]
  );

  const status: WsConnectionStatus = !enabled ? 'disconnected' : rawStatus;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const client = new Client({
      brokerURL: resolveWsBrokerUrl(),
      reconnectDelay: 3_000,
      heartbeatIncoming: 15_000,
      heartbeatOutgoing: 15_000,
      onConnect: () => {
        const isReconnect = hadConnectedOnceRef.current;
        hadConnectedOnceRef.current = true;
        setScopedError(null);
        setRawStatus('connected');
        client.subscribe('/user/queue/chat-events', handleEvent, { id: 'user-chat-events' });
        if (isReconnect) {
          if (clubIdRef.current) {
            queryClient.invalidateQueries({ queryKey: ['club-channels', clubIdRef.current] });
          }
          if (activeChannelRef.current) {
            queryClient.invalidateQueries({ queryKey: ['channel-messages', activeChannelRef.current] });
          }
        }
      },
      onDisconnect: () => setRawStatus('disconnected'),
      onWebSocketClose: () => setRawStatus((prev) => (prev === 'connected' ? 'connecting' : prev)),
      onStompError: (frame: IFrame) => {
        const code = (frame.headers?.message || frame.body || '').trim();
        if (code.startsWith('UNAUTHORIZED')) {
          setScopedError({
            channelId: '',
            message: 'Phiên kết nối thời gian thực đã hết hạn. Vui lòng tải lại trang.',
          });
          setRawStatus('disconnected');
          client.deactivate();
          return;
        }
        if (code.startsWith('PERMISSION_DENIED')) {
          setScopedError({
            channelId: activeChannelRef.current,
            message: 'Bạn không còn quyền theo dõi trực tiếp kênh này.',
          });
        }
        setRawStatus('disconnected');
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      clientRef.current = null;
      hadConnectedOnceRef.current = false;
      client.deactivate();
    };
  }, [enabled, handleEvent, queryClient]);

  useEffect(() => {
    const client = clientRef.current;
    if (!client || !client.connected || !activeChannelId || status !== 'connected') return;

    const sub = client.subscribe(`/topic/channels.${activeChannelId}`, handleEvent, {
      id: `ch-${activeChannelId}`,
    });
    return () => {
      try {
        sub.unsubscribe();
      } catch {
        // Socket may already be closed
      }
    };
  }, [activeChannelId, status, handleEvent]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setTypingMap((prev) => {
        const entries = Object.entries(prev);
        if (!entries.some(([, v]) => v.expiresAt <= now)) return prev;
        return Object.fromEntries(entries.filter(([, v]) => v.expiresAt > now));
      });
    }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const sendTyping = useCallback(() => {
    const client = clientRef.current;
    if (!client || !client.connected || !activeChannelRef.current) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1_600) return;
    lastTypingSentRef.current = now;
    client.publish({
      destination: `/app/channels.${activeChannelRef.current}.typing`,
      body: '{}',
    });
  }, []);

  const typingUsers = Object.values(typingMap)
    .filter((t) => t.channelId === activeChannelId)
    .map((t) => t.name);
  const wsError =
    scopedError && (scopedError.channelId === '' || scopedError.channelId === activeChannelId)
      ? scopedError.message
      : '';

  return { status, wsError, typingUsers, sendTyping };
}
