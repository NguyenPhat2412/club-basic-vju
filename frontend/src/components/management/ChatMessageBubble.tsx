"use client";

import { Bot, Download, Eye, FileText, Loader2, Reply } from "lucide-react";
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
  canSend,
  onReply,
  onPreviewDoc,
  onDownloadDoc,
  onError,
}: {
  message: ChatMessage;
  currentUserId?: string;
  groupedPrev: boolean;
  groupedNext: boolean;
  canSend: boolean;
  onReply: (msg: ChatMessage) => void;
  onPreviewDoc: (target: PreviewTarget) => void;
  onDownloadDoc: (id: string, name: string) => void;
  onError: (msg: string) => void;
}) {
  const isBot = m.senderType === "AI_BOT";
  const isMine = !isBot && Boolean(currentUserId) && m.senderId === currentUserId;
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
      className={cn(
        "group flex w-full max-w-[min(560px,88%)] items-end gap-2 first:mt-0",
        groupedPrev ? "mt-1" : "mt-3",
        isMine && "ml-auto flex-row-reverse",
        m.optimistic && "opacity-80"
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
        {showSender && (
          <span className="mb-0.5 px-1 text-[11px] font-semibold text-muted-foreground">{senderLabel}</span>
        )}

        <div className={cn("flex max-w-full items-center gap-1.5", isMine && "flex-row-reverse")}>
          <div
            className={cn(
              "relative max-w-full text-[13px] leading-relaxed",
              isBareMedia
                ? "p-0"
                : cn(
                    "w-fit rounded-xl border px-3 py-2",
                    isMine
                      ? "border-primary/20 bg-primary/[0.09] text-foreground"
                      : isBot
                        ? "border-primary/25 bg-primary/[0.05] text-foreground"
                        : "border-border/60 bg-card text-foreground shadow-2xs"
                  )
            )}
          >
            {m.replyToId && (
              <div className="mb-1.5 flex items-start gap-2 rounded-md bg-background/70 px-2 py-1 text-[11px]">
                <span className="mt-0.5 h-6 w-0.5 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-foreground">
                    {m.replyToSenderName || "Tin nhắn trước"}
                  </span>
                  <span className="line-clamp-1 text-muted-foreground">{m.replyToPreview || "…"}</span>
                </span>
              </div>
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
                  "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-background/85 px-2.5 py-1.5 text-xs",
                  hasText && "mt-1.5"
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText size={14} className="shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="max-w-[200px] truncate font-semibold text-foreground">
                      {m.documentName || "Tài liệu CLB"}
                    </p>
                    {typeof m.documentSizeBytes === "number" && (
                      <p className="font-mono text-[10px] text-muted-foreground">{formatSize(m.documentSizeBytes)}</p>
                    )}
                  </div>
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
                      className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 text-[11px] font-semibold hover:bg-muted"
                    >
                      <Eye size={11} /> Xem
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDownloadDoc(m.documentId!, m.documentName || "document")}
                    className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 text-[11px] font-semibold hover:bg-muted"
                  >
                    <Download size={11} /> Tải
                  </button>
                </div>
              </div>
            )}

            {showTime && (
              <div
                title={formatDateTime(m.createdAt)}
                className={cn(
                  "mt-1 flex items-center gap-1 whitespace-nowrap text-[10px] leading-none text-muted-foreground",
                  isMine && "justify-end",
                  isBareMedia && "w-fit rounded-full bg-black/50 px-2 py-0.5 text-white",
                  isBareMedia && isMine && "ml-auto"
                )}
              >
                {m.optimistic ? (
                  <>
                    <Loader2 size={10} className="animate-spin" /> Đang gửi
                  </>
                ) : (
                  formatChatTimeCompact(m.createdAt)
                )}
              </div>
            )}
          </div>

          {canSend && !m.optimistic && (
            <button
              type="button"
              title="Trả lời"
              aria-label={`Trả lời ${senderLabel}`}
              onClick={() => onReply(m)}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Reply size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
