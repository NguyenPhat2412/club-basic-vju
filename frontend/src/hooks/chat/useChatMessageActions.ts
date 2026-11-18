"use client";

import type { Dispatch, SetStateAction } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { apiModel, describeError, type ChatMessage, type Page } from "@/lib/api";
import { toggleOptimisticMessageReaction } from "@/forms/chat/chat-emojis";
import {
  reconcilePinnedChatMessage,
  saveCachedChannelWindow,
  saveCachedPinnedMessages,
} from "@/lib/chat-message-cache";

export function useChatMessageActions({
  queryClient,
  activeChannelId,
  userId,
  userFullName,
  setOlderByChannel,
  onNotice,
  onError,
}: {
  queryClient: QueryClient;
  activeChannelId: string;
  userId?: string;
  userFullName?: string;
  setOlderByChannel: Dispatch<SetStateAction<Record<string, ChatMessage[]>>>;
  onNotice?: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const replaceMessageInCaches = (targetChId: string, updatedMsg: ChatMessage) => {
    queryClient.setQueryData<Page<ChatMessage>>(qk.channelMessages(targetChId), (old) => {
      if (!old) return old;
      const next = {
        ...old,
        items: old.items.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)),
      };
      saveCachedChannelWindow(targetChId, next, userId, activeChannelId || targetChId);
      return next;
    });
    setOlderByChannel((prev) => {
      const list = prev[targetChId];
      if (!list?.some((m) => m.id === updatedMsg.id)) return prev;
      return {
        ...prev,
        [targetChId]: list.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)),
      };
    });
    if (updatedMsg.pinned) {
      queryClient.setQueryData<ChatMessage[]>(qk.channelPinnedMessages(targetChId), (old) => {
        if (!old) return old;
        const next = reconcilePinnedChatMessage(old, updatedMsg, true);
        saveCachedPinnedMessages(targetChId, next, userId, activeChannelId || targetChId);
        return next;
      });
    }
  };

  const removeMessageFromCaches = (targetChId: string, messageId: string) => {
    queryClient.setQueryData<Page<ChatMessage>>(qk.channelMessages(targetChId), (old) => {
      if (!old) return old;
      const filtered = old.items
        .filter((m) => m.id !== messageId)
        .map((m) =>
          m.replyToId === messageId
            ? { ...m, replyToId: undefined, replyToSenderName: undefined, replyToPreview: undefined }
            : m
        );
      const next = {
        ...old,
        items: filtered,
        total: Math.max(0, old.total - (old.items.length - filtered.length)),
      };
      saveCachedChannelWindow(targetChId, next, userId, activeChannelId || targetChId);
      return next;
    });
    setOlderByChannel((prev) => {
      const list = prev[targetChId];
      if (!list?.some((m) => m.id === messageId)) return prev;
      return {
        ...prev,
        [targetChId]: list.filter((m) => m.id !== messageId),
      };
    });
    queryClient.setQueryData<ChatMessage[]>(qk.channelPinnedMessages(targetChId), (old) => {
      if (!old) return old;
      const next = old.filter((m) => m.id !== messageId);
      saveCachedPinnedMessages(targetChId, next, userId, activeChannelId || targetChId);
      return next;
    });
  };

  const applyOptimisticPinState = (targetChId: string, msg: ChatMessage, nextPinned: boolean) => {
    const updatedMsg: ChatMessage = {
      ...msg,
      pinned: nextPinned,
      pinnedAt: nextPinned ? new Date().toISOString() : null,
    };
    queryClient.setQueryData<ChatMessage[]>(qk.channelPinnedMessages(targetChId), (old) => {
      const next = reconcilePinnedChatMessage(old, updatedMsg, nextPinned);
      saveCachedPinnedMessages(targetChId, next, userId, activeChannelId || targetChId);
      return next;
    });
    replaceMessageInCaches(targetChId, updatedMsg);
  };

  const togglePinMessage = (msg: ChatMessage, forceUnpin = false) => {
    const targetChId = msg.channelId;
    const nextPinned = forceUnpin ? false : !msg.pinned;
    applyOptimisticPinState(targetChId, msg, nextPinned);
    const req = nextPinned
      ? apiModel.pinMessage(targetChId, msg.id)
      : apiModel.unpinMessage(targetChId, msg.id);
    void req.catch((e) => {
      applyOptimisticPinState(targetChId, msg, !nextPinned);
      onError(describeError(e));
    });
  };

  const toggleReactionMessage = (msg: ChatMessage, emoji: string) => {
    if (!userId || msg.optimistic) return;
    const targetChId = msg.channelId;
    const snapshot = msg;
    const optimistic = toggleOptimisticMessageReaction(msg, emoji, userId, userFullName);
    replaceMessageInCaches(targetChId, optimistic);

    void apiModel
      .toggleMessageReaction(targetChId, msg.id, emoji)
      .then((serverMsg) => {
        replaceMessageInCaches(targetChId, { ...optimistic, ...serverMsg, optimistic: false });
      })
      .catch((e) => {
        replaceMessageInCaches(targetChId, snapshot);
        onError(describeError(e));
      });
  };

  const editMessage = async (msg: ChatMessage, nextContent: string) => {
    const trimmed = nextContent.trim();
    if (!trimmed || trimmed === msg.content.trim() || msg.optimistic) return;
    const targetChId = msg.channelId;
    const snapshot = msg;
    const optimistic: ChatMessage = {
      ...msg,
      content: trimmed,
      editedAt: new Date().toISOString(),
    };
    replaceMessageInCaches(targetChId, optimistic);
    try {
      const updated = await apiModel.updateMessage(targetChId, msg.id, trimmed);
      replaceMessageInCaches(targetChId, { ...optimistic, ...updated, optimistic: false });
      onNotice?.("Đã cập nhật nội dung tin nhắn.");
    } catch (e) {
      replaceMessageInCaches(targetChId, snapshot);
      onError(describeError(e));
    }
  };

  const deleteMessage = async (msg: ChatMessage) => {
    if (msg.optimistic) return;
    const targetChId = msg.channelId;
    removeMessageFromCaches(targetChId, msg.id);
    try {
      await apiModel.deleteMessage(targetChId, msg.id);
      onNotice?.("Đã xoá tin nhắn khỏi kênh.");
    } catch (e) {
      void queryClient.invalidateQueries({ queryKey: qk.channelMessages(targetChId) });
      void queryClient.invalidateQueries({ queryKey: qk.channelPinnedMessages(targetChId) });
      onError(describeError(e));
    }
  };

  return { togglePinMessage, toggleReactionMessage, editMessage, deleteMessage };
}
