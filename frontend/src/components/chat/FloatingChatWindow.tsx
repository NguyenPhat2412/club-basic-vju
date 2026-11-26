"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/api/chat/chat.api";
import { useSession } from "@/hooks/useSession";
import { useChannelMessages, useChannelPinnedMessages } from "@/hooks/chat/useClubChat";
import { useChatMessageActions } from "@/hooks/chat/useChatMessageActions";
import { useChatRealtime } from "@/hooks/chat/useChatRealtime";
import { useChatMessageSender } from "@/hooks/chat/useChatMessageSender";
import { useChatAppearance } from "@/forms/chat/chat-appearance";
import { useChatChannelMuted } from "@/forms/chat/chat-mute";
import { filterChannelMessages } from "@/lib/chat-message-cache";
import { qk } from "@/lib/api/query-keys";
import { FLOATING_CHAT_SIZE_PRESETS, useChatDock } from "@/providers/ChatDockProvider";
import { ChatMediaLightbox } from "@/components/management/ChatMediaLightbox";
import { ChatPinnedBar } from "@/components/management/ChatPinnedBar";
import { FloatingChatComposer } from "@/components/chat/FloatingChatComposer";
import { FloatingChatHeader } from "@/components/chat/FloatingChatHeader";
import { FloatingChatMessageList } from "@/components/chat/FloatingChatMessageList";
import { FloatingChatSearchBar } from "@/components/chat/FloatingChatSearchBar";
import { describeError } from "@/components/shared/ListPage";
import { toast } from "@/components/ui/toast";
import { cn, saveBlob } from "@/lib/utils";
import type { ChatAttachment, ChatMessage, MyChatChannel } from "@/types/chat/chat.types";

const OLDER_PAGE_SIZE = 30;

export function FloatingChatWindow({
  channel,
  onMinimize,
  onClose,
}: {
  channel: MyChatChannel;
  onMinimize: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const dock = useChatDock();
  const userId = session.user?.id;
  const canSend = session.canInClub("chat.send", channel.clubId);
  const canSummarize = session.canInClub("chat.summarize", channel.clubId);
  const canViewClubDocs = session.canInClub("document.view", channel.clubId);
  const canModerate = session.canClubWide("club.update", channel.clubId) || canSummarize;
  const { config: appearance, update: updateAppearance, reset: resetAppearance } = useChatAppearance(channel.id);
  const { muted, toggle: toggleMute } = useChatChannelMuted(channel.id);

  const [draggingOver, setDraggingOver] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIdx, setSearchIdx] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [highlightedId, setHighlightedId] = useState("");
  const [olderByChannel, setOlderByChannel] = useState<Record<string, ChatMessage[]>>({});
  const [exhaustedChannels, setExhaustedChannels] = useState<Record<string, boolean>>({});
  const [loadingOlder, setLoadingOlder] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const prependHeightRef = useRef<number | null>(null);
  const prevNewestIdRef = useRef("");
  const highlightTimerRef = useRef<number | null>(null);
  const lastReadMarkedRef = useRef("");

  const messagesQuery = useChannelMessages(channel.id, OLDER_PAGE_SIZE, true, userId);
  const pinnedQuery = useChannelPinnedMessages(channel.id, true, userId);
  const { status: wsStatus, typingUsers, sendTyping } = useChatRealtime({
    clubId: channel.clubId,
    activeChannelId: channel.id,
    currentUserId: userId,
    enabled: true,
  });

  const sender = useChatMessageSender({
    activeChannelId: channel.id,
    userId,
    userFullName: session.user?.fullName || session.user?.email,
    onError: (msg) => { if (msg?.trim()) toast.error(msg); },
  });

  const actions = useChatMessageActions({
    queryClient,
    activeChannelId: channel.id,
    userId,
    userFullName: session.user?.fullName || session.user?.email,
    setOlderByChannel,
    onNotice: (msg) => { if (msg?.trim()) toast.success(msg); },
    onError: (msg) => { if (msg?.trim()) toast.error(msg); },
  });

  const mergedDesc = useMemo(() => {
    const primaryDesc = filterChannelMessages(messagesQuery.data?.items ?? [], channel.id);
    const extraOlder = filterChannelMessages(olderByChannel[channel.id], channel.id);
    const seen = new Set(primaryDesc.map((m) => m.id));
    return [...primaryDesc, ...extraOlder.filter((m) => !seen.has(m.id))];
  }, [messagesQuery.data?.items, olderByChannel, channel.id]);

  const items = useMemo(() => [...mergedDesc].reverse(), [mergedDesc]);
  const newestId = items[items.length - 1]?.id ?? "";
  const hasMore =
    !exhaustedChannels[channel.id] &&
    mergedDesc.length > 0 &&
    mergedDesc.length < (messagesQuery.data?.total ?? 0);

  const hasUserMessages = useMemo(() => items.some((m) => m.senderType === "USER"), [items]);
  const channelMedia = useMemo<ChatAttachment[]>(
    () => items.flatMap((m) => (m.attachments ?? []).filter((a) => a.mediaKind === "IMAGE" || a.mediaKind === "VIDEO")),
    [items],
  );
  const latestOwnIndex = useMemo(() => {
    for (let i = items.length - 1; i >= 0; i -= 1) {
      if (items[i]!.senderType !== "AI_BOT" && items[i]!.senderId === userId) return i;
    }
    return -1;
  }, [items, userId]);

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!searchOpen || !q) return [];
    const matchedIds: string[] = [];
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const m = items[i]!;
      const haystack = `${m.content ?? ""} ${m.senderFullName ?? ""} ${m.documentName ?? ""}`.toLowerCase();
      if (haystack.includes(q)) matchedIds.push(m.id);
    }
    return matchedIds;
  }, [items, searchOpen, searchQuery]);

  const searchMatchSet = useMemo(() => new Set(searchMatches), [searchMatches]);
  const activeSearchIdx = searchMatches.length > 0 ? Math.min(searchIdx, searchMatches.length - 1) : 0;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && prependHeightRef.current !== null && !loadingOlder) {
      el.scrollTop = Math.max(0, el.scrollHeight - prependHeightRef.current);
      prependHeightRef.current = null;
      return;
    }
    if (newestId && prevNewestIdRef.current !== newestId) {
      const isInitial = !prevNewestIdRef.current;
      prevNewestIdRef.current = newestId;
      listEndRef.current?.scrollIntoView({
        behavior: isInitial || !appearance.animations ? "auto" : "smooth",
        block: "end",
      });
    }
  }, [newestId, items.length, loadingOlder, appearance.animations]);

  useEffect(() => {
    if (!newestId || lastReadMarkedRef.current === newestId) return;
    if ((channel.unreadCount ?? 0) === 0 && items[items.length - 1]?.senderId === userId) return;
    lastReadMarkedRef.current = newestId;
    chatApi
      .markChannelRead(channel.id, newestId)
      .then(() => {
        queryClient.setQueryData<MyChatChannel[]>(qk.myChatChannels(), (old) =>
          old?.map((c) => (c.id === channel.id ? { ...c, unreadCount: 0 } : c)),
        );
        queryClient.invalidateQueries({ queryKey: qk.unreadSummary() });
      })
      .catch(() => {});
  }, [channel.id, channel.unreadCount, items, newestId, queryClient, userId]);

  const jumpToMessage = (messageId: string) => {
    const el = document.getElementById(`dock-msg-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: appearance.animations ? "smooth" : "auto", block: "center" });
    setHighlightedId(messageId);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightedId(""), 2000);
  };

  const handleLoadOlder = async () => {
    const oldest = mergedDesc.filter((m) => !m.optimistic).at(-1);
    if (!oldest || loadingOlder) return;
    prependHeightRef.current = scrollRef.current?.scrollHeight ?? null;
    setLoadingOlder(true);
    try {
      const page = await chatApi.channelMessages(channel.id, 0, OLDER_PAGE_SIZE, oldest.id);
      const safeItems = filterChannelMessages(page.items, channel.id);
      if (!safeItems.length) {
        setExhaustedChannels((prev) => ({ ...prev, [channel.id]: true }));
      } else {
        setOlderByChannel((prev) => {
          const existing = prev[channel.id] ?? [];
          const seen = new Set(existing.map((m) => m.id));
          return {
            ...prev,
            [channel.id]: [...existing, ...safeItems.filter((m) => !seen.has(m.id))],
          };
        });
        if (safeItems.length < OLDER_PAGE_SIZE) {
          setExhaustedChannels((prev) => ({ ...prev, [channel.id]: true }));
        }
      }
    } catch (e) {
      prependHeightRef.current = null;
      toast.error(describeError(e));
    } finally {
      setLoadingOlder(false);
    }
  };

  const stepSearch = (delta: number) => {
    if (!searchMatches.length) return;
    const next = (activeSearchIdx + delta + searchMatches.length) % searchMatches.length;
    setSearchIdx(next);
    jumpToMessage(searchMatches[next]!);
  };

  const handleSend = (overrideText?: string) => {
    if (!canSend) return;
    sender.handleDispatchSend(overrideText);
    window.setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: qk.myChatChannels() });
    }, 450);
  };

  const windowSize = dock?.windowSize ?? "compact";
  const sizeClass = FLOATING_CHAT_SIZE_PRESETS[windowSize].className;

  return (
    <section
      aria-label={`Khung chat ${channel.name}`}
      onDragOver={(e) => {
        if (!canSend) return;
        e.preventDefault();
        setDraggingOver(true);
      }}
      onDragLeave={() => setDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDraggingOver(false);
        if (canSend && e.dataTransfer.files?.length) sender.handleAddFiles(e.dataTransfer.files);
      }}
      className={cn(
        "pointer-events-auto isolate relative flex flex-col rounded-t-2xl border border-b-0 border-slate-200 bg-white shadow-2xl transition-[width,height] duration-150",
        sizeClass,
      )}
    >
      {draggingOver && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-t-2xl bg-white/85 backdrop-blur-2xs">
          <div className="rounded-2xl border-2 border-dashed border-primary bg-primary/5 px-5 py-3 text-center text-xs font-bold text-primary">
            Thả ảnh hoặc tệp vào đây để gửi
          </div>
        </div>
      )}

      <FloatingChatHeader
        channel={channel}
        wsStatus={wsStatus}
        muted={muted}
        onToggleMute={() => {
          const next = toggleMute();
          toast.info(next ? "Đã tắt thông báo kênh" : "Đã bật thông báo kênh");
        }}
        searchOpen={searchOpen}
        onToggleSearch={() => {
          setSearchOpen((prev) => {
            if (prev) {
              setSearchQuery("");
              setSearchIdx(0);
            }
            return !prev;
          });
        }}
        channelMediaCount={channelMedia.length}
        onOpenGallery={() => setGalleryIndex(channelMedia.length - 1)}
        canSummarize={canSummarize}
        hasUserMessages={hasUserMessages}
        aiOpen={aiOpen}
        onAiOpenChange={setAiOpen}
        appearance={appearance}
        onUpdateAppearance={updateAppearance}
        onResetAppearance={resetAppearance}
        windowSize={windowSize}
        onWindowSizeChange={dock?.setWindowSize}
        onExpandFull={() => {
          onClose();
          router.push(`/management?tab=chat&clubId=${encodeURIComponent(channel.clubId)}&channelId=${encodeURIComponent(channel.id)}`);
        }}
        onMinimize={onMinimize}
        onClose={onClose}
      />

      <ChatPinnedBar
        pinnedMessages={pinnedQuery.data ?? []}
        canPin={canSend}
        onJumpToMessage={jumpToMessage}
        onUnpin={(messageId) => {
          const target = (pinnedQuery.data ?? []).find((p) => p.id === messageId);
          if (target) actions.togglePinMessage(target, true);
        }}
      />

      <FloatingChatSearchBar
        open={searchOpen}
        query={searchQuery}
        onQueryChange={(val) => {
          setSearchQuery(val);
          setSearchIdx(0);
          const q = val.trim().toLowerCase();
          if (q) {
            const firstMatch = [...items]
              .reverse()
              .find((m) => `${m.content ?? ""} ${m.senderFullName ?? ""} ${m.documentName ?? ""}`.toLowerCase().includes(q));
            if (firstMatch) jumpToMessage(firstMatch.id);
          }
        }}
        matchCount={searchMatches.length}
        activeIndex={activeSearchIdx}
        onPrev={() => stepSearch(-1)}
        onNext={() => stepSearch(1)}
        onClose={() => {
          setSearchOpen(false);
          setSearchQuery("");
          setSearchIdx(0);
        }}
      />

      <FloatingChatMessageList
        scrollRef={scrollRef}
        listEndRef={listEndRef}
        appearance={appearance}
        items={items}
        isPending={messagesQuery.isPending}
        hasMore={hasMore}
        loadingOlder={loadingOlder}
        onLoadOlder={() => void handleLoadOlder()}
        channelMedia={channelMedia}
        userId={userId}
        latestOwnIndex={latestOwnIndex}
        highlightedId={highlightedId}
        searchMatchSet={searchMatchSet}
        typingUsers={typingUsers}
        canSend={canSend}
        canModerate={canModerate}
        onReply={(msg) => sender.setReplyTo(msg)}
        onToggleReaction={actions.toggleReactionMessage}
        onTogglePin={(msg) => actions.togglePinMessage(msg)}
        onEditMessage={actions.editMessage}
        onDeleteMessage={actions.deleteMessage}
        onRetryMessage={sender.handleRetryMessage}
        onJumpToMessage={jumpToMessage}
      />

      <FloatingChatComposer
        clubId={channel.clubId}
        canSend={canSend}
        canSummarize={canSummarize}
        canViewClubDocs={canViewClubDocs}
        fontSize={appearance.fontSize}
        content={sender.content}
        onContentChange={sender.setContent}
        replyTo={sender.replyTo}
        onClearReply={() => sender.setReplyTo(null)}
        attachedDoc={sender.attachedDoc}
        onSelectDoc={sender.setAttachedDoc}
        onClearAttachedDoc={() => sender.setAttachedDoc(null)}
        stagedMedia={sender.stagedMedia}
        onAddFiles={sender.handleAddFiles}
        onRemoveStagedMedia={sender.handleRemoveStagedMedia}
        sendPending={sender.sendPending}
        onSend={() => handleSend()}
        onQuickLike={() => handleSend("👍")}
        onTyping={sendTyping}
        onOpenAi={() => setAiOpen(true)}
      />

      <ChatMediaLightbox
        media={channelMedia}
        activeIndex={galleryIndex}
        onIndexChange={setGalleryIndex}
        onDownload={(att) => {
          void chatApi
            .streamChatAttachment(att.id, true)
            .then((blob) => saveBlob(blob, att.fileName))
            .catch(() => toast.error("Không tải được tệp đính kèm. Vui lòng thử lại."));
        }}
      />
    </section>
  );
}
