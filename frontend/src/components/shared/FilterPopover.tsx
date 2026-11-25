"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, FilterX, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterPopover({
  activeCount = 0,
  onClear,
  label = "Bộ lọc",
  title = "Bộ lọc hiển thị",
  widthClass = "w-[min(320px,calc(100vw-24px))]",
  children,
}: {
  activeCount?: number;
  onClear?: () => void;
  label?: string;
  title?: string;
  widthClass?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const panelWidth = Math.min(320, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12));
      const top = Math.min(rect.bottom + 6, window.innerHeight - 120);
      setPos({ top, left });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScrollOrResize = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = Math.min(320, window.innerWidth - 24);
      setPos({
        top: Math.min(rect.bottom + 6, window.innerHeight - 120),
        left: Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12)),
      });
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
          activeCount > 0 || open
            ? "border-primary/40 bg-primary/8 text-primary"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
        )}
      >
        <SlidersHorizontal size={13} className="shrink-0" />
        <span>{label}</span>
        {activeCount > 0 && (
          <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 py-0 text-[10px] font-bold leading-4 text-primary-foreground">
            {activeCount}
          </span>
        )}
        <ChevronDown size={13} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={title}
            style={{ top: pos.top, left: pos.left }}
            className={cn(
              "fixed z-[80] max-h-[calc(100svh-96px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg",
              widthClass,
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">{title}</span>
              {activeCount > 0 && onClear && (
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/8"
                >
                  <FilterX size={12} /> Xoá lọc
                </button>
              )}
            </div>
            <div className="grid gap-2.5">{children}</div>
          </div>,
          document.body,
        )}
    </>
  );
}
