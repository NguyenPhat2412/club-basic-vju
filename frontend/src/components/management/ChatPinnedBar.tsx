"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pin, PinOff, X } from "lucide-react";
import type { ChatMessage } from "@/lib/api";
import { formatChatTimeCompact } from "@/lib/chat-message-cache";
import { cn } from "@/lib/utils";

function pinnedSender(msg: ChatMessage): string {
  return msg.senderType === "AI_BOT" ? "Trợ lý AI" : msg.senderFullName || "Thành viên";
}

function pinnedSnippet(msg: ChatMessage): string {
  const text = msg.content?.replace(/\s+/g, " ").trim();
  if (text) return text;
  if (msg.documentName) return `📄 ${msg.documentName}`;
  const first = msg.attachments?.[0];
  if (first?.mediaKind === "IMAGE") return `🖼️ Hình ảnh (${msg.attachments?.length ?? 1})`;
  if (first?.mediaKind === "VIDEO") return `🎬 Video (${msg.attachments?.length ?? 1})`;
  if (first) return `📎 ${first.fileName}`;
  return "Tin nhắn đã ghim";
}

export function ChatPinnedBar({
  pinnedMessages,
  canPin,
  onJumpToMessage,
  onUnpin,
}: {
  pinnedMessages: ChatMessage[];
  canPin: boolean;
  onJumpToMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setExpanded(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  if (!pinnedMessages.length) return null;

  const newest = pinnedMessages[0]!;
  const extraCount = pinnedMessages.length - 1;

  return (
    <div
      ref={rootRef}
      data-testid="chat-pinned-bar"
      className="relative z-30 shrink-0 border-b border-border/50 bg-card/95 backdrop-blur-xs"
    >
      <div className="flex h-8 items-center gap-2 px-3.5 text-xs">
        <Pin size={12} className="shrink-0 rotate-45 text-primary" />
        <button
          type="button"
          onClick={() => onJumpToMessage(newest.id)}
          title="Nhấn để đi tới tin nhắn đã ghim"
          className="flex min-w-0 flex-1 items-center gap-1 text-left transition-colors hover:opacity-85"
        >
          <span className="shrink-0 text-[11px] font-bold text-primary">Đã ghim</span>
          <span className="shrink-0 text-muted-foreground">·</span>
          <span className="shrink-0 font-semibold text-foreground">{pinnedSender(newest)}:</span>
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
            {pinnedSnippet(newest)}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {extraCount > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex h-5 items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2 text-[10.5px] font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <span>+{extraCount} ghim</span>
              <ChevronDown size={11} className={cn("transition-transform", expanded && "rotate-180")} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label="Mở danh sách tin nhắn đã ghim"
              title="Chi tiết tin đã ghim"
              className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronDown size={12} className={cn("transition-transform", expanded && "rotate-180")} />
            </button>
          )}
          {canPin && extraCount === 0 && (
            <button
              type="button"
              onClick={() => onUnpin(newest.id)}
              aria-label="Bỏ ghim tin nhắn"
              title="Bỏ ghim"
              className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="absolute inset-x-0 top-full z-40 max-h-52 overflow-y-auto border-b border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border/50 px-3.5 py-1.5 text-[11px]">
            <span className="font-bold text-foreground">Tin nhắn đã ghim ({pinnedMessages.length})</span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="font-semibold text-muted-foreground hover:text-foreground"
            >
              Thu gọn
            </button>
          </div>
          {pinnedMessages.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 border-b border-border/40 px-3.5 py-1.5 text-xs last:border-b-0 hover:bg-muted/40"
            >
              <Pin size={11} className="shrink-0 rotate-45 text-primary/80" />
              <button
                type="button"
                onClick={() => {
                  setExpanded(false);
                  onJumpToMessage(item.id);
                }}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-semibold text-foreground">{pinnedSender(item)}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatChatTimeCompact(item.createdAt)}
                  </span>
                </div>
                <p className="truncate text-[11.5px] text-muted-foreground">{pinnedSnippet(item)}</p>
              </button>
              {canPin && (
                <button
                  type="button"
                  onClick={() => onUnpin(item.id)}
                  aria-label="Bỏ ghim"
                  title="Bỏ ghim"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <PinOff size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
