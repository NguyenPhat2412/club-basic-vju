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
  floating = false,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onSelectEmoji: (emoji: string) => void;
  floating?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<EmojiCategoryId>("smileys");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (ev: MouseEvent) => {
      if (!wrapRef.current?.contains(ev.target as Node)) onOpenChange(false);
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
      setActiveTab("smileys");
      setQuery("");
    }
    onOpenChange(!open);
  };

  const handlePick = (emoji: string) => {
    setRecentEmojis(recordRecentEmoji(emoji));
    onSelectEmoji(emoji);
  };

  const currentTabEmojis =
    activeTab === "recent"
      ? recentEmojis
      : EMOJI_CATALOG[activeTab].map((entry) => entry.emoji);

  const showRecentSection = !normalizedQuery && activeTab === "smileys" && recentEmojis.length > 0;

  return (
    <div ref={wrapRef} className={floating ? "static" : "relative"}>
      <button
        type="button"
        aria-label="Chọn biểu tượng cảm xúc"
        title="Biểu tượng cảm xúc"
        aria-expanded={open}
        onClick={handleToggleOpen}
        className={cn(
          "grid place-items-center transition-colors",
          floating
            ? cn(
                "mb-1 size-6.5 shrink-0 rounded-full",
                open ? "bg-primary/15 text-primary" : "text-primary/80 hover:bg-primary/10 hover:text-primary",
              )
            : cn(
                "h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                open && "bg-primary/10 text-primary",
              ),
        )}
      >
        <Smile size={floating ? 16 : 17} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Bảng biểu tượng cảm xúc"
          className={cn(
            "tg-pop-in absolute bottom-full z-40 mb-1.5 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl",
            floating ? "inset-x-2 w-auto" : "left-0 w-[304px]",
          )}
        >
          <div className="p-2 pb-1.5">
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/90 px-2.5 py-1 focus-within:border-primary/40 focus-within:bg-white">
              <Search size={13} className="shrink-0 text-slate-400" />
              <input
                type="text"
                maxLength={80}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm cảm xúc…"
                aria-label="Tìm cảm xúc"
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Xoá từ khoá"
                  onClick={() => setQuery("")}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[212px] space-y-2 overflow-y-auto px-2 pb-2">
            {showRecentSection && (
              <div>
                <div className="mb-1 px-1 text-[11px] font-semibold text-slate-500">Gần đây</div>
                <div className="grid grid-cols-8 gap-0.5">
                  {recentEmojis.slice(0, 8).map((emoji) => (
                    <button
                      key={`recent-${emoji}`}
                      type="button"
                      onClick={() => handlePick(emoji)}
                      className="grid aspect-square place-items-center rounded-lg text-[19px] leading-none transition-transform hover:scale-120 hover:bg-primary/10 active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-1 px-1 text-[11px] font-semibold text-slate-500">
                {normalizedQuery
                  ? "Kết quả tìm kiếm"
                  : CATEGORY_TABS.find((t) => t.id === activeTab)?.label}
              </div>

              {(normalizedQuery ? searchResults : currentTabEmojis).length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Không tìm thấy biểu tượng phù hợp
                </div>
              ) : (
                <div className="grid grid-cols-8 gap-0.5">
                  {(normalizedQuery ? searchResults : currentTabEmojis).map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handlePick(emoji)}
                      className="grid aspect-square place-items-center rounded-lg text-[19px] leading-none transition-transform hover:scale-120 hover:bg-primary/10 active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!normalizedQuery && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-1.5 py-1">
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
                      "flex flex-1 items-center justify-center rounded-lg py-1.5 transition-colors",
                      active
                        ? "bg-primary/12 text-primary"
                        : "text-slate-500 hover:bg-slate-200/60 hover:text-slate-900",
                    )}
                  >
                    <Icon size={15} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
