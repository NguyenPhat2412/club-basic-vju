import { chatApi } from '@/api/chat/chat.api';
import { fileExtension } from '@/lib/utils';
import { mergeConfirmedDeliveryReceipt } from '@/forms/chat/chat-status-meta';
import type { Page } from '@/types/common.types';
import type { ChatAttachment, ChatAttachmentKind, ChatMessage } from '@/types/chat/chat.types';

// Chat-TTA style WebSocket & Media Cache:
// 1. User-scoped LRU channel message window cache (instant 0ms channel switch + sessionStorage hydration)
// 2. Optimistic clientTempId -> STOMP WebSocket / HTTP reconciliation without duplicate flicker
// 3. Seeded Media ObjectURL LRU cache so uploaded images/videos never re-fetch or blink on confirm
// 4. Vietnamese Telex/VNI IME post-send guard

export const CHAT_IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
export const CHAT_VIDEO_EXTS = new Set(['mp4', 'webm', 'mov']);
export const CHAT_FILE_EXTS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md', 'zip',
]);

export const CHAT_MAX_IMAGE_OR_FILE_BYTES = 20 * 1024 * 1024;
export const CHAT_MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const CHAT_MAX_ATTACHMENTS = 8;

const WINDOW_CACHE_LIMIT = 24;
const SESSION_WINDOW_LIMIT = 10;
const SESSION_MAX_CHARS = 900_000;
const MEDIA_BLOB_LIMIT = 96;
const SESSION_STORAGE_KEY = 'vju-club:chat-windows:v1';

type CachedChannelWindow = {
  page: Page<ChatMessage>;
  savedAt: number;
};

type StoredSessionPayload = {
  owner: string;
  savedAt: number;
  entries: Array<[string, CachedChannelWindow]>;
};

export type ComposerKeyboardEventLike = {
  isComposing?: boolean;
  key?: string;
  keyCode?: number;
  nativeEvent?: { isComposing?: boolean; keyCode?: number };
};

export type ComposerPostSendImeGuard = {
  hasUserTypedSinceSend: boolean;
  sentAt: number;
  sentBody: string;
};

const windowMap = new Map<string, CachedChannelWindow>();
const pinnedMap = new Map<string, { items: ChatMessage[]; savedAt: number }>();
const mediaUrlCache = new Map<string, string>();
const pinnedPreviewUrls = new Set<string>();
const inflightMediaLoads = new Map<string, Promise<string>>();
let cacheOwner = '';
let hydratedSession = false;

export function filterChannelMessages(items: ChatMessage[] | undefined, channelId: string): ChatMessage[] {
  if (!channelId || !items?.length) return [];
  return items.filter((m) => m.channelId === channelId);
}

export function setMessageWindowCacheEntry<T>(
  cache: Map<string, T>,
  channelId: string,
  entry: T,
  limit: number,
  keepChannelId: string | null
) {
  cache.delete(channelId);
  cache.set(channelId, entry);
  for (const key of cache.keys()) {
    if (cache.size <= limit) break;
    if (key !== keepChannelId) cache.delete(key);
  }
}

export function readRealtimeChatMessage(
  value: unknown,
  channelId: string
): ChatMessage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<ChatMessage>;
  if (
    typeof candidate.id !== 'string' ||
    candidate.channelId !== channelId ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.content !== 'string'
  ) {
    return null;
  }
  return value as ChatMessage;
}

export function canApplyActiveChannelMessage(input: {
  activeChannelId: string;
  channelId: string;
  message: ChatMessage;
}): boolean {
  return (
    Boolean(input.activeChannelId && input.channelId && input.message?.id) &&
    input.activeChannelId === input.channelId &&
    input.message.channelId === input.channelId
  );
}

export function reconcileIncomingChatMessage(
  oldPage: Page<ChatMessage> | undefined,
  incoming: ChatMessage,
  limit = 50
): { page: Page<ChatMessage>; insertedNew: boolean } {
  const cleanIncoming: ChatMessage = {
    ...incoming,
    optimistic: false,
    deliveryStatus: incoming.deliveryStatus && incoming.deliveryStatus !== 'sending' && incoming.deliveryStatus !== 'uploading' && incoming.deliveryStatus !== 'failed' ? incoming.deliveryStatus : 'sent',
    deliveryError: undefined,
  };
  if (!oldPage) return { page: { items: [cleanIncoming], total: 1, offset: 0, limit }, insertedNew: true };
  const channelItems = oldPage.items.filter((m) => m.channelId === incoming.channelId);

  const existingByIdIdx = channelItems.findIndex((m) => m.id === incoming.id);
  if (existingByIdIdx >= 0) {
    const nextItems = [...channelItems];
    nextItems[existingByIdIdx] = mergeConfirmedDeliveryReceipt(nextItems[existingByIdIdx], cleanIncoming);
    return { page: { ...oldPage, items: nextItems }, insertedNew: false };
  }

  if (incoming.clientTempId) {
    const tempIdx = channelItems.findIndex(
      (m) => m.id === incoming.clientTempId || m.clientTempId === incoming.clientTempId
    );
    if (tempIdx >= 0) {
      const prevOptimistic = channelItems[tempIdx];
      const mergedAttachments = (incoming.attachments ?? []).map((att, idx) => {
        const localFallback = prevOptimistic?.attachments?.[idx]?.localPreviewUrl;
        if (localFallback) seedChatAttachmentPreviewUrl(att.id, localFallback, true);
        return { ...att, localPreviewUrl: getCachedChatAttachmentUrl(att.id) ?? localFallback };
      });
      const nextItems = [...channelItems];
      nextItems[tempIdx] = {
        ...cleanIncoming,
        attachments: mergedAttachments.length ? mergedAttachments : incoming.attachments,
      };
      return { page: { ...oldPage, items: nextItems }, insertedNew: false };
    }
  }

  return {
    page: { ...oldPage, items: [cleanIncoming, ...channelItems], total: oldPage.total + 1 },
    insertedNew: true,
  };
}

export function reconcilePinnedChatMessage(
  oldItems: ChatMessage[] | undefined,
  incoming: ChatMessage,
  isPinned: boolean,
  maxPinned = 10
): ChatMessage[] {
  const base = (oldItems ?? []).filter((m) => m.channelId === incoming.channelId && m.id !== incoming.id);
  return isPinned ? [{ ...incoming, pinned: true, optimistic: false }, ...base].slice(0, maxPinned) : base;
}

function syncOwner(userId?: string) {
  const normalized = userId?.trim() || '';
  if (hydratedSession && normalized === cacheOwner) return normalized;
  windowMap.clear();
  pinnedMap.clear();
  cacheOwner = normalized;
  hydratedSession = true;
  if (!normalized || typeof window === 'undefined') return normalized;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredSessionPayload) : null;
    if (parsed?.owner === normalized && Array.isArray(parsed.entries)) {
      for (const [chId, entry] of parsed.entries) {
        if (chId && entry?.page?.items) windowMap.set(chId, entry);
      }
    }
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
  return normalized;
}

function persistWindowCache() {
  if (!cacheOwner || typeof window === 'undefined') return;
  try {
    let entries = [...windowMap.entries()]
      .map(([chId, val]): [string, CachedChannelWindow] => [
        chId,
        {
          savedAt: val.savedAt,
          page: { ...val.page, items: val.page.items.filter((m) => !m.optimistic).slice(0, 40) },
        },
      ])
      .slice(-SESSION_WINDOW_LIMIT);
    let json = JSON.stringify({ owner: cacheOwner, savedAt: Date.now(), entries });
    while (entries.length > 0 && json.length > SESSION_MAX_CHARS) {
      entries = entries.slice(1);
      json = JSON.stringify({ owner: cacheOwner, savedAt: Date.now(), entries });
    }
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, json);
  } catch {
    // Ignore sessionStorage errors
  }
}

export function getCachedChannelWindow(channelId: string, userId?: string): CachedChannelWindow | undefined {
  if (!channelId || !syncOwner(userId)) return undefined;
  return windowMap.get(channelId);
}

export function saveCachedChannelWindow(
  channelId: string,
  page: Page<ChatMessage>,
  userId?: string,
  keepChannelId: string | null = channelId
) {
  if (!channelId || !syncOwner(userId)) return;
  const scopedPage = { ...page, items: filterChannelMessages(page.items, channelId) };
  setMessageWindowCacheEntry(windowMap, channelId, { page: scopedPage, savedAt: Date.now() }, WINDOW_CACHE_LIMIT, keepChannelId);
  persistWindowCache();
}

export function getCachedPinnedMessages(channelId: string, userId?: string) {
  if (!channelId || !syncOwner(userId)) return undefined;
  return pinnedMap.get(channelId);
}

export function saveCachedPinnedMessages(
  channelId: string,
  items: ChatMessage[],
  userId?: string,
  keepChannelId: string | null = channelId
) {
  if (!channelId || !syncOwner(userId)) return;
  setMessageWindowCacheEntry(
    pinnedMap,
    channelId,
    { items: filterChannelMessages(items, channelId), savedAt: Date.now() },
    WINDOW_CACHE_LIMIT,
    keepChannelId
  );
}

export function seedChatAttachmentPreviewUrl(attachmentId: string, objectUrl: string, pin = false) {
  if (!attachmentId || !objectUrl) return;
  if (pin) pinnedPreviewUrls.add(objectUrl);
  mediaUrlCache.delete(attachmentId);
  mediaUrlCache.set(attachmentId, objectUrl);
  for (const [key, url] of mediaUrlCache.entries()) {
    if (mediaUrlCache.size <= MEDIA_BLOB_LIMIT) break;
    mediaUrlCache.delete(key);
    if (!pinnedPreviewUrls.has(url) && url.startsWith('blob:') && typeof URL !== 'undefined') {
      URL.revokeObjectURL(url);
    }
  }
}

export function getCachedChatAttachmentUrl(attachmentId?: string | null): string | undefined {
  return attachmentId ? mediaUrlCache.get(attachmentId) : undefined;
}

export async function resolveChatAttachmentUrl(attachment: ChatAttachment): Promise<string> {
  const cached = mediaUrlCache.get(attachment.id) ?? attachment.localPreviewUrl;
  if (cached) return cached;
  if (attachment.mediaKind === 'VIDEO' && attachment.sizeBytes > 25 * 1024 * 1024) {
    return chatApi.chatAttachmentStreamUrl(attachment.id);
  }
  const existing = inflightMediaLoads.get(attachment.id);
  if (existing) return existing;

  const task = chatApi
    .streamChatAttachment(attachment.id)
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      seedChatAttachmentPreviewUrl(attachment.id, url);
      return url;
    })
    .catch(() => chatApi.chatAttachmentStreamUrl(attachment.id))
    .finally(() => {
      inflightMediaLoads.delete(attachment.id);
    });

  inflightMediaLoads.set(attachment.id, task);
  return task;
}

export function preloadChannelMedia(messages: ChatMessage[], limit = 10) {
  if (typeof window === 'undefined') return;
  let count = 0;
  for (const msg of messages) {
    for (const att of msg.attachments ?? []) {
      if (count >= limit) return;
      if (att.mediaKind !== 'IMAGE' || mediaUrlCache.has(att.id)) continue;
      count += 1;
      void resolveChatAttachmentUrl(att);
    }
  }
}

export function validateChatMediaFile(file: Pick<File, 'name' | 'size' | 'type'>): {
  kind: ChatAttachmentKind;
  error: string | null;
} {
  const ext = fileExtension(file.name, file.type);
  if (file.size <= 0) {
    return { kind: 'FILE', error: `Tệp "${file.name}" rỗng (0 B).` };
  }
  if (CHAT_IMAGE_EXTS.has(ext)) {
    return file.size > CHAT_MAX_IMAGE_OR_FILE_BYTES
      ? { kind: 'IMAGE', error: `Ảnh "${file.name}" vượt quá giới hạn 20 MB.` }
      : { kind: 'IMAGE', error: null };
  }
  if (CHAT_VIDEO_EXTS.has(ext)) {
    return file.size > CHAT_MAX_VIDEO_BYTES
      ? { kind: 'VIDEO', error: `Video "${file.name}" vượt quá giới hạn 50 MB.` }
      : { kind: 'VIDEO', error: null };
  }
  if (CHAT_FILE_EXTS.has(ext)) {
    return file.size > CHAT_MAX_IMAGE_OR_FILE_BYTES
      ? { kind: 'FILE', error: `Tệp "${file.name}" vượt quá giới hạn 20 MB.` }
      : { kind: 'FILE', error: null };
  }
  return {
    kind: 'FILE',
    error: `Định dạng .${ext} chưa hỗ trợ. Hỗ trợ ảnh (png, jpg, gif, webp), video (mp4, webm, mov) và tài liệu (pdf, docx, xlsx, pptx, txt, csv, zip).`,
  };
}

export function isComposerImeComposing(event: ComposerKeyboardEventLike): boolean {
  return Boolean(
    event.nativeEvent?.isComposing ||
      event.isComposing ||
      event.keyCode === 229 ||
      event.nativeEvent?.keyCode === 229 ||
      event.key === 'Process'
  );
}

export function shouldIgnoreTrailingComposerImeText(
  guard: ComposerPostSendImeGuard | null | undefined,
  candidateText: string,
  now = Date.now(),
  windowMs = 180
): boolean {
  if (!guard || guard.hasUserTypedSinceSend || now - guard.sentAt > windowMs) {
    return false;
  }
  const cand = candidateText.trim().normalize('NFC').toLowerCase();
  const sent = guard.sentBody.trim().normalize('NFC').toLowerCase();
  return Boolean(cand && sent && sent.endsWith(cand));
}

// Chat-TTA album rows: 1 -> [1], 2 -> [2], 3 -> [3], 4 -> [2,2], 5 -> [2,3], 6 -> [3,3], 7 -> [2,2,3], 8 -> [2,3,3]
export function getAlbumRows(count: number): number[] {
  if (count <= 0) return [];
  if (count <= 3) return [count];
  const twos = count % 3 === 1 ? 2 : count % 3 === 2 ? 1 : 0;
  return [...Array<number>(twos).fill(2), ...Array<number>((count - twos * 2) / 3).fill(3)];
}

export function chunkAlbumRows<T>(items: T[]): Array<Array<{ index: number; item: T }>> {
  let offset = 0;
  return getAlbumRows(items.length).map((size) => {
    const row = items.slice(offset, offset + size).map((item, pos) => ({ index: offset + pos, item }));
    offset += size;
    return row;
  });
}

export function areMessagesInSameDisplayGroup(prev?: ChatMessage, next?: ChatMessage): boolean {
  if (!prev || !next) return false;
  if (prev.senderType !== 'USER' || next.senderType !== 'USER') return false;
  if (!prev.senderId || prev.senderId !== next.senderId) return false;
  if (next.replyToId) return false;
  const delta = Math.abs(new Date(next.createdAt).getTime() - new Date(prev.createdAt).getTime());
  return Number.isFinite(delta) && delta <= 5 * 60 * 1000;
}

export function formatChatTimeCompact(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}
