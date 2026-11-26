"use client";

import { Fragment, useState } from "react";
import { AlertCircle, Bot, Check, CheckCheck, Clock, FileText, Loader2, Pin, RotateCcw } from "lucide-react";
import {
  CHAT_FONT_SIZE_CLASS,
  chatBubbleRadiusClass,
  formatChatDayDivider,
  type ChatAppearanceConfig,
} from "@/forms/chat/chat-appearance";
import { getChatJumbomojiCount } from "@/forms/chat/chat-emojis";
import { resolveChatMessageStatusMeta } from "@/forms/chat/chat-status-meta";
import { formatChatTimeCompact } from "@/lib/chat-message-cache";
import { ChatMediaCollage } from "@/components/management/ChatMediaCollage";
import { ChatReactionPills } from "@/components/management/ChatMessageReactions";
import { FloatingChatMessageActions } from "@/components/chat/FloatingChatMessageActions";
import { UserAvatar } from "@/components/user/UserAvatar";
import { toast } from "@/components/ui/toast";
import { cn, formatDateTime } from "@/lib/utils";
import type { ChatAttachment, ChatMessage } from "@/types/chat/chat.types";

type FloatingChatMessageItemProps = {
  message: ChatMessage;
  galleryMedia?: ChatAttachment[];
  currentUserId?: string;
  showDivider: boolean;
  groupedPrev: boolean;
  groupedNext: boolean;
  isLatestOwn: boolean;
  highlighted: boolean;
  appearance: ChatAppearanceConfig;
  canSend: boolean;
  canModerate: boolean;
  onReply: (msg: ChatMessage) => void;
  onToggleReaction: (msg: ChatMessage, emoji: string) => void;
  onTogglePin: (msg: ChatMessage) => void;
  onEditMessage: (msg: ChatMessage, nextContent: string) => Promise<void> | void;
  onDeleteMessage: (msg: ChatMessage) => Promise<void> | void;
  onRetryMessage: (clientTempId: string) => void;
  onJumpToMessage: (messageId: string) => void;
};

function StatusGlyph({ status }: { status: ReturnType<typeof resolveChatMessageStatusMeta>["status"] }) {
  if (status === "uploading") return <Loader2 size={11} className="animate-spin text-primary" />;
  if (status === "sending") return <Clock size={10.5} className="text-slate-400" />;
  if (status === "seen") return <CheckCheck size={12} className="text-primary" />;
  if (status === "delivered") return <CheckCheck size={12} className="text-slate-400" />;
  if (status === "sent") return <Check size={11.5} className="text-slate-400" />;
  return <AlertCircle size={11} className="text-destructive" />;
}

export function FloatingChatMessageItem({
  message: m, galleryMedia, currentUserId, showDivider, groupedPrev, groupedNext, isLatestOwn,
  highlighted, appearance, canSend, canModerate, onReply, onToggleReaction,
  onTogglePin, onEditMessage, onDeleteMessage, onRetryMessage, onJumpToMessage,
}: FloatingChatMessageItemProps) {
  const [popupActive, setPopupActive] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(m.content ?? "");

  const isBot = m.senderType === "AI_BOT";
  const isMine = !isBot && Boolean(currentUserId) && m.senderId === currentUserId;
  const senderLabel = isBot ? "Trợ lý AI CLB" : m.senderFullName || "Thành viên";
  const statusMeta = isMine ? resolveChatMessageStatusMeta(m) : null;
  const isFailed = statusMeta?.status === "failed";
  const isPending = statusMeta?.status === "uploading" || statusMeta?.status === "sending";
  const showStatusLine = Boolean(statusMeta && (isFailed || isPending || isLatestOwn));
  const hasAttachments = (m.attachments?.length ?? 0) > 0;
  const reactions = m.reactions ?? [];
  const myEmojis = new Set(
    currentUserId ? reactions.filter((r) => r.reactorIds?.includes(currentUserId)).map((r) => r.emoji) : [],
  );
  const canInteract = !m.optimistic && !isFailed && (canSend || canModerate);
  const canEdit = canInteract && isMine && Boolean(m.content?.trim());
  const canDelete = canInteract && ((isMine && canSend) || canModerate);
  const jumboCount = !editing && !isFailed
    ? getChatJumbomojiCount(m.content ?? "", hasAttachments || Boolean(m.documentName || m.replyToId))
    : 0;
  const isJumbo = jumboCount > 0;

  const bubbleTone = isFailed
    ? "border-destructive/45 bg-destructive/10 text-foreground"
    : isMine
      ? appearance.bubbleStyle === "solid"
        ? cn("border-primary bg-primary text-primary-foreground", isPending && "opacity-80")
        : appearance.bubbleStyle === "minimal"
          ? cn("border-slate-200 bg-slate-100 text-slate-900", isPending && "opacity-80")
          : cn("border-primary/20 bg-primary/10 text-slate-900", isPending && "opacity-80")
      : isBot
        ? "border-primary/25 bg-white text-slate-900 ring-1 ring-primary/10"
        : "border-slate-200/90 bg-white text-slate-900";

  const submitEdit = () => {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    setEditing(false);
    if (trimmed !== m.content.trim()) void onEditMessage(m, trimmed);
  };

  return (
    <Fragment>
      {showDivider && (
        <div className="my-2 flex justify-center">
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 shadow-2xs ring-1 ring-slate-200/70">
            {formatChatDayDivider(m.createdAt)} · {formatChatTimeCompact(m.createdAt)}
          </span>
        </div>
      )}

      <div
        id={`dock-msg-${m.id}`}
        className={cn(
          "group/msg relative flex items-end gap-1.5 rounded-xl transition-colors hover:z-30 focus-within:z-30",
          popupActive && "z-40",
          groupedPrev ? (appearance.density === "compact" ? "mt-0.5" : "mt-1") : "mt-2",
          isMine ? "justify-end" : "justify-start",
          highlighted && "bg-primary/10 p-1 ring-1 ring-primary/35",
        )}
      >
        {!isMine && (
          <div className="w-6 shrink-0">
            {!groupedNext && (
              isBot ? (
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-white">
                  <Bot size={12} />
                </span>
              ) : (
                <UserAvatar avatarUrl={m.senderAvatarUrl} name={senderLabel} size="xs" rounded="full" />
              )
            )}
          </div>
        )}

        <div className={cn("flex min-w-0 flex-1 flex-col", isMine ? "items-end" : "items-start")}>
          {((!isMine && !groupedPrev) || m.pinned) && (
            <div className={cn("mb-0.5 flex max-w-[78%] items-center gap-1.5 px-1 text-[11px]", isMine && "flex-row-reverse")}>
              {!isMine && !groupedPrev && (
                <span data-no-i18n={isBot || !m.senderFullName ? undefined : "true"} className="truncate font-semibold text-slate-500">
                  {senderLabel}
                </span>
              )}
              {m.pinned && (
                <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-primary">
                  <Pin size={9} className="rotate-45" /> Đã ghim
                </span>
              )}
            </div>
          )}

          <div className={cn("flex w-full min-w-0 items-center gap-1", isMine ? "flex-row-reverse justify-start" : "justify-start")}>
            <div
              title={formatDateTime(m.createdAt)}
              className={cn(
                "min-w-0 max-w-[78%]",
                isJumbo
                  ? "w-fit bg-transparent px-1 py-0.5 text-[36px] leading-tight"
                  : cn(
                      "overflow-hidden border shadow-2xs",
                      hasAttachments ? "w-full max-w-[236px]" : "w-fit",
                      CHAT_FONT_SIZE_CLASS[appearance.fontSize],
                      hasAttachments && !m.content && !m.replyToId && !editing ? "p-0.5" : "px-2.5 py-1.5",
                      chatBubbleRadiusClass(isMine, groupedPrev, groupedNext),
                      bubbleTone,
                    ),
              )}
            >
              {m.replyToId && (
                <button
                  type="button"
                  onClick={() => onJumpToMessage(m.replyToId!)}
                  className={cn(
                    "mb-1.5 block w-full rounded-lg border-l-2 px-2 py-1 text-left text-[10.5px] leading-snug",
                    isMine && appearance.bubbleStyle === "solid"
                      ? "border-white/70 bg-white/15 text-white/90"
                      : "border-primary/60 bg-slate-100/90 text-slate-600",
                  )}
                >
                  <p data-no-i18n={m.replyToSenderName ? "true" : undefined} className="truncate font-bold">
                    {m.replyToSenderName || "Thành viên"}
                  </p>
                  <p data-no-i18n={m.replyToPreview ? "true" : undefined} className="truncate opacity-85">
                    {m.replyToPreview || "[Đính kèm]"}
                  </p>
                </button>
              )}

              {hasAttachments && (
                <ChatMediaCollage
                  attachments={m.attachments}
                  galleryMedia={galleryMedia}
                  flushTop={!m.content && !m.replyToId}
                  onError={(msg) => { if (msg?.trim()) toast.error(msg); }}
                />
              )}

              {m.documentName && (
                <div className="mb-1 flex items-center gap-1.5 rounded-lg bg-black/5 px-2 py-1 text-[11px] font-medium">
                  <FileText size={12} className="shrink-0" />
                  <span data-no-i18n="true" className="truncate">{m.documentName}</span>
                </div>
              )}

              {editing ? (
                <div className="min-w-[200px] space-y-1.5">
                  <input
                    type="text"
                    maxLength={4000}
                    autoFocus
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) submitEdit();
                      if (e.key === "Escape") setEditing(false);
                    }}
                    className="h-7 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-primary"
                  />
                  <div className="flex justify-end gap-1.5 text-[10.5px]">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded px-2 py-0.5 font-semibold text-slate-600 hover:bg-slate-200/70"
                    >
                      Huỷ
                    </button>
                    <button
                      type="button"
                      onClick={submitEdit}
                      className="rounded bg-primary px-2 py-0.5 font-bold text-white"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              ) : m.content ? (
                <p className={cn("whitespace-pre-wrap break-words leading-relaxed", hasAttachments && "mt-1.5")}>
                  <span data-no-i18n="true">{m.content}</span>
                  {m.editedAt && <span className="ml-1.5 text-[9.5px] italic opacity-70">(đã sửa)</span>}
                </p>
              ) : null}
            </div>

            {canInteract && !editing && (
              <FloatingChatMessageActions
                message={m}
                isMine={isMine}
                canSend={canSend}
                canEdit={canEdit}
                canDelete={canDelete}
                myEmojis={myEmojis}
                onReply={onReply}
                onToggleReaction={onToggleReaction}
                onTogglePin={onTogglePin}
                onStartEdit={() => { setEditDraft(m.content ?? ""); setEditing(true); }}
                onDeleteMessage={onDeleteMessage}
                onActiveChange={setPopupActive}
              />
            )}
          </div>

          <ChatReactionPills
            reactions={reactions}
            currentUserId={currentUserId}
            isMine={isMine}
            canReact={canInteract}
            onToggleReaction={(emoji) => onToggleReaction(m, emoji)}
          />

          {showStatusLine && statusMeta && (
            <div className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-slate-500">
              <StatusGlyph status={statusMeta.status} />
              <span>{isFailed ? m.deliveryError || "Gửi thất bại" : statusMeta.shortLabel}</span>
              {isFailed && m.clientTempId && (
                <button
                  type="button"
                  onClick={() => onRetryMessage(m.clientTempId!)}
                  className="inline-flex items-center gap-0.5 font-bold text-primary hover:underline"
                >
                  <RotateCcw size={10} /> Thử lại
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
}
