"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bot, ChevronDown, ChevronsDown, Clock, Sparkles, Upload, WifiOff } from "lucide-react";
import type { AiSummary, ChatChannel, ChatMessage, ChatQuickReply, DocumentItem, StagedChatMedia } from "@/lib/api";
import type { WsConnectionStatus } from "@/hooks/chat/useChatRealtime";
import type { PreviewTarget } from "@/components/document/DocumentPreviewModal";
import { areMessagesInSameDisplayGroup } from "@/lib/chat-message-cache";
import { ChatComposerBar } from "@/components/management/ChatComposerBar";
import { ChatMessageBubble } from "@/components/management/ChatMessageBubble";
import { ChatPinnedBar } from "@/components/management/ChatPinnedBar";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  CLUB_GENERAL: "Kênh chung CLB",
  DEPARTMENT: "Kênh theo Ban",
  EVENT_THREAD: "Thảo luận Sự kiện",
};

const WS_DOT: Record<WsConnectionStatus, { label: string; dot: string }> = {
  connected: { label: "Trực tuyến", dot: "bg-emerald-500" },
  connecting: { label: "Đang kết nối…", dot: "bg-amber-500 animate-pulse" },
  disconnected: { label: "Ngoại tuyến", dot: "bg-slate-400" },
};

export type ChatMessagePaneProps = {
  clubId: string;
  activeChannel?: ChatChannel;
  currentUserId?: string;
  wsStatus: WsConnectionStatus;
  wsError?: string;
  canSend: boolean;
  canSummarize: boolean;
  canManageQuickReplies: boolean;
  quickReplies: ChatQuickReply[];
  quickRepliesLoading: boolean;
  summarizePending: boolean;
  onSummarize: () => void;
  latestSummary?: AiSummary;
  pinnedMessages: ChatMessage[];
  onTogglePin: (msg: ChatMessage) => void;
  onUnpinById: (messageId: string) => void;
  messagesPending: boolean;
  messagesError: unknown;
  onRetryMessages: () => void;
  orderedMessages: ChatMessage[];
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  typingUsers: string[];
  replyTo: ChatMessage | null;
  onReply: (msg: ChatMessage) => void;
  onClearReply: () => void;
  attachedDoc: DocumentItem | null;
  onOpenDocPicker: () => void;
  onClearAttachedDoc: () => void;
  stagedMedia: StagedChatMedia[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveStagedMedia: (localId: string) => void;
  onClearStagedMedia: () => void;
  content: string;
  onContentChange: (value: string) => void;
  sendPending: boolean;
  onSend: (overrideText?: string) => void;
  onRetryMessage: (clientTempId: string) => void;
  onDismissFailed: (channelId: string, clientTempId: string) => void;
  onPreviewDoc: (target: PreviewTarget) => void;
  onDownloadDoc: (id: string, name: string) => void;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
};

export function ChatMessagePane(props: ChatMessagePaneProps) {
  const {
    clubId, activeChannel, currentUserId, wsStatus, wsError, canSend, canSummarize,
    canManageQuickReplies, quickReplies, quickRepliesLoading, summarizePending,
    onSummarize, latestSummary, pinnedMessages, onTogglePin, onUnpinById,
    messagesPending, messagesError, onRetryMessages, orderedMessages,
    hasOlder, loadingOlder, onLoadOlder, typingUsers, replyTo, onReply, onClearReply, attachedDoc,
    onOpenDocPicker, onClearAttachedDoc, stagedMedia, onAddFiles, onRemoveStagedMedia,
    onClearStagedMedia, content, onContentChange, sendPending, onSend,
    onRetryMessage, onDismissFailed, onPreviewDoc, onDownloadDoc, onNotice, onError,
  } = props;

  const channelKey = activeChannel?.id ?? "none";
  const wsMeta = WS_DOT[wsStatus];
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const didInitialPinRef = useRef("");
  const prependHeightRef = useRef<number | null>(null);
  const prevNewestRef = useRef<{ ch: string; id: string }>({ ch: "", id: "" });
  const highlightTimerRef = useRef<number | null>(null);

  const [unreadChannelId, setUnreadChannelId] = useState("");
  const [jumpChannelId, setJumpChannelId] = useState("");
  const [summaryChannelId, setSummaryChannelId] = useState("");
  const [highlightedId, setHighlightedId] = useState("");
  const [draggingOver, setDraggingOver] = useState(false);

  const hasUnreadBelow = unreadChannelId === channelKey;
  const showJumpBtn = jumpChannelId === channelKey;
  const summaryOpen = summaryChannelId === channelKey && Boolean(latestSummary);
  const newestMsg = orderedMessages.at(-1);
  const newestId = newestMsg?.id ?? "";

  useEffect(() => {
    if (!summaryOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!summaryRef.current?.contains(e.target as Node)) setSummaryChannelId("");
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [summaryOpen]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || channelKey === "none") return;

    if (prependHeightRef.current !== null && !loadingOlder) {
      el.scrollTop = Math.max(0, el.scrollHeight - prependHeightRef.current);
      prependHeightRef.current = null;
      return;
    }

    if (didInitialPinRef.current !== channelKey) {
      if (orderedMessages.length > 0 || !messagesPending) {
        el.scrollTop = el.scrollHeight;
        isNearBottomRef.current = true;
        didInitialPinRef.current = channelKey;
        prevNewestRef.current = { ch: channelKey, id: newestId };
      }
      return;
    }

    if (newestId && (prevNewestRef.current.ch !== channelKey || prevNewestRef.current.id !== newestId)) {
      const prevWasSameChannel = prevNewestRef.current.ch === channelKey && Boolean(prevNewestRef.current.id);
      prevNewestRef.current = { ch: channelKey, id: newestId };
      if (!prevWasSameChannel || isNearBottomRef.current || newestMsg?.senderId === currentUserId) {
        el.scrollTop = el.scrollHeight;
        isNearBottomRef.current = true;
        queueMicrotask(() => {
          setUnreadChannelId("");
          setJumpChannelId("");
        });
      } else {
        queueMicrotask(() => setUnreadChannelId(channelKey));
      }
    }
  }, [channelKey, currentUserId, loadingOlder, messagesPending, newestId, newestMsg?.senderId, orderedMessages.length]);

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    isNearBottomRef.current = true;
    setUnreadChannelId("");
    setJumpChannelId("");
  };

  const jumpToMessage = (messageId: string) => {
    const target = document.getElementById(`chat-msg-${messageId}`);
    if (!target) {
      onNotice("Tin nhắn nằm ở lịch sử cũ hơn — nhấn 'Tải tin nhắn cũ hơn' để xem.");
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedId(messageId);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightedId(""), 1800);
  };

  return (
    <section
      onDragOver={(e) => {
        if (!canSend || !e.dataTransfer?.types?.includes("Files")) return;
        e.preventDefault();
        setDraggingOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDraggingOver(false);
      }}
      onDrop={(e) => {
        if (!canSend) return;
        e.preventDefault();
        setDraggingOver(false);
        if (e.dataTransfer?.files?.length) onAddFiles(e.dataTransfer.files);
      }}
      className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card"
    >
      {draggingOver && canSend && (
        <div className="pointer-events-none absolute inset-2 z-40 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-primary/10 text-primary backdrop-blur-[2px]">
          <Upload size={22} />
          <p className="text-xs font-bold">Thả ảnh, video hoặc tệp tin vào đây để gửi</p>
        </div>
      )}

      <header className="relative z-35 flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-bold text-foreground"># {activeChannel?.name}</h3>
          <span
            role="status"
            aria-live="polite"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground"
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", wsMeta.dot)} />
            {wsMeta.label}
          </span>
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">
            · {activeChannel ? CHANNEL_TYPE_LABELS[activeChannel.channelType] ?? activeChannel.channelType : ""}
            {activeChannel?.departmentName ? ` (${activeChannel.departmentName})` : ""}
          </span>
        </div>

        <div ref={summaryRef} className="relative flex shrink-0 items-center gap-1.5">
          {latestSummary && (
            <button
              type="button"
              onClick={() => setSummaryChannelId(summaryOpen ? "" : channelKey)}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors",
                summaryOpen
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Bot size={12} className="text-primary" />
              <span className="hidden sm:inline">Tóm tắt</span>
              <ChevronDown size={11} className={cn("transition-transform", summaryOpen && "rotate-180")} />
            </button>
          )}
          {canSummarize && (
            <Button
              size="sm"
              variant="outline"
              disabled={summarizePending || !orderedMessages.some((m) => m.senderType === "USER")}
              onClick={onSummarize}
              className="h-7 px-2.5 text-[11px]"
            >
              <Sparkles size={12} /> {summarizePending ? "Đang tóm tắt…" : "Tóm tắt AI"}
            </Button>
          )}

          {latestSummary && summaryOpen && (
            <div className="absolute top-full right-0 z-50 mt-1.5 max-h-64 w-[min(420px,calc(100vw-32px))] overflow-y-auto rounded-xl border border-border bg-card p-3 text-xs shadow-xl">
              <div className="flex items-center justify-between gap-2 font-semibold text-primary">
                <span className="inline-flex items-center gap-1.5">
                  <Bot size={13} /> Tóm tắt AI ({formatDateTime(latestSummary.createdAt)})
                </span>
                <button type="button" onClick={() => setSummaryChannelId("")} className="text-[11px] text-muted-foreground hover:text-foreground">
                  Đóng
                </button>
              </div>
              <p className="mt-1.5 whitespace-pre-line leading-relaxed text-foreground">{latestSummary.summary}</p>
            </div>
          )}
        </div>
      </header>

      <ChatPinnedBar pinnedMessages={pinnedMessages} canPin={canSend} onJumpToMessage={jumpToMessage} onUnpin={onUnpinById} />

      {(wsError || wsStatus === "disconnected") && (
        <div
          role="status"
          aria-live="polite"
          className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50/90 px-3.5 py-1 text-[11px] text-amber-900"
        >
          <WifiOff size={12} className="shrink-0" />
          <span className="truncate">{wsError || "Kết nối trực tuyến đang tự động kết nối lại…"}</span>
        </div>
      )}

      <div
        key={channelKey}
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Tin nhắn trong kênh"
        onScroll={(e) => {
          const el = e.currentTarget;
          const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
          const near = dist < 96;
          isNearBottomRef.current = near;
          setJumpChannelId(dist > 180 ? channelKey : "");
          if (near && hasUnreadBelow) setUnreadChannelId("");
        }}
        className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-muted/[0.14] px-3.5 py-2.5 [overflow-anchor:none]"
      >
        {hasOlder && !messagesPending && (
          <div className="mb-2 flex justify-center">
            <button
              type="button"
              disabled={loadingOlder}
              onClick={() => {
                prependHeightRef.current = scrollRef.current?.scrollHeight ?? null;
                onLoadOlder();
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-2xs hover:text-foreground disabled:opacity-60"
            >
              <Clock size={12} /> {loadingOlder ? "Đang tải tin cũ…" : "Tải tin nhắn cũ hơn"}
            </button>
          </div>
        )}

        {messagesPending && !orderedMessages.length ? (
          <LoadingRows rows={3} />
        ) : messagesError && !orderedMessages.length ? (
          <ErrorState message={describeError(messagesError)} onRetry={onRetryMessages} />
        ) : !orderedMessages.length ? (
          <div className="flex h-full min-h-[220px] items-center justify-center text-xs text-muted-foreground">
            Chưa có tin nhắn. Hãy gửi lời chào đầu tiên tới kênh!
          </div>
        ) : (
          (() => {
            const latestOwnId = currentUserId
              ? [...orderedMessages]
                  .reverse()
                  .find((item) => item.senderType !== "AI_BOT" && item.senderId === currentUserId)?.id
              : undefined;
            return orderedMessages.map((m, idx) => (
              <ChatMessageBubble
                key={m.id}
                message={m}
                currentUserId={currentUserId}
                isLatestOwn={Boolean(latestOwnId && m.id === latestOwnId)}
                groupedPrev={areMessagesInSameDisplayGroup(orderedMessages[idx - 1], m)}
                groupedNext={areMessagesInSameDisplayGroup(m, orderedMessages[idx + 1])}
                highlighted={highlightedId === m.id}
                canSend={canSend}
                onReply={onReply}
                onTogglePin={onTogglePin}
                onJumpToMessage={jumpToMessage}
                onRetryMessage={onRetryMessage}
                onDismissFailed={onDismissFailed}
                onPreviewDoc={onPreviewDoc}
                onDownloadDoc={onDownloadDoc}
                onError={onError}
              />
            ));
          })()
        )}
      </div>

      {(hasUnreadBelow || showJumpBtn) && (
        <button
          type="button"
          onClick={jumpToBottom}
          title="Xuống tin nhắn mới nhất"
          aria-label="Xuống tin nhắn mới nhất"
          className="absolute right-4 bottom-14 z-20 grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition hover:bg-muted hover:text-foreground"
        >
          <ChevronsDown size={16} />
          {hasUnreadBelow && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
          )}
        </button>
      )}

      {typingUsers.length > 0 && (
        <div role="status" aria-live="polite" className="shrink-0 border-t border-border/40 bg-muted/20 px-3.5 py-0.5 text-[11px] italic text-muted-foreground">
          {typingUsers.join(", ")} đang soạn tin…
        </div>
      )}

      {canSend && (
        <ChatComposerBar
          clubId={clubId}
          channelName={activeChannel?.name}
          currentUserId={currentUserId}
          canManageQuickReplies={canManageQuickReplies}
          quickReplies={quickReplies}
          quickRepliesLoading={quickRepliesLoading}
          replyTo={replyTo}
          onClearReply={onClearReply}
          attachedDoc={attachedDoc}
          onOpenDocPicker={() => onOpenDocPicker()}
          onClearAttachedDoc={onClearAttachedDoc}
          stagedMedia={stagedMedia}
          onAddFiles={onAddFiles}
          onRemoveStagedMedia={onRemoveStagedMedia}
          onClearStagedMedia={onClearStagedMedia}
          content={content}
          onContentChange={onContentChange}
          sendPending={sendPending}
          onSend={onSend}
          onNotice={onNotice}
          onError={onError}
        />
      )}
    </section>
  );
}
