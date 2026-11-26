"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { IMessage } from "@stomp/stompjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiModel } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { toast } from "@/components/ui/toast";
import { targetHrefForNotification } from "@/forms/notification/notification-links";
import { dispatchBackgroundBrowserNotification } from "@/lib/realtime/browser-notifications";
import { acquireStompConnection } from "@/lib/realtime/stomp-connection";
import type { ChatChannel, ChatRealtimeEvent } from "@/types/chat/chat.types";
import type { Page } from "@/types/common.types";
import type {
  Notification,
  NotificationRealtimeEvent,
  NotificationUnreadSummary,
} from "@/types/notification/notification.types";


let activeViewedChatChannelId: string | null = null;
const seenNotificationIds = new Set<string>();
const seenChatMessageIds = new Set<string>();
let lastChatToastAt = 0;

export function setActiveViewedChatChannel(channelId: string | null) {
  activeViewedChatChannelId = channelId || null;
}

export function getActiveViewedChatChannel(): string | null {
  return activeViewedChatChannelId;
}

function rememberId(set: Set<string>, id: string): boolean {
  if (!id || set.has(id)) return false;
  set.add(id);
  if (set.size > 300) {
    const oldest = set.values().next().value;
    if (oldest) set.delete(oldest);
  }
  return true;
}

export function useUnreadNotificationSummary(enabled: boolean) {
  return useQuery({
    queryKey: qk.unreadSummary(),
    queryFn: apiModel.unreadNotificationSummary,
    enabled,
    staleTime: 20_000,
    refetchInterval: 60_000,
  });
}

export function useGlobalRealtimeNotifications({
  enabled,
  currentUserId,
}: {
  enabled: boolean;
  currentUserId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userIdRef = useRef(currentUserId);
  const routerRef = useRef(router);

  useEffect(() => {
    userIdRef.current = currentUserId;
    routerRef.current = router;
  }, [currentUserId, router]);

  useEffect(() => {
    if (!enabled || !currentUserId || typeof window === "undefined") return;

    const handleNotificationFrame = (frame: IMessage) => {
      let event: NotificationRealtimeEvent;
      try {
        event = JSON.parse(frame.body) as NotificationRealtimeEvent;
      } catch {
        return;
      }

      queryClient.setQueryData<NotificationUnreadSummary>(qk.unreadSummary(), (prev) => ({
        unreadNotifications: event.unreadCount,
        unreadChatMessages: prev?.unreadChatMessages ?? 0,
        latestUnreadClubId: prev?.latestUnreadClubId ?? null,
        latestUnreadChannelId: prev?.latestUnreadChannelId ?? null,
      }));

      if (event.type === "NOTIFICATION_READ_SYNC") {
        queryClient.invalidateQueries({ queryKey: qk.notifications() });
        return;
      }

      const notif = event.notification;
      if (!notif || !rememberId(seenNotificationIds, notif.id)) return;

      queryClient.setQueriesData<Page<Notification>>({ queryKey: qk.notifications() }, (old) => {
        if (!old?.items || old.offset !== 0) return old;
        if (old.items.some((item) => item.id === notif.id)) return old;
        return {
          ...old,
          items: [notif, ...old.items],
          total: old.total + 1,
        };
      });

      const target = targetHrefForNotification(notif);
      const isViewingSameChat =
        notif.referenceType === "CHAT" &&
        notif.referenceId &&
        getActiveViewedChatChannel() === notif.referenceId;
      const suppressDuplicateChatToast =
        notif.referenceType === "CHAT" && Date.now() - lastChatToastAt < 2_500;

      if (!isViewingSameChat && !suppressDuplicateChatToast) {
        const go = target ? () => routerRef.current.push(target.href) : undefined;
        toast.info(notif.message, {
          title: notif.title,
          onClick: go,
        });
        dispatchBackgroundBrowserNotification({
          title: notif.title,
          body: notif.message,
          tag: `vju-notif-${notif.id}`,
          onClick: go,
        });
      }
    };

    const handleChatFrame = (frame: IMessage) => {
      let event: ChatRealtimeEvent;
      try {
        event = JSON.parse(frame.body) as ChatRealtimeEvent;
      } catch {
        return;
      }

      if (
        (event.type !== "MESSAGE_CREATED" && event.type !== "SUMMARY_POSTED") ||
        !event.message ||
        !event.channelId ||
        !event.clubId
      ) {
        return;
      }

      const incoming = event.message;
      if (incoming.senderId && incoming.senderId === userIdRef.current) return;
      if (event.actorId && event.actorId === userIdRef.current && incoming.senderType !== "AI_BOT") return;
      if (getActiveViewedChatChannel() === event.channelId) return;
      if (!rememberId(seenChatMessageIds, incoming.id)) return;

      queryClient.setQueryData<NotificationUnreadSummary>(qk.unreadSummary(), (prev) => ({
        unreadNotifications: prev?.unreadNotifications ?? 0,
        unreadChatMessages: (prev?.unreadChatMessages ?? 0) + 1,
        latestUnreadClubId: event.clubId,
        latestUnreadChannelId: event.channelId,
      }));

      queryClient.setQueryData<ChatChannel[]>(qk.clubChannels(event.clubId), (channels) => {
        if (!channels) return channels;
        return channels.map((ch) => {
          if (ch.id !== event.channelId) return ch;
          if (ch.lastMessageAt === incoming.createdAt) return ch;
          return {
            ...ch,
            lastMessageAt: incoming.createdAt,
            unreadCount: (ch.unreadCount ?? 0) + 1,
          };
        });
      });

      queryClient.invalidateQueries({ queryKey: qk.myChatChannels() });

      const senderLabel = event.actorName || incoming.senderFullName || "Tin nhắn mới";
      const channelLabel = event.channel?.name ? ` · #${event.channel.name}` : "";
      const preview = incoming.content?.trim()
        ? incoming.content.trim()
        : incoming.documentName
          ? `📎 ${incoming.documentName}`
          : "📷 Đã gửi hình ảnh / tệp đính kèm";
      const href = `/management?tab=chat&clubId=${event.clubId}&channelId=${event.channelId}`;

      lastChatToastAt = Date.now();
      const goChat = () => routerRef.current.push(href);
      toast.chat(preview, {
        title: `${senderLabel}${channelLabel}`,
        onClick: goChat,
      });
      dispatchBackgroundBrowserNotification({
        title: `${senderLabel}${channelLabel}`,
        body: preview,
        tag: `vju-chat-${event.channelId}`,
        onClick: goChat,
      });
    };

    const handle = acquireStompConnection({
      subscriptions: [
        { destination: "/user/queue/notifications", callback: handleNotificationFrame, id: "global-user-notifications" },
        { destination: "/user/queue/chat-events", callback: handleChatFrame, id: "global-user-chat-events" },
      ],
      onConnect: (isReconnect) => {
        if (isReconnect) {
          queryClient.invalidateQueries({ queryKey: qk.unreadSummary() });
          queryClient.invalidateQueries({ queryKey: qk.notifications() });
          queryClient.invalidateQueries({ queryKey: qk.myChatChannels() });
        }
      },
    });
    return () => handle.release();
  }, [currentUserId, enabled, queryClient]);
}
