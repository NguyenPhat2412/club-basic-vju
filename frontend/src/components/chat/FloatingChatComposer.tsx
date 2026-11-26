"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ImagePlus, Loader2, Paperclip, Reply, Send, Sparkles, X } from "lucide-react";
import { CHAT_FONT_SIZE_CLASS, type ChatFontSizeKey } from "@/forms/chat/chat-appearance";
import { insertTextAtCursor } from "@/forms/chat/chat-emojis";
import { ChatEmojiPopover } from "@/components/management/ChatEmojiPopover";
import { cn } from "@/lib/utils";
import type { ChatMessage, StagedChatMedia } from "@/types/chat/chat.types";

const MAX_CHAT_CHARS = 4000;
const WARN_CHAT_CHARS = 3600;
const MAX_TEXTAREA_HEIGHT = 120;
const IMAGE_ACCEPT = "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm";
const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.zip,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm";

export function FloatingChatComposer({
  canSend,
  canSummarize,
  fontSize = "md",
  content,
  onContentChange,
  replyTo,
  onClearReply,
  stagedMedia,
  onAddFiles,
  onRemoveStagedMedia,
  sendPending,
  onSend,
  onQuickLike,
  onTyping,
  onOpenAi,
}: {
  canSend: boolean;
  canSummarize: boolean;
  fontSize?: ChatFontSizeKey;
  content: string;
  onContentChange: (value: string) => void;
  replyTo: ChatMessage | null;
  onClearReply: () => void;
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [content, fontSize]);

  if (!canSend) {
    return (
      <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] text-slate-500">
        Chế độ chỉ xem trong kênh này.
      </div>
    );
  }

  const trimmed = content.trim().toLowerCase();
  const showAiHint = canSummarize && (trimmed === "/ai" || trimmed === "@ai");
  const hasPayload = Boolean(content.trim()) || stagedMedia.length > 0;
  const charCount = content.length;
  const nearLimit = charCount >= WARN_CHAT_CHARS;
  const atLimit = charCount >= MAX_CHAT_CHARS;

  const submit = () => {
    if (showAiHint) {
      onContentChange("");
      onOpenAi();
      return;
    }
    if (!hasPayload) return;
    setEmojiOpen(false);
    onSend();
  };

  return (
    <div className="relative z-20 border-t border-slate-200 bg-white px-2 pb-2 pt-1.5">
      {showAiHint && (
        <button
          type="button"
          onClick={() => { onContentChange(""); onOpenAi(); }}
          className="mb-1.5 flex w-full items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/8 px-2.5 py-1.5 text-left text-xs font-bold text-primary hover:bg-primary/12"
        >
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={13} /> Mở Trợ lý AI tóm tắt kênh này
          </span>
          <span className="text-[10px] font-semibold opacity-75">Enter</span>
        </button>
      )}

      {replyTo && (
        <div className="mb-1.5 flex items-center justify-between gap-2 rounded-lg border-l-2 border-primary bg-slate-50 px-2.5 py-1 text-[11px]">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 font-bold text-primary">
              <Reply size={11} />
              <span>Đang trả lời</span>
              <span data-no-i18n="true" className="truncate text-slate-800">
                {replyTo.senderType === "AI_BOT" ? "Trợ lý AI CLB" : replyTo.senderFullName || "Thành viên"}
              </span>
            </p>
            <p data-no-i18n={replyTo.content?.trim() ? "true" : undefined} className="truncate text-slate-500">
              {replyTo.content?.trim() || "[Đính kèm đa phương tiện]"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Huỷ trả lời"
            onClick={onClearReply}
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {stagedMedia.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {stagedMedia.map((item) => (
            <div key={item.localId} className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {item.mediaKind === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt={item.file.name} className="size-12 object-cover" />
              ) : (
                <span className="flex h-8 max-w-28 items-center gap-1 px-2 text-[10.5px] text-slate-700">
                  <FileText size={12} className="shrink-0 text-primary" />
                  <span data-no-i18n="true" className="truncate">{item.file.name}</span>
                </span>
              )}
              <button
                type="button"
                aria-label="Xoá tệp"
                onClick={() => onRemoveStagedMedia(item.localId)}
                className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-slate-900/75 text-white hover:bg-destructive"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1">
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
              onContentChange(e.target.value.slice(0, MAX_CHAT_CHARS));
              onTyping();
            }}
            onPaste={(e) => {
              const pasted = Array.from(e.clipboardData?.files ?? []);
              if (pasted.length > 0) {
                e.preventDefault();
                onAddFiles(pasted);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Aa · Nhắn tin hoặc /ai…"
            className={cn(
              "max-h-[120px] min-h-[34px] w-full resize-none overflow-y-auto bg-transparent py-1.5 text-slate-900 placeholder:text-slate-400 outline-none",
              CHAT_FONT_SIZE_CLASS[fontSize],
            )}
          />
          <ChatEmojiPopover
            floating
            open={emojiOpen}
            onOpenChange={setEmojiOpen}
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
