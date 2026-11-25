"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, SmilePlus } from "lucide-react";
import {
  CHAT_ALL_REACTIONS,
  CHAT_QUICK_REACTIONS,
  recordRecentEmoji,
} from "@/forms/chat/chat-emojis";
import type { ChatReactionSummary } from "@/types/chat/chat.types";
import { cn } from "@/lib/utils";

function miniInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "TV";
  return parts.length === 1
    ? parts[0]!.slice(0, 2).toUpperCase()
    : `${parts[0]![0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}

export function ChatReactionTrigger({
  isMine,
  myEmojis,
  onToggleReaction,
}: {
  isMine: boolean;
  myEmojis: Set<string>;
  onToggleReaction: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (ev: MouseEvent) => {
      if (!wrapRef.current?.contains(ev.target as Node)) {
        setOpen(false);
        setExpanded(false);
      }
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setOpen(false);
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handlePick = (emoji: string) => {
    recordRecentEmoji(emoji);
    onToggleReaction(emoji);
    setOpen(false);
    setExpanded(false);
  };

  return (
    <div ref={wrapRef} className={cn("relative", open && "opacity-100")}>
      <button
        type="button"
        title="Thả cảm xúc"
        aria-label="Thả cảm xúc"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (open) setExpanded(false);
        }}
        className={cn(
          "grid h-6 w-6 place-items-center rounded-full transition-colors hover:bg-muted",
          open ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <SmilePlus size={12.5} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Thanh cảm xúc nhanh"
          className={cn(
            "tg-pop-in absolute bottom-full z-30 mb-1.5 border border-border/80 bg-card/98 shadow-lg backdrop-blur-xs",
            expanded ? "w-[224px] rounded-2xl p-1.5" : "rounded-full px-1.5 py-1",
            isMine ? "right-0" : "left-0"
          )}
        >
          {!expanded ? (
            <div className="flex items-center gap-0.5">
              {CHAT_QUICK_REACTIONS.map((emoji) => {
                const active = myEmojis.has(emoji);
                return (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={`Thả ${emoji}`}
                    onClick={() => handlePick(emoji)}
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-full text-[16px] leading-none transition-transform hover:-translate-y-0.5 hover:scale-125 hover:bg-muted",
                      active && "bg-primary/15 ring-1 ring-primary/40"
                    )}
                  >
                    {emoji}
                  </button>
                );
              })}
              <button
                type="button"
                title="Mở rộng cảm xúc"
                aria-label="Mở rộng cảm xúc"
                onClick={() => setExpanded(true)}
                className="ml-0.5 grid h-6 w-6 place-items-center rounded-full bg-muted/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronDown size={13} />
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-1 flex items-center justify-between px-1 text-[10.5px] font-semibold text-muted-foreground">
                <span>Chọn cảm xúc</span>
                <button
                  type="button"
                  title="Thu gọn"
                  aria-label="Thu gọn"
                  onClick={() => setExpanded(false)}
                  className="grid h-5 w-5 place-items-center rounded-full hover:bg-muted hover:text-foreground"
                >
                  <ChevronUp size={12} />
                </button>
              </div>
              <div className="grid grid-cols-6 gap-0.5">
                {CHAT_ALL_REACTIONS.map((emoji) => {
                  const active = myEmojis.has(emoji);
                  return (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`Thả ${emoji}`}
                      onClick={() => handlePick(emoji)}
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-lg text-[17px] leading-none transition-transform hover:scale-120 hover:bg-muted",
                        active && "bg-primary/15 ring-1 ring-primary/40"
                      )}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatReactionPills({
  reactions,
  currentUserId,
  isMine,
  canReact,
  onToggleReaction,
}: {
  reactions: ChatReactionSummary[];
  currentUserId?: string;
  isMine: boolean;
  canReact: boolean;
  onToggleReaction: (emoji: string) => void;
}) {
  if (!reactions.length) return null;

  return (
    <div
      className={cn(
        "mt-1 flex max-w-full flex-wrap items-center gap-1 px-0.5",
        isMine ? "justify-end" : "justify-start"
      )}
    >
      {reactions.map((r) => {
        const reactedByMe = Boolean(currentUserId && r.reactorIds?.includes(currentUserId));
        const names = (r.reactorNames ?? []).filter(Boolean);
        const extra = Math.max(0, r.count - names.length);
        const whoText = names.length
          ? `${names.join(", ")}${extra > 0 ? ` (+${extra})` : ""}`
          : `${r.count}`;
        const tooltip = `Đã thả ${r.emoji}: ${whoText}`;
        const showMiniAvatars = r.count <= 2 && names.length > 0;

        return (
          <button
            key={r.emoji}
            type="button"
            disabled={!canReact}
            title={tooltip}
            aria-pressed={reactedByMe}
            onClick={() => {
              if (!canReact) return;
              recordRecentEmoji(r.emoji);
              onToggleReaction(r.emoji);
            }}
            className={cn(
              "tg-react-pop inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] leading-none transition-transform duration-150",
              canReact && "hover:-translate-y-0.5 hover:scale-105 active:scale-90",
              reactedByMe
                ? "border-primary/45 bg-primary/14 font-semibold text-primary shadow-2xs"
                : "border-border/75 bg-card text-foreground hover:border-primary/30 hover:bg-muted/70",
              !canReact && "cursor-default opacity-90"
            )}
          >
            <span className="text-[13.5px] leading-none">{r.emoji}</span>
            {showMiniAvatars && (
              <span className="inline-flex -space-x-1">
                {names.slice(0, 2).map((name, idx) => (
                  <span
                    key={`${name}-${idx}`}
                    className={cn(
                      "grid h-3.5 w-3.5 place-items-center rounded-full text-[7.5px] font-bold ring-1 ring-card",
                      reactedByMe ? "bg-primary text-primary-foreground" : "bg-primary/14 text-primary"
                    )}
                  >
                    {miniInitials(name)}
                  </span>
                ))}
              </span>
            )}
            <span className="tabular-nums text-[11px]">{r.count}</span>
          </button>
        );
      })}
    </div>
  );
}
