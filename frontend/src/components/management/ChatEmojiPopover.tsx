"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Hand, Heart, Search, Smile, Sparkles, X } from "lucide-react";
import {
  EMOJI_CATALOG,
  type EmojiCategoryId,
  getRecentEmojis,
  recordRecentEmoji,
} from "@/forms/chat/chat-emojis";
import { cn } from "@/lib/utils";

const CATEGORY_TABS: Array<{
  id: EmojiCategoryId;
  label: string;
  Icon: typeof Smile;
}> = [
  { id: "recent", label: "Gần đây", Icon: Clock },
  { id: "smileys", label: "Cảm xúc", Icon: Smile },
  { id: "gestures", label: "Cử chỉ", Icon: Hand },
  { id: "symbols", label: "Biểu tượng", Icon: Heart },
  { id: "activities", label: "Hoạt động & CLB", Icon: Sparkles },
];

export function ChatEmojiPopover({
  open,
  onOpenChange,
  onSelectEmoji,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onSelectEmoji: (emoji: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<EmojiCategoryId>("smileys");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (ev: MouseEvent) => {
      if (!wrapRef.current?.contains(ev.target as Node)) {
        onOpenChange(false);
      }
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const normalizedQuery = query
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    const seen = new Set<string>();
    const hits: string[] = [];
    for (const group of Object.values(EMOJI_CATALOG)) {
      for (const entry of group) {
        if (
          !seen.has(entry.emoji) &&
          (entry.keywords.includes(normalizedQuery) || entry.emoji.includes(query.trim()))
        ) {
          seen.add(entry.emoji);
          hits.push(entry.emoji);
        }
      }
    }
    return hits;
  }, [normalizedQuery, query]);

  const handleToggleOpen = () => {
    if (!open) {
      const recents = getRecentEmojis();
      setRecentEmojis(recents);
      setActiveTab(recents.length > 0 ? "recent" : "smileys");
      setQuery("");
    }
    onOpenChange(!open);
  };

  const handlePick = (emoji: string) => {
    const updated = recordRecentEmoji(emoji);
    setRecentEmojis(updated);
    onSelectEmoji(emoji);
  };

  const currentTabEmojis =
    activeTab === "recent"
      ? recentEmojis
      : EMOJI_CATALOG[activeTab].map((entry) => entry.emoji);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Chọn biểu tượng cảm xúc"
        title="Biểu tượng cảm xúc"
        aria-expanded={open}
        onClick={handleToggleOpen}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          open && "bg-primary/10 text-primary"
        )}
      >
        <Smile size={17} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Bảng biểu tượng cảm xúc"
          className="absolute bottom-full left-0 z-30 mb-2 w-[304px] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        >
          <div className="border-b border-border/60 p-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/35 px-2.5 py-1">
              <Search size={13} className="shrink-0 text-muted-foreground" />
              <input
                type="text"
                maxLength={80}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm cảm xúc…"
                aria-label="Tìm cảm xúc"
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Xoá từ khoá"
                  onClick={() => setQuery("")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {!normalizedQuery && (
            <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-1.5 py-1">
              {CATEGORY_TABS.map(({ id, label, Icon }) => {
                if (id === "recent" && recentEmojis.length === 0) return null;
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    title={label}
                    aria-label={label}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      "flex flex-1 items-center justify-center rounded-md py-1 transition-colors",
                      active
                        ? "bg-primary/12 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>
          )}

          <div className="max-h-[216px] overflow-y-auto p-2">
            <div className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              {normalizedQuery
                ? "Kết quả tìm kiếm"
                : CATEGORY_TABS.find((t) => t.id === activeTab)?.label}
            </div>

            {(normalizedQuery ? searchResults : currentTabEmojis).length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Không tìm thấy biểu tượng phù hợp
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-0.5">
                {(normalizedQuery ? searchResults : currentTabEmojis).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handlePick(emoji)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-[19px] leading-none transition-transform hover:scale-120 hover:bg-primary/10 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
