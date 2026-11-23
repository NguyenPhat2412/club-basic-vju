"use client";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Plus, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

type Props = {
  crumbs: Crumb[];
  titleBadge?: ReactNode;
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  extraActions?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  addLabel?: string;
  onAdd?: () => void;
  addDisabled?: boolean;
  compact?: boolean;
};

export function BreadcrumbToolbar({
  crumbs,
  titleBadge,
  search,
  extraActions,
  onRefresh,
  refreshing = false,
  addLabel,
  onAdd,
  addDisabled,
  compact = false,
}: Props) {
  const pageTitle = crumbs[crumbs.length - 1]?.label ?? "";
  const [spinning, setSpinning] = useState(false);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  const isSpinning = refreshing || spinning;

  const handleRefresh = () => {
    if (!onRefresh || refreshing || spinning) return;
    setSpinning(true);
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    spinTimerRef.current = setTimeout(() => setSpinning(false), 450);
    onRefresh();
  };

  return (
    <div
      className={cn(
        "relative z-30 flex shrink-0 select-none flex-wrap items-center justify-between gap-2 border-b border-border bg-white text-xs",
        compact ? "min-h-10 px-3 py-1 sm:px-4" : "min-h-13 gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-6"
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-4 w-1 shrink-0 rounded-full bg-primary" />
        <span className="truncate text-[13.5px] font-bold text-slate-900">{pageTitle}</span>
        {titleBadge && <span className="shrink-0">{titleBadge}</span>}
      </div>
      <div
        className={cn(
          "flex min-w-0 max-w-full flex-wrap items-center gap-2",
          search
            ? "w-full justify-start lg:ml-auto lg:w-auto lg:justify-end"
            : "w-full justify-start sm:ml-auto sm:w-auto sm:justify-end",
        )}
      >
        {search && (
          <div className="relative min-w-0 w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              maxLength={200}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? "Tìm kiếm…"}
              aria-label={search.placeholder ?? "Tìm kiếm"}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-7 text-xs text-slate-900 shadow-2xs transition-colors focus:border-primary focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
            {search.value && (
              <button
                type="button"
                aria-label="Xoá tìm kiếm"
                onClick={() => search.onChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}
        {extraActions}
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            aria-label="Tải lại"
            aria-busy={isSpinning}
            disabled={refreshing}
            title="Tải lại dữ liệu"
            onClick={handleRefresh}
            className={cn(
              "size-9 shrink-0 rounded-lg border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:bg-primary/8 hover:text-primary",
              isSpinning && "border-primary/30 bg-primary/8 text-primary",
            )}
          >
            <RefreshCw size={14} className={cn(isSpinning && "animate-spin text-primary")} />
          </Button>
        )}
        {onAdd && (
          <Button
            onClick={onAdd}
            disabled={addDisabled}
            className="h-9 shrink-0 gap-1.5 rounded-lg px-3.5 text-xs font-bold shadow-2xs"
          >
            <Plus size={15} /> {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex max-w-full shrink-0 flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={
            option.value === value
              ? "h-7 flex-1 shrink-0 whitespace-nowrap rounded-md bg-white px-3 text-xs font-bold text-primary shadow-2xs ring-1 ring-slate-200/80 transition-all sm:flex-initial"
              : "h-7 flex-1 shrink-0 whitespace-nowrap rounded-md px-3 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 sm:flex-initial"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
