"use client";
import Link from "next/link";
import { Fragment, ReactNode } from "react";
import { ChevronRight, Plus, RefreshCw, Search, X } from "lucide-react";
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
  return (
    <div className="relative z-30 flex min-h-14 shrink-0 select-none flex-col justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 text-xs backdrop-blur-xs sm:px-6 xl:flex-row xl:items-center">
      <nav aria-label="Breadcrumb" className="flex min-w-0 shrink-0 flex-wrap items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && <ChevronRight size={13} className="shrink-0 text-muted-foreground/50" />}
              {last ? (
                <span className="truncate text-[13px] font-bold text-primary">{crumb.label}</span>
              ) : crumb.href ? (
                <Link
                  href={crumb.href}
                  className="truncate text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate text-[12.5px] font-medium text-muted-foreground">
                  {crumb.label}
                </span>
              )}
            </Fragment>
          );
        })}
        {titleBadge && <span className="ml-1">{titleBadge}</span>}
      </nav>
      <div className="flex min-w-0 flex-wrap items-center gap-2 xl:flex-nowrap xl:justify-end">
        {search && (
          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? "Tìm kiếm…"}
              aria-label={search.placeholder ?? "Tìm kiếm"}
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-7 text-xs shadow-2xs transition-colors focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
            {search.value && (
              <button
                type="button"
                aria-label="Xoá tìm kiếm"
                onClick={() => search.onChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
            className="size-9 rounded-lg border-border/70 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
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
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-muted/60 p-1">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          onClick={() => onChange(option.value)}
          className={
            option.value === value
              ? "h-7 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground shadow-2xs transition-all"
              : "h-7 rounded-md px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
