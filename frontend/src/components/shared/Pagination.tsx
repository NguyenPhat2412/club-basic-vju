"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { getPresentationLocale } from "@/i18n/config";
import { translateUiText } from "@/i18n/translator";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export function Pagination({
  offset,
  limit,
  total,
  onOffset,
  onLimit,
}: {
  offset: number;
  limit: number;
  total: number;
  onOffset: (offset: number) => void;
  onLimit?: (limit: number) => void;
}) {
  const locale = getPresentationLocale();
  const tr = (text: string) => translateUiText(text, locale);
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);
  const [jumpInput, setJumpInput] = useState("");

  const commitJump = () => {
    const parsed = Number.parseInt(jumpInput.trim(), 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= pages) {
      onOffset((parsed - 1) * limit);
      setJumpInput("");
    }
  };

  return (
    <div className="mt-auto shrink-0 border-t border-border bg-card px-4 py-2 pr-14 sm:px-6 sm:pr-16">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            {tr("Hiển thị")}{" "}
            <b className="font-mono font-bold text-foreground">
              {total ? offset + 1 : 0}–{Math.min(offset + limit, total)}
            </b>{" "}
            {tr("trong tổng số")}{" "}
            <b className="font-mono font-bold text-foreground">{total}</b> {tr("bản ghi")}
            <span className="mx-1.5 text-border">|</span>
            {tr(`Trang ${page} / ${pages}`)}
          </span>

          {onLimit && (
            <label className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-2 py-0.5 text-[11px]">
              <span>{tr("Số dòng:")}</span>
              <select
                aria-label={tr("Số dòng mỗi trang")}
                value={limit}
                onChange={(e) => {
                  const nextLimit = Number(e.target.value);
                  onLimit(nextLimit);
                  onOffset(0);
                }}
                className="bg-transparent font-mono font-bold text-foreground outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {pages > 5 && (
            <button
              type="button"
              aria-label={tr("Trang đầu")}
              title={tr("Trang đầu")}
              disabled={page === 1}
              onClick={() => onOffset(0)}
              className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-35"
            >
              <ChevronsLeft size={13} />
            </button>
          )}
          <button
            type="button"
            aria-label={tr("Trang trước")}
            disabled={page === 1}
            onClick={() => onOffset(Math.max(0, offset - limit))}
            className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-35"
          >
            <ChevronLeft size={13} />
          </button>

          {numbers.map((n) => (
            <button
              type="button"
              key={n}
              aria-label={`${tr("Trang")} ${n}`}
              aria-current={n === page ? "page" : undefined}
              onClick={() => onOffset((n - 1) * limit)}
              className={cn(
                "size-7 rounded-lg font-mono",
                n === page
                  ? "bg-primary font-bold text-primary-foreground shadow-xs"
                  : "hover:bg-muted"
              )}
            >
              {n}
            </button>
          ))}

          <button
            type="button"
            aria-label={tr("Trang sau")}
            disabled={page === pages}
            onClick={() => onOffset(offset + limit)}
            className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-35"
          >
            <ChevronRight size={13} />
          </button>
          {pages > 5 && (
            <>
              <button
                type="button"
                aria-label={tr("Trang cuối")}
                title={tr("Trang cuối")}
                disabled={page === pages}
                onClick={() => onOffset((pages - 1) * limit)}
                className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-35"
              >
                <ChevronsRight size={13} />
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commitJump();
                }}
                className="ml-1 inline-flex items-center gap-1"
              >
                <input
                  type="number"
                  min={1}
                  max={pages}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  placeholder="#"
                  aria-label={tr("Đi tới trang")}
                  className="h-7 w-12 rounded-lg border border-border bg-background px-1.5 text-center font-mono text-[11px] text-foreground outline-none focus:border-primary"
                />
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
