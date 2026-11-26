"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { MyChatChannel } from "@/types/chat/chat.types";

const MAX_OPEN_WINDOWS = 2;
const MAX_MINIMIZED_HEADS = 4;
const STORAGE_PREFIX = "vju-chat-dock:v1:";

export type FloatingChatSize = "compact" | "medium" | "large";

export const FLOATING_CHAT_SIZE_PRESETS: Record<
  FloatingChatSize,
  { label: string; className: string }
> = {
  compact: { label: "Gọn", className: "h-[452px] w-[336px]" },
  medium: { label: "Vừa", className: "h-[536px] w-[400px]" },
  large: { label: "Lớn", className: "h-[612px] w-[464px]" },
};

const VALID_SIZES = new Set<FloatingChatSize>(["compact", "medium", "large"]);

type DockSnapshot = {
  openIds: string[];
  minimizedIds: string[];
  windowSize: FloatingChatSize;
};

type ChatDockContextValue = {
  openIds: string[];
  minimizedIds: string[];
  windowSize: FloatingChatSize;
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
  togglePicker: () => void;
  setWindowSize: (size: FloatingChatSize) => void;
  openChannel: (channelId: string) => void;
  minimizeChannel: (channelId: string) => void;
  closeChannel: (channelId: string) => void;
  reconcileChannels: (channels: MyChatChannel[]) => void;
};

const ChatDockContext = createContext<ChatDockContextValue | null>(null);

function readDockStorage(userId?: string): DockSnapshot {
  const empty: DockSnapshot = { openIds: [], minimizedIds: [], windowSize: "compact" };
  if (typeof window === "undefined" || !userId) return empty;
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<DockSnapshot>;
    const size = VALID_SIZES.has(parsed.windowSize as FloatingChatSize)
      ? (parsed.windowSize as FloatingChatSize)
      : "compact";
    return {
      openIds: Array.isArray(parsed.openIds) ? parsed.openIds.slice(0, MAX_OPEN_WINDOWS) : [],
      minimizedIds: Array.isArray(parsed.minimizedIds) ? parsed.minimizedIds.slice(0, MAX_MINIMIZED_HEADS) : [],
      windowSize: size,
    };
  } catch {
    return empty;
  }
}

export function ChatDockProvider({
  userId,
  children,
}: {
  userId?: string;
  children: ReactNode;
}) {
  const [dockState, setDockState] = useState<DockSnapshot>(() => readDockStorage(userId));
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    try {
      window.sessionStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(dockState));
    } catch {
      // Ignore private browsing quota errors
    }
  }, [dockState, userId]);

  const setWindowSize = useCallback((windowSize: FloatingChatSize) => {
    if (!VALID_SIZES.has(windowSize)) return;
    setDockState((prev) => ({ ...prev, windowSize }));
  }, []);

  const openChannel = useCallback((channelId: string) => {
    if (!channelId) return;
    setPickerOpen(false);
    setDockState((prev) => {
      const nextMinimized = prev.minimizedIds.filter((id) => id !== channelId);
      const withoutTarget = prev.openIds.filter((id) => id !== channelId);
      const nextOpen = [...withoutTarget, channelId];
      if (nextOpen.length > MAX_OPEN_WINDOWS) {
        const overflow = nextOpen.shift()!;
        nextMinimized.unshift(overflow);
      }
      return {
        ...prev,
        openIds: nextOpen.slice(-MAX_OPEN_WINDOWS),
        minimizedIds: nextMinimized.slice(0, MAX_MINIMIZED_HEADS),
      };
    });
  }, []);

  const minimizeChannel = useCallback((channelId: string) => {
    if (!channelId) return;
    setDockState((prev) => ({
      ...prev,
      openIds: prev.openIds.filter((id) => id !== channelId),
      minimizedIds: [channelId, ...prev.minimizedIds.filter((id) => id !== channelId)].slice(
        0,
        MAX_MINIMIZED_HEADS,
      ),
    }));
  }, []);

  const closeChannel = useCallback((channelId: string) => {
    if (!channelId) return;
    setDockState((prev) => ({
      ...prev,
      openIds: prev.openIds.filter((id) => id !== channelId),
      minimizedIds: prev.minimizedIds.filter((id) => id !== channelId),
    }));
  }, []);

  const reconcileChannels = useCallback((channels: MyChatChannel[]) => {
    const valid = new Set(channels.map((c) => c.id));
    setDockState((prev) => {
      const openIds = prev.openIds.filter((id) => valid.has(id));
      const minimizedIds = prev.minimizedIds.filter((id) => valid.has(id));
      if (openIds.length === prev.openIds.length && minimizedIds.length === prev.minimizedIds.length) {
        return prev;
      }
      return { ...prev, openIds, minimizedIds };
    });
  }, []);

  const togglePicker = useCallback(() => setPickerOpen((v) => !v), []);

  const value = useMemo<ChatDockContextValue>(
    () => ({
      openIds: dockState.openIds,
      minimizedIds: dockState.minimizedIds,
      windowSize: dockState.windowSize,
      pickerOpen,
      setPickerOpen,
      togglePicker,
      setWindowSize,
      openChannel,
      minimizeChannel,
      closeChannel,
      reconcileChannels,
    }),
    [
      dockState,
      pickerOpen,
      togglePicker,
      setWindowSize,
      openChannel,
      minimizeChannel,
      closeChannel,
      reconcileChannels,
    ],
  );

  return <ChatDockContext.Provider value={value}>{children}</ChatDockContext.Provider>;
}

export function useChatDock() {
  return useContext(ChatDockContext);
}
