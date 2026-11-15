"use client";

import { useRef, useState } from "react";
import { FileText, FolderOpen, ImagePlus, Loader2, Paperclip, Play, Plus, Send, Upload, X, Zap } from "lucide-react";
import {
  CHAT_MAX_ATTACHMENTS,
  ComposerPostSendImeGuard,
  isComposerImeComposing,
  shouldIgnoreTrailingComposerImeText,
} from "@/lib/chat-message-cache";
import { ChatQuickReplyPopover, filterQuickReplies } from "@/components/management/ChatQuickReplyPopover";
import { cn, fileExtension, formatSize } from "@/lib/utils";
import type { ChatMessage, ChatQuickReply, DocumentItem, StagedChatMedia } from "@/types";

const MEDIA_ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov";
const FILE_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.zip,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov";

export type ChatComposerBarProps = {
  clubId: string;
  channelName?: string;
  currentUserId?: string;
  canManageQuickReplies: boolean;
  quickReplies: ChatQuickReply[];
  quickRepliesLoading: boolean;
  replyTo: ChatMessage | null;
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
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
};

export function ChatComposerBar(props: ChatComposerBarProps) {
  const {
    clubId, channelName, currentUserId, canManageQuickReplies, quickReplies, quickRepliesLoading,
    replyTo, onClearReply, attachedDoc, onOpenDocPicker, onClearAttachedDoc,
    stagedMedia, onAddFiles, onRemoveStagedMedia, onClearStagedMedia,
    content, onContentChange, sendPending, onSend, onNotice, onError,
  } = props;

  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imeGuardRef = useRef<ComposerPostSendImeGuard | null>(null);
  const [quickPanelOpen, setQuickPanelOpen] = useState(false);
  const [slashDismissedFor, setSlashDismissedFor] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);

  const trimmedStart = content.trimStart();
  const isSlashTrigger =
    trimmedStart.startsWith("/") &&
    !trimmedStart.includes(" ") &&
    !trimmedStart.includes("\n") &&
    slashDismissedFor !== trimmedStart;
  const slashQuery = isSlashTrigger ? trimmedStart : "";
  const slashMatches = isSlashTrigger ? filterQuickReplies(quickReplies, slashQuery) : [];
  const showQuickPopover = quickPanelOpen || isSlashTrigger;

  const canSubmitNow = Boolean(
    (content.trim() || attachedDoc || stagedMedia.length > 0) && !sendPending
  );

  const triggerSubmit = () => {
    if (!canSubmitNow) return;
    imeGuardRef.current = {
      hasUserTypedSinceSend: false,
      sentAt: Date.now(),
      sentBody: content,
    };
    setQuickPanelOpen(false);
    setFileMenuOpen(false);
    onSend();
  };

  const handleInsertQuickReply = (reply: ChatQuickReply, sendImmediately = false) => {
    setQuickPanelOpen(false);
    setSlashDismissedFor("");
    setSlashIndex(0);
    if (sendImmediately) {
      onSend(reply.content);
      return;
    }
    onContentChange(reply.content);
  };

  const lineCount = Math.min(4, Math.max(1, content.split("\n").length));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        triggerSubmit();
      }}
      data-testid="chat-composer"
      className="relative shrink-0 border-t border-border/60 bg-card"
    >
      <input
        ref={mediaInputRef}
        type="file"
        multiple
        accept={MEDIA_ACCEPT}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onAddFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={FILE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onAddFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <ChatQuickReplyPopover
        open={showQuickPopover}
        clubId={clubId}
        currentUserId={currentUserId}
        canManageAll={canManageQuickReplies}
        slashFilter={slashQuery}
        activeIndex={slashIndex}
        quickReplies={quickReplies}
        loading={quickRepliesLoading}
        onClose={() => {
          setQuickPanelOpen(false);
          if (slashQuery) setSlashDismissedFor(slashQuery);
        }}
        onInsert={handleInsertQuickReply}
        onNotice={onNotice}
        onError={onError}
      />

      {(replyTo || attachedDoc) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-1.5 text-xs">
          {replyTo && (
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1">
              <span className="h-5 w-0.5 shrink-0 rounded-full bg-primary" />
              <span className="min-w-0 flex-1 truncate">
                <b className="text-foreground">Trả lời {replyTo.senderFullName || "Thành viên"}: </b>
                <span className="text-muted-foreground">{replyTo.content || "[Đính kèm đa phương tiện]"}</span>
              </span>
              <button type="button" aria-label="Huỷ trả lời" onClick={onClearReply} className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                <X size={12} />
              </button>
            </div>
          )}
          {attachedDoc && (
            <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-primary">
              <FileText size={12} className="shrink-0" />
              <span className="max-w-[200px] truncate font-semibold">{attachedDoc.name}</span>
              <button type="button" aria-label="Bỏ đính kèm" onClick={onClearAttachedDoc} className="hover:opacity-75">
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {stagedMedia.length > 0 && (
        <div className="border-b border-border/50 px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground">Đã chọn {stagedMedia.length}/{CHAT_MAX_ATTACHMENTS} tệp</span>
            <button type="button" onClick={onClearStagedMedia} className="font-semibold text-muted-foreground hover:text-foreground">
              Xóa tất cả
            </button>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {stagedMedia.map((item) => (
              <div key={item.localId} className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted/40">
                {item.mediaKind === "IMAGE" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" />
                ) : item.mediaKind === "VIDEO" ? (
                  <div className="relative h-full w-full bg-black">
                    <video src={item.previewUrl} muted preload="metadata" className="h-full w-full object-cover opacity-85" />
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-black/65 text-white">
                        <Play size={10} className="ml-0.5 fill-current" />
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="flex h-full w-full flex-col justify-between p-1.5 text-[9px]">
                    <span className="w-fit rounded bg-primary/10 px-1 font-mono font-bold uppercase text-primary">
                      {fileExtension(item.file.name, item.file.type)}
                    </span>
                    <span className="truncate font-semibold text-foreground" title={item.file.name}>{item.file.name}</span>
                    <span className="font-mono text-[8.5px] text-muted-foreground">{formatSize(item.file.size)}</span>
                  </div>
                )}
                <button
                  type="button"
                  aria-label={`Gỡ ${item.file.name}`}
                  onClick={() => onRemoveStagedMedia(item.localId)}
                  className="absolute top-0.5 right-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {stagedMedia.length < CHAT_MAX_ATTACHMENTS && (
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                aria-label="Thêm ảnh hoặc video"
                className="grid h-14 w-14 shrink-0 place-items-center rounded-md border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Plus size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-end gap-1 px-2.5 py-1.5">
        <div className="relative flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="Gửi hình ảnh hoặc video"
            title="Gửi ảnh hoặc video"
            onClick={() => {
              setFileMenuOpen(false);
              setQuickPanelOpen(false);
              mediaInputRef.current?.click();
            }}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ImagePlus size={17} />
          </button>

          <div className="relative">
            <button
              type="button"
              aria-label="Đính kèm tệp tin"
              title="Đính kèm tệp tin"
              onClick={() => {
                setQuickPanelOpen(false);
                setFileMenuOpen((v) => !v);
              }}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                fileMenuOpen && "bg-primary/10 text-primary"
              )}
            >
              <Paperclip size={17} />
            </button>

            {fileMenuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Đóng menu tệp"
                  onClick={() => setFileMenuOpen(false)}
                  className="fixed inset-0 z-20 cursor-default"
                />
                <div className="absolute bottom-full left-0 z-30 mb-1.5 w-52 overflow-hidden rounded-lg border border-border bg-card p-1 text-xs shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setFileMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left font-medium text-foreground hover:bg-muted"
                  >
                    <Upload size={14} className="shrink-0 text-primary" />
                    <span>Tải tệp tin từ thiết bị</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFileMenuOpen(false);
                      onOpenDocPicker();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left font-medium text-foreground hover:bg-muted"
                  >
                    <FolderOpen size={14} className="shrink-0 text-primary" />
                    <span>Chọn từ Kho lưu trữ CLB</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label="Tin nhắn nhanh"
            title="Tin nhắn nhanh (/)"
            onClick={() => {
              setFileMenuOpen(false);
              setQuickPanelOpen((v) => !v);
            }}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              showQuickPopover && "bg-primary/10 text-primary"
            )}
          >
            <Zap size={17} />
          </button>
        </div>

        <textarea
          rows={1}
          aria-label="Nội dung tin nhắn"
          value={content}
          maxLength={4000}
          style={{ height: `${lineCount * 20 + 12}px` }}
          onChange={(e) => {
            const nextVal = e.target.value;
            if (shouldIgnoreTrailingComposerImeText(imeGuardRef.current, nextVal)) return;
            if (slashDismissedFor && !nextVal.trimStart().startsWith(slashDismissedFor)) {
              setSlashDismissedFor("");
            }
            setSlashIndex(0);
            onContentChange(nextVal);
          }}
          onPaste={(e) => {
            const pastedFiles = Array.from(e.clipboardData?.files ?? []);
            if (pastedFiles.length > 0) {
              e.preventDefault();
              onAddFiles(pastedFiles);
            }
          }}
          onKeyDown={(e) => {
            if (imeGuardRef.current && !isComposerImeComposing(e) && e.key !== "Enter") {
              imeGuardRef.current.hasUserTypedSinceSend = true;
            }
            if (isSlashTrigger && slashMatches.length > 0 && !isComposerImeComposing(e)) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSlashIndex((i) => (i + 1) % slashMatches.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSlashIndex((i) => (i - 1 + slashMatches.length) % slashMatches.length);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setSlashDismissedFor(slashQuery);
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const picked = slashMatches[Math.min(slashIndex, slashMatches.length - 1)];
                if (picked) handleInsertQuickReply(picked, false);
                return;
              }
            }
            if (e.key === "Enter" && !e.shiftKey && !isComposerImeComposing(e)) {
              e.preventDefault();
              triggerSubmit();
            }
          }}
          placeholder={
            stagedMedia.length > 0 || attachedDoc
              ? "Thêm chú thích…"
              : channelName
                ? `Nhập tin nhắn tới #${channelName} (gõ / để chèn nhanh)…`
                : "Nhập tin nhắn (gõ / để chèn nhanh)…"
          }
          className="max-h-24 min-h-8 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-1.5 py-1.5 text-[13px] leading-5 text-foreground outline-none placeholder:text-muted-foreground"
        />

        <button
          type="submit"
          disabled={!canSubmitNow}
          aria-label="Gửi tin nhắn"
          title="Gửi tin nhắn (Enter)"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-35"
        >
          {sendPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
    </form>
  );
}
