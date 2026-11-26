"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "vju.chat.muted.v1";
const SYNC_EVENT = "vju-chat-mute-sync";
const EMPTY_JSON = "[]";

export function parseMutedChannelIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of parsed) {
      if (typeof item === "string" && item.trim() && !seen.has(item)) {
        seen.add(item);
        out.push(item);
      }
    }
    return out;
  } catch {
    return [];
  }
}

function readSnapshot(): string {
  if (typeof window === "undefined") return EMPTY_JSON;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || EMPTY_JSON;
  } catch {
    return EMPTY_JSON;
  }
}

function writeMutedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    // ignore storage quota errors
  }
}

function subscribeMute(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  window.addEventListener(SYNC_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(SYNC_EVENT, cb);
  };
}

export function isChatChannelMuted(channelId?: string | null): boolean {
  if (!channelId) return false;
  return parseMutedChannelIds(readSnapshot()).includes(channelId);
}

export function setChatChannelMuted(channelId: string, muted: boolean): boolean {
  if (!channelId) return false;
  const current = parseMutedChannelIds(readSnapshot());
  const exists = current.includes(channelId);
  if (muted && !exists) {
    writeMutedIds([...current, channelId]);
  } else if (!muted && exists) {
    writeMutedIds(current.filter((id) => id !== channelId));
  }
  return muted;
}

export function toggleChatChannelMuted(channelId: string): boolean {
  if (!channelId) return false;
  return setChatChannelMuted(channelId, !isChatChannelMuted(channelId));
}

export function useMutedChatChannels(): Set<string> {
  const raw = useSyncExternalStore(subscribeMute, readSnapshot, () => EMPTY_JSON);
  return useMemo(() => new Set(parseMutedChannelIds(raw)), [raw]);
}

export function useChatChannelMuted(channelId?: string) {
  const mutedSet = useMutedChatChannels();
  const muted = Boolean(channelId && mutedSet.has(channelId));

  const setMuted = useCallback(
    (next: boolean) => {
      if (!channelId) return;
      setChatChannelMuted(channelId, next);
    },
    [channelId],
  );

  const toggle = useCallback(() => {
    if (!channelId) return false;
    return toggleChatChannelMuted(channelId);
  }, [channelId]);

  return { muted, setMuted, toggle };
}
