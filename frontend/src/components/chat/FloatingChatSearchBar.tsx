"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

export function FloatingChatSearchBar({
  open,
  query,
  onQueryChange,
  matchCount,
  activeIndex,
  onPrev,
  onNext,
  onClose,
}: {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  matchCount: number;
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  if (!open) return null;

  const hasQuery = Boolean(query.trim());

  return (
    <div className="relative z-30 flex items-center gap-1 border-b border-slate-200 bg-slate-50/95 px-2.5 py-1.5">
      <div className="relative min-w-0 flex-1">
        <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          maxLength={120}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            } else if (e.key === "Enter" && matchCount > 0) {
              e.preventDefault();
              if (e.shiftKey) onPrev();
              else onNext();
            }
          }}
          placeholder="Tìm tin nhắn trong kênh…"
          aria-label="Tìm tin nhắn trong kênh"
          className="h-7 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary/50"
        />
      </div>

      {hasQuery && (
        <span className="shrink-0 whitespace-nowrap px-1 text-[10.5px] font-semibold tabular-nums text-slate-500">
          {matchCount > 0 ? `${activeIndex + 1}/${matchCount} kết quả` : "Không có kết quả"}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          disabled={matchCount === 0}
          title="Kết quả trước"
          aria-label="Kết quả trước"
          onClick={onPrev}
          className="flex size-6 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 disabled:opacity-35"
        >
          <ChevronUp size={13} />
        </button>
        <button
          type="button"
          disabled={matchCount === 0}
          title="Kết quả tiếp theo"
          aria-label="Kết quả tiếp theo"
          onClick={onNext}
          className="flex size-6 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 disabled:opacity-35"
        >
          <ChevronDown size={13} />
        </button>
        <button
          type="button"
          title="Đóng tìm kiếm"
          aria-label="Đóng tìm kiếm"
          onClick={onClose}
          className="flex size-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/80 hover:text-slate-900"
        >
          <X size={12.5} />
        </button>
      </div>
    </div>
  );
}
