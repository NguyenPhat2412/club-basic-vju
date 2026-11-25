"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCheck, Copy, Pencil, Pin, PinOff, Reply, Trash2 } from "lucide-react";
import type { ChatMessage } from "@/lib/api";
import { CHAT_QUICK_REACTIONS } from "@/forms/chat/chat-emojis";
import { resolveChatMessageStatusMeta } from "@/forms/chat/chat-status-meta";
import { cn, formatDateTime } from "@/lib/utils";

export type ContextMenuAnchor = {
  x: number;
  y: number;
};

export function ChatInlineEditBox({
  value,
  onChange,
  onCancel,
  onSave,
}: {
  value: string;
  onChange: (next: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-0.5 flex min-w-[220px] flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
      <textarea
        value={value}
        maxLength={4000}
        rows={2}
        autoFocus
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSave();
          }
        }}
        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
      />
      <div className="flex items-center justify-end gap-1.5 text-[11px]">
        <button type="button" onClick={onCancel} className="rounded-md px-2 py-0.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          Huỷ
        </button>
        <button type="button" disabled={!value.trim()} onClick={onSave} className="rounded-md bg-primary px-2.5 py-0.5 font-semibold text-primary-foreground disabled:opacity-50">
          Lưu
        </button>
      </div>
    </div>
  );
}

export function ChatMessageContextMenu({
  anchor,
  message: m,
  isMine,
  canSend,
  canDelete,
  myEmojis,
  onClose,
  onToggleReaction,
  onReply,
  onStartEdit,
  onTogglePin,
  onCopyText,
  onDelete,
}: {
  anchor: ContextMenuAnchor | null;
  message: ChatMessage;
  isMine: boolean;
  canSend: boolean;
  canDelete: boolean;
  myEmojis: Set<string>;
  onClose: () => void;
  onToggleReaction: (emoji: string) => void;
  onReply: () => void;
  onStartEdit?: () => void;
  onTogglePin: () => void;
  onCopyText?: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [confirmKey, setConfirmKey] = useState("");
  const activeKey = anchor ? `${m.id}:${anchor.x}:${anchor.y}` : "";
  const confirmingDelete = Boolean(activeKey && confirmKey === activeKey);

  useEffect(() => {
    if (!anchor) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [anchor, onClose]);

  if (!anchor || typeof document === "undefined") return null;

  const statusMeta = resolveChatMessageStatusMeta(m);
  const menuWidth = 236;
  const menuHeight = 290;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const left = Math.max(8, Math.min(anchor.x, vw - menuWidth - 8));
  const top = Math.max(8, Math.min(anchor.y, vh - menuHeight - 8));
  const canEditOwnText = isMine && m.senderType === "USER" && Boolean(onStartEdit);
  const hasCopyableText = Boolean(m.content?.trim() && onCopyText);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Tuỳ chọn trạng thái tin nhắn"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 w-[236px] overflow-hidden rounded-xl border border-border bg-card p-1.5 text-xs text-foreground shadow-xl"
    >
      {canSend && (
        <div className="mb-1 flex items-center justify-between gap-0.5 rounded-lg bg-muted/60 px-1.5 py-1">
          {CHAT_QUICK_REACTIONS.map((emoji) => {
            const active = myEmojis.has(emoji);
            return (
              <button
                key={emoji}
                type="button"
                title={`Thả cảm xúc ${emoji}`}
                onClick={() => {
                  onToggleReaction(emoji);
                  onClose();
                }}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-base transition-transform hover:scale-115 hover:bg-background",
                  active && "bg-primary/15 ring-1 ring-primary/40"
                )}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-1 flex items-center justify-between gap-1.5 border-b border-border/60 px-2 py-1 text-[10.5px] text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1 truncate font-medium">
          <CheckCheck size={12} className={cn("shrink-0", statusMeta.status === "seen" && "text-primary")} />
          <span className="truncate">{statusMeta.detailLabel}</span>
        </span>
        <span className="shrink-0">{formatDateTime(m.editedAt || m.createdAt)}</span>
      </div>

      <div className="flex flex-col gap-0.5">
        {canSend && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onReply();
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium hover:bg-muted"
          >
            <Reply size={13} className="shrink-0 text-muted-foreground" />
            <span>Trả lời tin nhắn</span>
          </button>
        )}

        {canSend && canEditOwnText && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onStartEdit?.();
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium hover:bg-muted"
          >
            <Pencil size={13} className="shrink-0 text-muted-foreground" />
            <span>Chỉnh sửa tin nhắn</span>
          </button>
        )}

        {canSend && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onTogglePin();
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium hover:bg-muted"
          >
            {m.pinned ? (
              <PinOff size={13} className="shrink-0 text-primary" />
            ) : (
              <Pin size={13} className="shrink-0 text-muted-foreground" />
            )}
            <span>{m.pinned ? "Bỏ ghim khỏi kênh" : "Ghim tin nhắn"}</span>
          </button>
        )}

        {hasCopyableText && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCopyText?.();
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium hover:bg-muted"
          >
            <Copy size={13} className="shrink-0 text-muted-foreground" />
            <span>Sao chép văn bản</span>
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              if (!confirmingDelete) {
                setConfirmKey(activeKey);
                return;
              }
              onDelete();
              onClose();
            }}
            className={cn(
              "mt-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-semibold transition-colors",
              confirmingDelete
                ? "bg-destructive text-white hover:bg-destructive/90"
                : "text-destructive hover:bg-destructive/10"
            )}
          >
            <Trash2 size={13} className="shrink-0" />
            <span>{confirmingDelete ? "Bấm lần nữa để xoá hẳn" : "Xoá tin nhắn"}</span>
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
