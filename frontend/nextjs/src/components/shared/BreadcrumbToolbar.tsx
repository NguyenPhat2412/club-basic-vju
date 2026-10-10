"use client";
import Link from "next/link";
import { Fragment, ReactNode } from "react";
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

export function BreadcrumbToolbar({ crumbs, titleBadge, search, extraActions, onRefresh, addLabel, onAdd, addDisabled }: Props) {
  return (
    <div className="relative z-30 flex min-h-11 shrink-0 select-none flex-col justify-between gap-2.5 border-b border-border bg-card/60 px-4 py-2 text-xs backdrop-blur-xs sm:px-6 xl:flex-row xl:items-center">
      <nav aria-label="Breadcrumb" className="flex min-w-0 shrink-0 items-center gap-2 whitespace-nowrap">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.label}>
              {index > 0 && <span className="text-[10px] text-muted-foreground/60">&gt;</span>}
              {last ? <span className="text-[12.5px] font-bold text-primary">{crumb.label}</span>
                : crumb.href ? <Link href={crumb.href} className="text-[12.5px] text-muted-foreground hover:text-foreground">{crumb.label}</Link>
                  : <span className="text-[12.5px] text-muted-foreground">{crumb.label}</span>}
            </Fragment>
          );
        })}
        {titleBadge}
      </nav>
      <div className="flex min-w-0 flex-wrap items-center gap-2 xl:flex-nowrap xl:justify-end">
        {search && (
          <div className="relative w-full sm:w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search.value} onChange={(e) => search.onChange(e.target.value)} placeholder={search.placeholder ?? "Tìm kiếm…"}
              aria-label={search.placeholder ?? "Tìm kiếm"}
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-7 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-primary" />
            {search.value && <button aria-label="Xoá tìm kiếm" onClick={() => search.onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={13} /></button>}
          </div>
        )}
        {extraActions}
        {onRefresh && (
          <Button variant="outline" size="icon" aria-label="Tải lại" title="Tải lại" onClick={onRefresh}
            className="rounded-lg border-border/60 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary">
            <RefreshCw size={15} />
          </Button>
        )}
        {onAdd && (
          <Button onClick={onAdd} disabled={addDisabled} className="h-10 gap-1.5 rounded-lg px-2.5 text-xs font-bold sm:gap-2 sm:px-4">
            <Plus size={16} /> {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function SegmentedTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/60 p-1">
      {options.map((option) => (
        <button key={option.value} onClick={() => onChange(option.value)}
          className={option.value === value ? "h-8 rounded-md bg-primary px-3 text-xs font-black text-primary-foreground shadow-xs" : "h-8 rounded-md px-3 text-xs font-bold text-muted-foreground hover:text-foreground"}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
