"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({ offset, limit, total, onOffset }: { offset: number; limit: number; total: number; onOffset: (offset: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);
  return (
    <div className="mt-auto shrink-0 border-t border-border bg-card px-4 py-2 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 px-2 py-1.5 text-xs text-muted-foreground">
        <span>
          Hiển thị <b className="font-mono font-bold text-foreground">{total ? offset + 1 : 0}–{Math.min(offset + limit, total)}</b> trong tổng số{" "}
          <b className="font-mono font-bold text-foreground">{total}</b> bản ghi <span className="mx-2 text-border">|</span> Trang {page} / {pages}
        </span>
        <div className="flex items-center gap-1">
          <button aria-label="Trang trước" disabled={page === 1} onClick={() => onOffset(offset - limit)} className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40"><ChevronLeft size={13} /></button>
          {numbers.map((n) => (
            <button key={n} onClick={() => onOffset((n - 1) * limit)}
              className={cn("size-7 rounded-lg font-mono", n === page ? "bg-primary font-bold text-primary-foreground shadow-xs" : "hover:bg-muted")}>{n}</button>
          ))}
          <button aria-label="Trang sau" disabled={page === pages} onClick={() => onOffset(offset + limit)} className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40"><ChevronRight size={13} /></button>
        </div>
      </div>
    </div>
  );
}
