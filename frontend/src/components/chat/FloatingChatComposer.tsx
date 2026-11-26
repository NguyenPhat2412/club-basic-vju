"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Paperclip, Send } from "lucide-react";
import { CHAT_FONT_SIZE_CLASS, type ChatFontSizeKey } from "@/forms/chat/chat-appearance";
import { insertTextAtCursor } from "@/forms/chat/chat-emojis";
import { ChatEmojiPopover } from "@/components/management/ChatEmojiPopover";
import { FloatingChatComposerAttachments } from "@/components/chat/FloatingChatComposerAttachments";
import { FloatingChatDocPicker } from "@/components/chat/FloatingChatDocPicker";
import {
  applyMentionReplacement,
  extractActiveMention,
  FloatingChatMentionMenu,
  useClubMentionCandidates,
} from "@/components/chat/FloatingChatMentionMenu";
import { cn } from "@/lib/utils";
import type { ChatMessage, StagedChatMedia } from "@/types/chat/chat.types";
import type { DocumentItem } from "@/types/document/document.types";
import type { Membership } from "@/types/club/club.types";

const MAX_CHAT_CHARS = 4000;
const WARN_CHAT_CHARS = 3600;
const MAX_TEXTAREA_HEIGHT = 120;
const IMAGE_ACCEPT = "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm";
const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.zip,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm";

export function FloatingChatComposer({
  clubId,
  canSend,
  canSummarize,
  canViewClubDocs = false,
  fontSize = "md",
  content,
  onContentChange,
  replyTo,
  onClearReply,
  attachedDoc = null,
  onSelectDoc,
  onClearAttachedDoc,
  stagedMedia,
  onAddFiles,
  onRemoveStagedMedia,
  sendPending,
  onSend,
  onQuickLike,
  onTyping,
  onOpenAi,
}: {
  clubId: string;
  canSend: boolean;
  canSummarize: boolean;
  canViewClubDocs?: boolean;
  fontSize?: ChatFontSizeKey;
  content: string;
  onContentChange: (value: string) => void;
  replyTo: ChatMessage | null;
  onClearReply: () => void;
  attachedDoc?: DocumentItem | null;
  onSelectDoc?: (doc: DocumentItem) => void;
  onClearAttachedDoc?: () => void;
  stagedMedia: StagedChatMedia[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveStagedMedia: (localId: string) => void;
  sendPending: boolean;
  onSend: () => void;
  onQuickLike: () => void;
  onTyping: () => void;
  onOpenAi: () => void;
}) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [mentionDismissedAt, setMentionDismissedAt] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [content, fontSize]);

  const activeMention = useMemo(() => {
    if (!canSend) return null;
    const span = extractActiveMention(content, cursorPos);
    if (!span || mentionDismissedAt === span.start) return null;
    return span;
  }, [canSend, content, cursorPos, mentionDismissedAt]);

  const mentionOpen = Boolean(activeMention);
  const { candidates: mentionCandidates, isPending: mentionPending } = useClubMentionCandidates(
    clubId,
    activeMention?.query ?? "",
    mentionOpen,
  );
  const safeMentionIdx = mentionCandidates.length > 0 ? Math.min(mentionIdx, mentionCandidates.length - 1) : 0;

  if (!canSend) {
    return (
      <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] text-slate-500">
        Chế độ chỉ xem trong kênh này.
      </div>
    );
  }

  const trimmed = content.trim().toLowerCase();
  const showAiHint = canSummarize && (trimmed === "/ai" || trimmed === "@ai");
  const hasPayload = Boolean(content.trim()) || stagedMedia.length > 0 || Boolean(attachedDoc);
  const charCount = content.length;
  const nearLimit = charCount >= WARN_CHAT_CHARS;
  const atLimit = charCount >= MAX_CHAT_CHARS;

  const pickMention = (member: Membership) => {
    if (!activeMention) return;
    const name = member.userFullName?.trim();
    if (!name) return;
    const { nextValue, nextCursor } = applyMentionReplacement(content, activeMention, name, MAX_CHAT_CHARS);
    onContentChange(nextValue);
    setCursorPos(nextCursor);
    setMentionIdx(0);
    setMentionDismissedAt(null);
    window.requestAnimationFrame(() => {
      const el = textareaRef.current;
      el?.focus();
      el?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const submit = () => {
    if (showAiHint) {
      onContentChange("");
      onOpenAi();
      return;
    }
    if (!hasPayload) return;
    setEmojiOpen(false);
    setDocPickerOpen(false);
    setMentionDismissedAt(null);
    onSend();
  };

  return (
    <div className="relative z-20 border-t border-slate-200 bg-white px-2 pb-2 pt-1.5">
      <FloatingChatMentionMenu
        open={mentionOpen && !docPickerOpen}
        candidates={mentionCandidates}
        isPending={mentionPending}
        activeIndex={safeMentionIdx}
        onHoverIndex={setMentionIdx}
        onSelect={pickMention}
      />

      <FloatingChatComposerAttachments
        showAiHint={showAiHint}
        onTriggerAi={() => { onContentChange(""); onOpenAi(); }}
        replyTo={replyTo}
        onClearReply={onClearReply}
        attachedDoc={attachedDoc}
        onClearAttachedDoc={onClearAttachedDoc}
        stagedMedia={stagedMedia}
        onRemoveStagedMedia={onRemoveStagedMedia}
      />

      <div className="flex items-end gap-0.5">
        <button
          type="button"
          title="Gửi ảnh hoặc video"
          aria-label="Gửi ảnh hoặc video"
          onClick={() => imageInputRef.current?.click()}
          className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-primary/85 transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <ImagePlus size={16} />
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onAddFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          title="Đính kèm tệp"
          aria-label="Đính kèm tệp"
          onClick={() => fileInputRef.current?.click()}
          className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-primary/85 transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Paperclip size={15} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onAddFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {onSelectDoc && (
          <FloatingChatDocPicker
            clubId={clubId}
            canViewClubDocs={canViewClubDocs}
            open={docPickerOpen}
            onOpenChange={(next) => {
              setDocPickerOpen(next);
              if (next) setEmojiOpen(false);
            }}
            onSelect={onSelectDoc}
          />
        )}

        <div
          className={cn(
            "flex min-w-0 flex-1 items-end rounded-[18px] border bg-slate-100/90 pl-3 pr-1 transition-colors focus-within:bg-white",
            atLimit
              ? "border-destructive/70 focus-within:border-destructive"
              : "border-slate-200/90 focus-within:border-primary/45",
          )}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            maxLength={MAX_CHAT_CHARS}
            value={content}
            onChange={(e) => {
              const nextVal = e.target.value.slice(0, MAX_CHAT_CHARS);
              onContentChange(nextVal);
              setCursorPos(e.target.selectionStart ?? nextVal.length);
              setMentionIdx(0);
              setMentionDismissedAt(null);
              onTyping();
            }}
            onClick={(e) => setCursorPos(e.currentTarget.selectionStart ?? content.length)}
            onKeyUp={(e) => setCursorPos(e.currentTarget.selectionStart ?? content.length)}
            onPaste={(e) => {
              const pasted = Array.from(e.clipboardData?.files ?? []);
              if (pasted.length > 0) {
                e.preventDefault();
                onAddFiles(pasted);
              }
            }}
            onKeyDown={(e) => {
              if (mentionOpen && mentionCandidates.length > 0 && !e.nativeEvent.isComposing) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIdx((i) => (i + 1) % mentionCandidates.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIdx((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  const target = mentionCandidates[safeMentionIdx];
                  if (target) pickMention(target);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setMentionDismissedAt(activeMention?.start ?? null);
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Aa · Nhắn tin, @ hoặc /ai…"
            className={cn(
              "max-h-[120px] min-h-[34px] w-full resize-none overflow-y-auto bg-transparent py-1.5 text-slate-900 placeholder:text-slate-400 outline-none",
              CHAT_FONT_SIZE_CLASS[fontSize],
            )}
          />
          <ChatEmojiPopover
            floating
            open={emojiOpen}
            onOpenChange={(next) => {
              setEmojiOpen(next);
              if (next) setDocPickerOpen(false);
            }}
            onSelectEmoji={(emoji) => {
              const el = textareaRef.current;
              const { nextValue, nextCursor } = insertTextAtCursor(
                content,
                emoji,
                el?.selectionStart,
                el?.selectionEnd,
                MAX_CHAT_CHARS,
              );
              onContentChange(nextValue);
              setCursorPos(nextCursor);
              window.requestAnimationFrame(() => {
                el?.focus();
                el?.setSelectionRange(nextCursor, nextCursor);
              });
            }}
          />
        </div>

        {hasPayload ? (
          <button
            type="button"
            title="Gửi tin nhắn"
            aria-label="Gửi tin nhắn"
            onClick={submit}
            className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity hover:opacity-90"
          >
            {sendPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        ) : (
          <button
            type="button"
            title="Gửi nhanh 👍"
            aria-label="Gửi nhanh 👍"
            onClick={onQuickLike}
            className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-base transition-transform hover:scale-110 hover:bg-primary/10 active:scale-95"
          >
            👍
          </button>
        )}
      </div>

      {charCount > 0 && (
        <div className="mt-1 flex items-center justify-between px-1 text-[10px] tabular-nums">
          <span className="text-slate-400">
            {atLimit ? (
              <span className="font-semibold text-destructive">Đã đạt giới hạn 4.000 ký tự</span>
            ) : (
              "Shift+Enter xuống dòng"
            )}
          </span>
          <span
            data-no-i18n="true"
            className={cn(
              "font-medium",
              atLimit ? "font-bold text-destructive" : nearLimit ? "font-semibold text-amber-600" : "text-slate-400",
            )}
          >
            {`${charCount.toLocaleString("vi-VN")} / 4.000`}
          </span>
        </div>
      )}
    </div>
  );
}
