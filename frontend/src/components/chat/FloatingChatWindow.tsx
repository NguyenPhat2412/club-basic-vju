"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Hash, Images, Maximize2, Minus, X } from "lucide-react";
import { chatApi } from "@/api/chat/chat.api";
import { useSession } from "@/hooks/useSession";
import { useChannelMessages, useChannelPinnedMessages } from "@/hooks/chat/useClubChat";
import { useChatMessageActions } from "@/hooks/chat/useChatMessageActions";
import { useChatRealtime } from "@/hooks/chat/useChatRealtime";
import { useChatMessageSender } from "@/hooks/chat/useChatMessageSender";
import {
  CHAT_WALLPAPER_CLASS,
  isDifferentCalendarDay,
  useChatAppearance,
} from "@/forms/chat/chat-appearance";
import {
  areMessagesInSameDisplayGroup,
  filterChannelMessages,
} from "@/lib/chat-message-cache";
import { resolveMediaUrl } from "@/lib/media";
import { qk } from "@/lib/api/query-keys";
import { FLOATING_CHAT_SIZE_PRESETS, useChatDock } from "@/providers/ChatDockProvider";
import { ChatAppearancePopover } from "@/components/management/ChatAppearancePopover";
import { ChatMediaLightbox } from "@/components/management/ChatMediaLightbox";
import { ChatPinnedBar } from "@/components/management/ChatPinnedBar";
import { FloatingChatAiPopover } from "@/components/chat/FloatingChatAiPopover";
import { FloatingChatComposer } from "@/components/chat/FloatingChatComposer";
import { FloatingChatMessageItem } from "@/components/chat/FloatingChatMessageItem";
import { toast } from "@/components/ui/toast";
import { cn, saveBlob } from "@/lib/utils";
import type { ChatAttachment, ChatMessage, MyChatChannel } from "@/types/chat/chat.types";

const TIME_DIVIDER_GAP_MS = 15 * 60_000;

function shouldShowTimeDivider(prevIso: string | undefined, currIso: string): boolean {
  if (!prevIso) return true;
  if (isDifferentCalendarDay(prevIso, currIso)) return true;
  const a = new Date(prevIso).getTime();
  const b = new Date(currIso).getTime();
  return Number.isFinite(a) && Number.isFinite(b) && b - a >= TIME_DIVIDER_GAP_MS;
}

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
  const canModerate = session.canClubWide("club.update", channel.clubId) || canSummarize;
  const { config: appearance, update: updateAppearance, reset: resetAppearance } = useChatAppearance(channel.id);

  const [logoFailed, setLogoFailed] = useState(false);
  const [draggingOver, setDraggingOver] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [highlightedId, setHighlightedId] = useState("");
  const [, setOlderNoop] = useState<Record<string, ChatMessage[]>>({});
  const listEndRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const lastReadMarkedRef = useRef("");

  const messagesQuery = useChannelMessages(channel.id, 30, true, userId);
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
    setOlderByChannel: setOlderNoop,
    onNotice: (msg) => { if (msg?.trim()) toast.success(msg); },
    onError: (msg) => { if (msg?.trim()) toast.error(msg); },
  });

  const items = useMemo(() => {
    const raw = filterChannelMessages(messagesQuery.data?.items ?? [], channel.id);
    return [...raw].reverse();
  }, [messagesQuery.data?.items, channel.id]);

  const newestId = items[items.length - 1]?.id ?? "";
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

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: appearance.animations ? "smooth" : "auto", block: "end" });
  }, [newestId, items.length, appearance.animations]);

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

  const handleSend = (overrideText?: string) => {
    if (!canSend) return;
    sender.handleDispatchSend(overrideText);
    window.setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: qk.myChatChannels() });
    }, 450);
  };

  const clubLogo = logoFailed ? null : resolveMediaUrl(channel.clubLogoUrl);
  const windowSize = dock?.getWindowSize(channel.id) ?? "compact";
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

      <header className="relative z-40 flex items-center justify-between gap-1.5 rounded-t-2xl border-b border-slate-200 bg-white px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative shrink-0">
            {clubLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clubLogo}
                alt={channel.clubName}
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="size-8 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <span data-no-i18n="true" className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-[10.5px] font-extrabold text-primary">
                {channel.clubCode.slice(0, 3).toUpperCase()}
              </span>
            )}
            <span
              title={wsStatus === "connected" ? "Trực tuyến" : "Đang kết nối…"}
              className={cn(
                "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white",
                wsStatus === "connected" ? "bg-primary" : "bg-slate-400",
              )}
            />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="flex items-center gap-1 truncate text-xs font-extrabold text-slate-900">
              <Hash size={11} className="shrink-0 text-primary" />
              <span data-no-i18n="true" className="truncate">{channel.name}</span>
            </p>
            <p data-no-i18n="true" className="truncate text-[10.5px] text-slate-500">
              {channel.clubCode} · {channel.clubName}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {channelMedia.length > 0 && (
            <button
              type="button"
              title="Ảnh & video trong đoạn chat"
              aria-label="Ảnh & video trong đoạn chat"
              onClick={() => setGalleryIndex(channelMedia.length - 1)}
              className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary"
            >
              <Images size={13.5} />
            </button>
          )}
          <FloatingChatAiPopover
            channelId={channel.id}
            canSummarize={canSummarize}
            hasUserMessages={hasUserMessages}
            open={aiOpen}
            onOpenChange={setAiOpen}
          />
          <ChatAppearancePopover
            iconOnly
            config={appearance}
            onUpdate={updateAppearance}
            onReset={resetAppearance}
            floatingSize={windowSize}
            onFloatingSizeChange={(size) => dock?.setWindowSize(size, channel.id)}
          />
          <button
            type="button"
            title="Mở toàn màn hình"
            aria-label="Mở toàn màn hình"
            onClick={() => {
              onClose();
              router.push(`/management?tab=chat&clubId=${encodeURIComponent(channel.clubId)}&channelId=${encodeURIComponent(channel.id)}`);
            }}
            className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary"
          >
            <Maximize2 size={13} />
          </button>
          <button
            type="button"
            title="Thu gọn thành bong bóng"
            aria-label="Thu gọn thành bong bóng"
            onClick={onMinimize}
            className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            title="Đóng khung chat"
            aria-label="Đóng khung chat"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-destructive"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      <ChatPinnedBar
        pinnedMessages={pinnedQuery.data ?? []}
        canPin={canSend}
        onJumpToMessage={jumpToMessage}
        onUnpin={(messageId) => {
          const target = (pinnedQuery.data ?? []).find((p) => p.id === messageId);
          if (target) actions.togglePinMessage(target, true);
        }}
      />

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
        <div data-chat-scroll="true" className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2.5 py-2.5">
          {messagesQuery.isPending && !items.length ? (
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
                  appearance={appearance}
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

      <FloatingChatComposer
        canSend={canSend}
        canSummarize={canSummarize}
        fontSize={appearance.fontSize}
        content={sender.content}
        onContentChange={sender.setContent}
        replyTo={sender.replyTo}
        onClearReply={() => sender.setReplyTo(null)}
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
