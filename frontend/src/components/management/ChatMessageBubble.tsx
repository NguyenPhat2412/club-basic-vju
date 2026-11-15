"use client";

import { AlertCircle, Bot, Download, Eye, FileText, Pin, PinOff, Reply, RotateCcw, X } from "lucide-react";
import type { ChatMessage } from "@/lib/api";
import type { PreviewTarget } from "@/components/document/DocumentPreviewModal";
import { formatChatTimeCompact } from "@/lib/chat-message-cache";
import { ChatMediaCollage } from "@/components/management/ChatMediaCollage";
import { cn, formatDateTime, formatSize } from "@/lib/utils";

function senderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "TV";
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : `${parts[0][0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}

export function ChatMessageBubble({
  message: m,
  currentUserId,
  groupedPrev,
  groupedNext,
  highlighted,
  canSend,
  onReply,
  onTogglePin,
  onJumpToMessage,
  onRetryMessage,
  onDismissFailed,
  onPreviewDoc,
  onDownloadDoc,
  onError,
}: {
  message: ChatMessage;
  currentUserId?: string;
  groupedPrev: boolean;
  groupedNext: boolean;
  highlighted?: boolean;
  canSend: boolean;
  onReply: (msg: ChatMessage) => void;
  onTogglePin: (msg: ChatMessage) => void;
  onJumpToMessage: (messageId: string) => void;
  onRetryMessage: (clientTempId: string) => void;
  onDismissFailed: (channelId: string, clientTempId: string) => void;
  onPreviewDoc: (target: PreviewTarget) => void;
  onDownloadDoc: (id: string, name: string) => void;
  onError: (msg: string) => void;
}) {
  const isBot = m.senderType === "AI_BOT";
  const isMine = !isBot && Boolean(currentUserId) && m.senderId === currentUserId;
  const isFailed = m.deliveryStatus === "failed";
  const showSender = !isMine && !groupedPrev;
  const showTime = !groupedNext || Boolean(m.optimistic);
  const attachments = m.attachments ?? [];
  const mediaCount = attachments.filter((a) => a.mediaKind === "IMAGE" || a.mediaKind === "VIDEO").length;
  const hasText = Boolean(m.content?.trim());
  const isBareMedia =
    mediaCount > 0 && mediaCount === attachments.length && !hasText && !m.replyToId && !m.documentId;
  const senderLabel = isBot ? "Trợ lý AI CLB" : m.senderFullName || "Thành viên";

  return (
    <div
      id={`chat-msg-${m.id}`}
      className={cn(
        "group flex w-full max-w-[min(560px,86%)] items-end gap-2 rounded-xl transition-colors first:mt-0",
        groupedPrev ? "mt-0.5" : "mt-2.5",
        isMine && "ml-auto flex-row-reverse",
        highlighted && "bg-primary/[0.08] ring-2 ring-primary/35"
      )}
    >
      {!isMine && (
        <div className="w-7 shrink-0 self-start">
          {!groupedPrev && (
            <div
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full text-[10.5px] font-bold shadow-2xs",
                isBot ? "bg-primary text-primary-foreground" : "bg-primary/12 text-primary"
              )}
            >
              {isBot ? <Bot size={14} /> : senderInitials(senderLabel)}
            </div>
          )}
        </div>
      )}

      <div className={cn("flex min-w-0 max-w-full flex-col", isMine ? "items-end" : "items-start")}>
        {(showSender || m.pinned) && (
          <div className={cn("mb-0.5 flex items-center gap-1.5 px-1 text-[10.5px]", isMine && "flex-row-reverse")}>
            {showSender && <span className="font-semibold text-muted-foreground">{senderLabel}</span>}
            {m.pinned && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary">
                <Pin size={9.5} className="rotate-45" /> Đã ghim
              </span>
            )}
          </div>
        )}

        <div className={cn("flex max-w-full items-center gap-1", isMine && "flex-row-reverse")}>
          <div
            className={cn(
              "relative max-w-full text-[13px] leading-snug",
              isBareMedia
                ? "p-0"
                : cn(
                    "w-fit rounded-2xl border px-3 py-1.5",
                    isFailed
                      ? "border-destructive/40 bg-destructive/[0.05] text-foreground"
                      : isMine
                        ? "border-primary/20 bg-primary/[0.09] text-foreground"
                        : isBot
                          ? "border-primary/25 bg-primary/[0.05] text-foreground"
                          : "border-border/60 bg-card text-foreground shadow-2xs"
                  )
            )}
          >
            {m.replyToId && (
              <button
                type="button"
                onClick={() => onJumpToMessage(m.replyToId!)}
                className="mb-1 flex max-w-full items-center gap-1.5 rounded-lg bg-background/75 px-2 py-0.5 text-left text-[11px] transition-colors hover:bg-background"
              >
                <span className="h-3.5 w-0.5 shrink-0 rounded-full bg-primary" />
                <span className="shrink-0 font-semibold text-foreground">
                  {m.replyToSenderName || "Tin nhắn"}:
                </span>
                <span className="truncate text-muted-foreground">{m.replyToPreview || "…"}</span>
              </button>
            )}

            {attachments.length > 0 && (
              <ChatMediaCollage attachments={attachments} flushTop={isBareMedia || !m.replyToId} onError={onError} />
            )}

            {hasText && (
              <p className={cn("whitespace-pre-line break-words", attachments.length > 0 && "mt-1.5")}>
                {m.content}
              </p>
            )}

            {m.documentId && (
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-background/85 px-2 py-1 text-xs",
                  hasText && "mt-1.5"
                )}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <FileText size={13} className="shrink-0 text-primary" />
                  <span className="max-w-[190px] truncate font-semibold text-foreground">
                    {m.documentName || "Tài liệu CLB"}
                  </span>
                  {typeof m.documentSizeBytes === "number" && (
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {formatSize(m.documentSizeBytes)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {m.documentPreviewable !== false && (
                    <button
                      type="button"
                      onClick={() =>
                        onPreviewDoc({
                          id: m.documentId!,
                          name: m.documentName || "Tài liệu",
                          contentType: m.documentContentType,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[10.5px] font-semibold hover:bg-muted"
                    >
                      <Eye size={11} /> Xem
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDownloadDoc(m.documentId!, m.documentId ? m.documentName || "document" : "document")}
                    className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[10.5px] font-semibold hover:bg-muted"
                  >
                    <Download size={11} /> Tải
                  </button>
                </div>
              </div>
            )}

            {showTime && !isFailed && (
              <div
                title={formatDateTime(m.createdAt)}
                className={cn(
                  "mt-0.5 flex items-center gap-1 whitespace-nowrap text-[10px] leading-none text-muted-foreground",
                  isMine && "justify-end",
                  isBareMedia && "w-fit rounded-full bg-black/50 px-2 py-0.5 text-white",
                  isBareMedia && isMine && "ml-auto"
                )}
              >
                {m.optimistic ? "Đang gửi…" : formatChatTimeCompact(m.createdAt)}
              </div>
            )}
          </div>

          {canSend && !m.optimistic && (
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <button
                type="button"
                title="Trả lời"
                aria-label={`Trả lời ${senderLabel}`}
                onClick={() => onReply(m)}
                className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Reply size={12} />
              </button>
              <button
                type="button"
                title={m.pinned ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}
                aria-label={m.pinned ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}
                onClick={() => onTogglePin(m)}
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full transition-colors hover:bg-muted",
                  m.pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m.pinned ? <PinOff size={12} /> : <Pin size={12} />}
              </button>
            </div>
          )}
        </div>

        {isFailed && m.clientTempId && (
          <div className="mt-1 flex items-center gap-1.5 px-1 text-[10.5px] text-destructive">
            <AlertCircle size={11} />
            <span>Chưa gửi được</span>
            <button
              type="button"
              onClick={() => onRetryMessage(m.clientTempId!)}
              className="inline-flex items-center gap-0.5 font-semibold underline hover:opacity-80"
            >
              <RotateCcw size={10} /> Thử lại
            </button>
            <button
              type="button"
              onClick={() => onDismissFailed(m.channelId, m.clientTempId!)}
              aria-label="Xóa tin lỗi"
              className="inline-flex items-center text-muted-foreground hover:text-foreground"
            >
              <X size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
