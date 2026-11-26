"use client";

import { useState } from "react";
import {
  AlertCircle, Bot, Check, CheckCheck, Clock, Download, Eye, FileText,
  Loader2, MoreHorizontal, Pin, Reply, RotateCcw, X,
} from "lucide-react";
import type { ChatMessage } from "@/lib/api";
import type { PreviewTarget } from "@/components/document/DocumentPreviewModal";
import { resolveChatMessageStatusMeta } from "@/forms/chat/chat-status-meta";
import { getChatJumbomojiCount } from "@/forms/chat/chat-emojis";
import {
  CHAT_FONT_SIZE_CLASS,
  DEFAULT_CHAT_APPEARANCE,
  chatBubbleRadiusClass,
  type ChatAppearanceConfig,
} from "@/forms/chat/chat-appearance";
import { formatChatTimeCompact } from "@/lib/chat-message-cache";
import { ChatMediaCollage } from "@/components/management/ChatMediaCollage";
import { ChatInlineEditBox, ChatMessageContextMenu, type ContextMenuAnchor } from "@/components/management/ChatMessageContextMenu";
import { ChatReactionPills, ChatReactionTrigger } from "@/components/management/ChatMessageReactions";
import { UserAvatar } from "@/components/user/UserAvatar";
import { cn, formatDateTime, formatSize } from "@/lib/utils";

function DeliveryStatusIcon({
  status,
  onSolid = false,
}: {
  status: ReturnType<typeof resolveChatMessageStatusMeta>["status"];
  onSolid?: boolean;
}) {
  if (status === "uploading") return <Loader2 size={11} className={cn("shrink-0 animate-spin", onSolid ? "text-primary-foreground" : "text-primary")} />;
  if (status === "sending") return <Clock size={10.5} className="shrink-0 opacity-75" />;
  if (status === "seen") return <CheckCheck size={12.5} className={cn("shrink-0", onSolid ? "text-primary-foreground" : "text-primary")} />;
  if (status === "delivered") return <CheckCheck size={12.5} className="shrink-0 opacity-85" />;
  if (status === "sent") return <Check size={11.5} className="shrink-0 opacity-80" />;
  return <AlertCircle size={11} className="shrink-0 text-destructive" />;
}

export function ChatMessageBubble({
  message: m, currentUserId, isLatestOwn = false, groupedPrev, groupedNext, highlighted,
  appearance = DEFAULT_CHAT_APPEARANCE, canSend, canModerate = false,
  onReply, onTogglePin, onToggleReaction, onEditMessage, onDeleteMessage,
  onJumpToMessage, onRetryMessage, onDismissFailed, onPreviewDoc, onDownloadDoc, onNotice, onError,
}: {
  message: ChatMessage; currentUserId?: string; isLatestOwn?: boolean;
  groupedPrev: boolean; groupedNext: boolean; highlighted?: boolean;
  appearance?: ChatAppearanceConfig; canSend: boolean; canModerate?: boolean;
  onReply: (msg: ChatMessage) => void; onTogglePin: (msg: ChatMessage) => void;
  onToggleReaction: (msg: ChatMessage, emoji: string) => void;
  onEditMessage: (msg: ChatMessage, nextContent: string) => Promise<void> | void;
  onDeleteMessage: (msg: ChatMessage) => Promise<void> | void;
  onJumpToMessage: (messageId: string) => void; onRetryMessage: (clientTempId: string) => void;
  onDismissFailed: (channelId: string, clientTempId: string) => void;
  onPreviewDoc: (target: PreviewTarget) => void; onDownloadDoc: (id: string, name: string) => void;
  onNotice?: (msg: string) => void; onError: (msg: string) => void;
}) {
  const [menuAnchor, setMenuAnchor] = useState<ContextMenuAnchor | null>(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(m.content ?? "");

  const isBot = m.senderType === "AI_BOT";
  const isMine = !isBot && Boolean(currentUserId) && m.senderId === currentUserId;
  const statusMeta = isMine ? resolveChatMessageStatusMeta(m) : null;
  const isFailed = statusMeta?.status === "failed";
  const isPending = statusMeta?.status === "uploading" || statusMeta?.status === "sending";
  const showSender = !isMine && !groupedPrev;
  const showTime = !isFailed && !editing;
  const showExplicitReceiptFooter = Boolean(isMine && statusMeta && !isFailed && (isLatestOwn || isPending));
  const attachments = m.attachments ?? [];
  const reactions = m.reactions ?? [];
  const myEmojis = new Set(
    currentUserId ? reactions.filter((r) => r.reactorIds?.includes(currentUserId)).map((r) => r.emoji) : []
  );
  const mediaCount = attachments.filter((a) => a.mediaKind === "IMAGE" || a.mediaKind === "VIDEO").length;
  const hasText = Boolean(m.content?.trim());
  const isBareMedia = mediaCount > 0 && mediaCount === attachments.length && !hasText && !m.replyToId && !m.documentId;
  const jumbomojiCount = getChatJumbomojiCount(
    m.content ?? "",
    attachments.length > 0 || Boolean(m.documentId) || Boolean(m.replyToId)
  );
  const isJumboOnly = jumbomojiCount > 0;
  const isSolidMine = isMine && appearance.bubbleStyle === "solid" && !isFailed && !isBareMedia && !isJumboOnly;
  const isInlineTextStamp = hasText && !m.documentId && !isJumboOnly && !editing && showTime;
  const showTail = !groupedNext && !isBareMedia && !isJumboOnly && !isFailed;
  const senderLabel = isBot ? "Trợ lý AI CLB" : m.senderFullName || "Thành viên";
  const canInteract = !m.optimistic && !isFailed && (canSend || canModerate);
  const canDelete = !m.optimistic && !isFailed && ((isMine && canSend) || canModerate);

  const openBubbleMenu = (x: number, y: number) => {
    if (canInteract && !editing) setMenuAnchor({ x, y });
  };

  const submitEdit = () => {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    setEditing(false);
    if (trimmed !== m.content.trim()) void onEditMessage(m, trimmed);
  };

  const bubbleToneClass = isFailed
    ? "border-destructive/45 bg-destructive/[0.06] text-foreground"
    : isMine
      ? appearance.bubbleStyle === "solid"
        ? cn("border-primary bg-primary text-primary-foreground shadow-xs", isPending && "opacity-85")
        : appearance.bubbleStyle === "minimal"
          ? cn("border-border/80 bg-muted/90 text-foreground", isPending && "opacity-85")
          : cn("border-primary/20 bg-primary/[0.10] text-foreground", isPending && "opacity-85")
      : isBot
        ? "border-primary/25 bg-card text-foreground shadow-2xs ring-1 ring-primary/10"
        : "border-border/70 bg-card text-foreground shadow-2xs";

  const tailFillClass = isMine
    ? appearance.bubbleStyle === "solid"
      ? "text-primary"
      : appearance.bubbleStyle === "minimal"
        ? "text-muted/90"
        : "text-primary/[0.10]"
    : "text-card";

  const timestampPill = (
    <span
      title={statusMeta ? statusMeta.tooltip : formatDateTime(m.createdAt)}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap text-[10px] leading-none select-none",
        isInlineTextStamp && "float-right mt-[4px] ml-2.5",
        !isInlineTextStamp && "mt-1",
        isBareMedia
          ? "w-fit rounded-full bg-black/55 px-2 py-0.5 text-white"
          : isSolidMine
            ? "text-primary-foreground/80"
            : "text-muted-foreground"
      )}
    >
      {m.editedAt && <span>đã sửa</span>}
      <span>{formatChatTimeCompact(m.createdAt)}</span>
      {statusMeta && <DeliveryStatusIcon status={statusMeta.status} onSolid={isBareMedia || isSolidMine} />}
    </span>
  );

  return (
    <div
      id={`chat-msg-${m.id}`}
      data-delivery-status={statusMeta?.status}
      className={cn(
        "group flex w-full max-w-[min(580px,86%)] items-end gap-2 rounded-xl transition-colors first:mt-0",
        groupedPrev ? (appearance.density === "compact" ? "mt-[2px]" : "mt-1") : (appearance.density === "compact" ? "mt-2.5" : "mt-3.5"),
        appearance.animations && (isMine ? "tg-msg-in-mine" : "tg-msg-in-other"),
        isMine && "ml-auto flex-row-reverse",
        highlighted && "bg-primary/[0.08] ring-2 ring-primary/35"
      )}
    >
      {!isMine && (
        <div className="w-7 shrink-0 self-end pb-0.5">
          {!groupedNext && (
            isBot ? (
              <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[10.5px] font-bold text-primary-foreground shadow-2xs">
                <Bot size={14} />
              </div>
            ) : (
              <UserAvatar avatarUrl={m.senderAvatarUrl} name={senderLabel} size="chat" rounded="full" />
            )
          )}
        </div>
      )}

      <div className={cn("flex min-w-0 max-w-full flex-col", isMine ? "items-end" : "items-start")}>
        {(showSender || m.pinned) && (
          <div className={cn("mb-0.5 flex items-center gap-1.5 px-1.5 text-[10.5px]", isMine && "flex-row-reverse")}>
            {showSender && <span className="font-bold text-primary/90">{senderLabel}</span>}
            {m.pinned && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary">
                <Pin size={9.5} className="rotate-45" /> Đã ghim
              </span>
            )}
          </div>
        )}

        <div className={cn("flex max-w-full items-center gap-1", isMine && "flex-row-reverse")}>
          <div
            onContextMenu={(e) => {
              if (!canInteract || editing) return;
              e.preventDefault();
              openBubbleMenu(e.clientX, e.clientY);
            }}
            onClick={(e) => {
              if (!canInteract || editing) return;
              if ((e.target as HTMLElement).closest("button, a, input, textarea, video")) return;
              if (typeof window !== "undefined" && (window.getSelection()?.toString() ?? "").length > 0) return;
              openBubbleMenu(e.clientX, e.clientY);
            }}
            className={cn(
              "relative max-w-full transition-shadow duration-150",
              CHAT_FONT_SIZE_CLASS[appearance.fontSize],
              canInteract && !editing && "cursor-pointer",
              isBareMedia || isJumboOnly
                ? "p-0"
                : cn(
                    "w-fit border",
                    appearance.density === "compact" ? "px-3 py-1.5" : "px-3.5 py-2",
                    chatBubbleRadiusClass(isMine, groupedPrev, groupedNext),
                    bubbleToneClass
                  )
            )}
          >
            {showTail && (
              <svg
                aria-hidden="true"
                viewBox="0 0 8 12"
                className={cn(
                  "pointer-events-none absolute bottom-0 h-3 w-2 fill-current",
                  tailFillClass,
                  isMine ? "-right-[5px]" : "-left-[5px] -scale-x-100"
                )}
              >
                <path d="M0 0 C0 6 3 10 8 12 L0 12 Z" />
              </svg>
            )}

            {m.replyToId && (
              <button
                type="button"
                onClick={() => onJumpToMessage(m.replyToId!)}
                className={cn(
                  "mb-1.5 flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[11px] transition-colors",
                  isSolidMine ? "bg-white/15 text-primary-foreground hover:bg-white/20" : "bg-background/80 hover:bg-background"
                )}
              >
                <span className={cn("h-3.5 w-0.5 shrink-0 rounded-full", isSolidMine ? "bg-primary-foreground" : "bg-primary")} />
                <span className={cn("shrink-0 font-semibold", isSolidMine ? "text-primary-foreground" : "text-foreground")}>{m.replyToSenderName || "Tin nhắn"}:</span>
                <span className={cn("truncate", isSolidMine ? "text-primary-foreground/80" : "text-muted-foreground")}>{m.replyToPreview || "…"}</span>
              </button>
            )}

            {attachments.length > 0 && (
              <ChatMediaCollage attachments={attachments} flushTop={isBareMedia || !m.replyToId} onError={onError} />
            )}

            {editing ? (
              <ChatInlineEditBox value={editDraft} onChange={setEditDraft} onCancel={() => setEditing(false)} onSave={submitEdit} />
            ) : (
              hasText && (
                <div
                  className={cn(
                    "whitespace-pre-line break-words",
                    attachments.length > 0 && "mt-1.5",
                    jumbomojiCount === 1 && "py-0.5 text-[40px] leading-none",
                    jumbomojiCount === 2 && "py-0.5 text-[30px] leading-tight",
                    jumbomojiCount === 3 && "py-0.5 text-[24px] leading-tight"
                  )}
                >
                  <span>{m.content}</span>
                  {isInlineTextStamp && timestampPill}
                </div>
              )
            )}

            {m.documentId && (
              <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2 py-1 text-xs", isSolidMine ? "border-white/25 bg-white/15 text-primary-foreground" : "border-primary/20 bg-background/85", hasText && "mt-1.5")}>
                <div className="flex min-w-0 items-center gap-1.5">
                  <FileText size={13} className={cn("shrink-0", isSolidMine ? "text-primary-foreground" : "text-primary")} />
                  <span className="max-w-[190px] truncate font-semibold">{m.documentName || "Tài liệu CLB"}</span>
                  {typeof m.documentSizeBytes === "number" && (
                    <span className={cn("shrink-0 font-mono text-[10px]", isSolidMine ? "text-primary-foreground/80" : "text-muted-foreground")}>{formatSize(m.documentSizeBytes)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {m.documentPreviewable !== false && (
                    <button type="button" onClick={() => onPreviewDoc({ id: m.documentId!, name: m.documentName || "Tài liệu", contentType: m.documentContentType })} className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[10.5px] font-semibold text-foreground hover:bg-muted">
                      <Eye size={11} /> Xem
                    </button>
                  )}
                  <button type="button" onClick={() => onDownloadDoc(m.documentId!, m.documentName || "document")} className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[10.5px] font-semibold text-foreground hover:bg-muted">
                    <Download size={11} /> Tải
                  </button>
                </div>
              </div>
            )}

            {showTime && !isInlineTextStamp && (
              <div className={cn("flex", isMine && "justify-end")}>{timestampPill}</div>
            )}
          </div>

          {canInteract && !editing && (
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-all duration-150 focus-within:opacity-100 group-hover:opacity-100">
              {canSend && (
                <>
                  <ChatReactionTrigger isMine={isMine} myEmojis={myEmojis} onToggleReaction={(emoji) => onToggleReaction(m, emoji)} />
                  <button
                    type="button"
                    title="Trả lời"
                    aria-label={`Trả lời ${senderLabel}`}
                    onClick={() => onReply(m)}
                    className="grid h-6 w-6 place-items-center rounded-full bg-card/85 text-muted-foreground shadow-2xs transition-transform hover:scale-110 hover:bg-card hover:text-foreground"
                  >
                    <Reply size={12} />
                  </button>
                </>
              )}
              <button
                type="button"
                title="Tuỳ chọn tin nhắn"
                aria-label="Tuỳ chọn tin nhắn"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  openBubbleMenu(rect.left, rect.bottom + 4);
                }}
                className="grid h-6 w-6 place-items-center rounded-full bg-card/85 text-muted-foreground shadow-2xs transition-transform hover:scale-110 hover:bg-card hover:text-foreground"
              >
                <MoreHorizontal size={13} />
              </button>
            </div>
          )}
        </div>

        <ChatReactionPills
          reactions={reactions}
          currentUserId={currentUserId}
          isMine={isMine}
          canReact={canSend && !m.optimistic && !isFailed}
          onToggleReaction={(emoji) => onToggleReaction(m, emoji)}
        />

        {showExplicitReceiptFooter && statusMeta && (
          <div title={statusMeta.tooltip} className={cn("mt-0.5 flex items-center gap-1 px-1.5 text-[10.5px] font-medium", statusMeta.status === "seen" ? "text-primary" : "text-muted-foreground")}>
            <DeliveryStatusIcon status={statusMeta.status} />
            <span>{statusMeta.detailLabel}</span>
          </div>
        )}

        {isFailed && (
          <div role="alert" title={statusMeta?.tooltip} className="mt-1 flex flex-wrap items-center justify-end gap-1.5 px-1 text-[10.5px] text-destructive">
            <span className="inline-flex items-center gap-1 font-semibold">
              <AlertCircle size={11} />
              <span className="max-w-[260px] truncate">{statusMeta?.detailLabel || "Gửi lỗi"}</span>
            </span>
            {m.clientTempId && (
              <>
                <button type="button" onClick={() => onRetryMessage(m.clientTempId!)} className="inline-flex items-center gap-0.5 rounded bg-destructive/10 px-1.5 py-0.5 font-semibold text-destructive hover:bg-destructive/15">
                  <RotateCcw size={10} /> Thử lại
                </button>
                <button type="button" onClick={() => onDismissFailed(m.channelId, m.clientTempId!)} aria-label="Xóa tin lỗi" className="inline-flex items-center text-muted-foreground hover:text-foreground">
                  <X size={11} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <ChatMessageContextMenu
        anchor={menuAnchor}
        message={m}
        isMine={isMine}
        canSend={canSend}
        canDelete={canDelete}
        myEmojis={myEmojis}
        onClose={() => setMenuAnchor(null)}
        onToggleReaction={(emoji) => onToggleReaction(m, emoji)}
        onReply={() => onReply(m)}
        onStartEdit={isMine && m.senderType === "USER" ? () => { setEditDraft(m.content ?? ""); setEditing(true); } : undefined}
        onTogglePin={() => onTogglePin(m)}
        onCopyText={hasText ? () => { void navigator.clipboard?.writeText(m.content).then(() => onNotice?.("Đã sao chép tin nhắn.")); } : undefined}
        onDelete={() => void onDeleteMessage(m)}
      />
    </div>
  );
}
