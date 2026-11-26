"use client";

import type { RefObject } from "react";
import { Clock, Loader2 } from "lucide-react";
import {
  CHAT_WALLPAPER_CLASS,
  isDifferentCalendarDay,
  type ChatAppearanceConfig,
} from "@/forms/chat/chat-appearance";
import { areMessagesInSameDisplayGroup } from "@/lib/chat-message-cache";
import { FloatingChatMessageItem } from "@/components/chat/FloatingChatMessageItem";
import { cn } from "@/lib/utils";
import type { ChatAttachment, ChatMessage } from "@/types/chat/chat.types";

const TIME_DIVIDER_GAP_MS = 15 * 60_000;

function shouldShowTimeDivider(prevIso: string | undefined, currIso: string): boolean {
  if (!prevIso) return true;
  if (isDifferentCalendarDay(prevIso, currIso)) return true;
  const a = new Date(prevIso).getTime();
  const b = new Date(currIso).getTime();
  return Number.isFinite(a) && Number.isFinite(b) && b - a >= TIME_DIVIDER_GAP_MS;
}

export function FloatingChatMessageList({
  scrollRef,
  listEndRef,
  appearance,
  items,
  isPending,
  hasMore,
  loadingOlder,
  onLoadOlder,
  channelMedia,
  userId,
  latestOwnIndex,
  highlightedId,
  searchMatchSet,
  typingUsers,
  canSend,
  canModerate,
  onReply,
  onToggleReaction,
  onTogglePin,
  onEditMessage,
  onDeleteMessage,
  onRetryMessage,
  onJumpToMessage,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  listEndRef: RefObject<HTMLDivElement | null>;
  appearance: ChatAppearanceConfig;
  items: ChatMessage[];
  isPending: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  channelMedia: ChatAttachment[];
  userId?: string;
  latestOwnIndex: number;
  highlightedId: string;
  searchMatchSet: Set<string>;
  typingUsers: string[];
  canSend: boolean;
  canModerate: boolean;
  onReply: (msg: ChatMessage) => void;
  onToggleReaction: (msg: ChatMessage, emoji: string) => void;
  onTogglePin: (msg: ChatMessage) => void;
  onEditMessage: (msg: ChatMessage, nextContent: string) => Promise<void> | void;
  onDeleteMessage: (msg: ChatMessage) => Promise<void> | void;
  onRetryMessage: (clientTempId: string) => void;
  onJumpToMessage: (messageId: string) => void;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden",
        !appearance.backgroundImage && CHAT_WALLPAPER_CLASS[appearance.wallpaper],
      )}
      style={
        appearance.backgroundImage
          ? { backgroundImage: `url("${appearance.backgroundImage}")`, backgroundSize: "cover", backgroundPosition: "center" }
          : undefined
      }
    >
      {appearance.backgroundImage && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: `rgba(255,255,255,${(100 - appearance.backgroundDim) / 100})` }}
        />
      )}
      <div
        ref={scrollRef}
        data-chat-scroll="true"
        className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2.5 py-2.5 [overflow-anchor:none]"
      >
        {hasMore && !isPending && (
          <div className="mb-2 flex justify-center">
            <button
              type="button"
              disabled={loadingOlder}
              onClick={onLoadOlder}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-2xs transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
            >
              {loadingOlder ? <Loader2 size={11.5} className="animate-spin text-primary" /> : <Clock size={11.5} />}
              {loadingOlder ? "Đang tải tin cũ…" : "Tải tin cũ hơn"}
            </button>
          </div>
        )}

        {isPending && !items.length ? (
          <div className="space-y-2 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn("h-9 w-2/3 animate-pulse rounded-2xl bg-slate-200/70", i === 2 && "ml-auto")} />
            ))}
          </div>
        ) : !items.length ? (
          <div className="flex h-64 flex-col items-center justify-center px-4 text-center">
            <p className="text-xs font-bold text-slate-700">Chưa có tin nhắn nào</p>
            <p className="mt-1 text-[11px] text-slate-500">Gửi tin nhắn hoặc ảnh để bắt đầu trao đổi.</p>
          </div>
        ) : (
          items.map((m, idx) => {
            const prev = idx > 0 ? items[idx - 1] : undefined;
            const next = idx < items.length - 1 ? items[idx + 1] : undefined;
            const showDivider = shouldShowTimeDivider(prev?.createdAt, m.createdAt);
            const groupedPrev = !showDivider && areMessagesInSameDisplayGroup(prev, m);
            const groupedNext = next
              ? !shouldShowTimeDivider(m.createdAt, next.createdAt) && areMessagesInSameDisplayGroup(m, next)
              : false;
            return (
              <FloatingChatMessageItem
                key={m.clientTempId ?? m.id}
                message={m}
                galleryMedia={channelMedia}
                currentUserId={userId}
                showDivider={showDivider}
                groupedPrev={groupedPrev}
                groupedNext={groupedNext}
                isLatestOwn={idx === latestOwnIndex}
                highlighted={highlightedId === m.id}
                searchMatch={searchMatchSet.has(m.id)}
                appearance={appearance}
                canSend={canSend}
                canModerate={canModerate}
                onReply={onReply}
                onToggleReaction={onToggleReaction}
                onTogglePin={onTogglePin}
                onEditMessage={onEditMessage}
                onDeleteMessage={onDeleteMessage}
                onRetryMessage={onRetryMessage}
                onJumpToMessage={onJumpToMessage}
              />
            );
          })
        )}
        {typingUsers.length > 0 && (
          <p className="mt-1 px-2 text-[10.5px] italic text-slate-500">
            {typingUsers.slice(0, 2).join(", ")} đang nhập…
          </p>
        )}
        <div ref={listEndRef} />
      </div>
    </div>
  );
}
