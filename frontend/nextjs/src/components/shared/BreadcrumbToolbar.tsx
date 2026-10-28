"use client";
import { ReactNode } from "react";
import { Plus, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Crumb = { label: string; href?: string };

type Props = {
  crumbs: Crumb[];
  titleBadge?: ReactNode;
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  extraActions?: ReactNode;
  onRefresh?: () => void;
  addLabel?: string;
  onAdd?: () => void;
  addDisabled?: boolean;
};

export function BreadcrumbToolbar({
  crumbs,
  titleBadge,
  search,
  extraActions,
  onRefresh,
  addLabel,
  onAdd,
  addDisabled,
}: Props) {
  const pageTitle = crumbs[crumbs.length - 1]?.label ?? "";

  return (
    <div className="relative z-30 flex min-h-13 shrink-0 select-none flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-4 py-2.5 text-xs sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-4 w-1 shrink-0 rounded-full bg-primary" />
        <span className="truncate text-[13.5px] font-bold text-slate-900">{pageTitle}</span>
        {titleBadge && <span className="shrink-0">{titleBadge}</span>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        {search && (
          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
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
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
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
            title="Tải lại dữ liệu"
            onClick={onRefresh}
            className="size-9 rounded-lg border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:bg-primary/8 hover:text-primary"
          >
            <RefreshCw size={14} />
          </Button>
        )}
        {onAdd && (
          <Button
            onClick={onAdd}
            disabled={addDisabled}
            className="h-9 gap-1.5 rounded-lg px-3.5 text-xs font-bold shadow-2xs"
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
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          onClick={() => onChange(option.value)}
          className={
            option.value === value
              ? "h-7 rounded-md bg-white px-3 text-xs font-bold text-primary shadow-2xs ring-1 ring-slate-200/80 transition-all"
              : "h-7 rounded-md px-3 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
