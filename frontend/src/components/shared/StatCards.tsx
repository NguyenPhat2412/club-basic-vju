"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StatKpiCardItem {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: LucideIcon;
  href?: string;
  accent?: string;
}

export function StatKpiCard({ item }: { item: StatKpiCardItem }) {
  const Icon = item.icon;
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground">{item.label}</span>
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg border",
            item.accent ?? "border-primary/20 bg-primary/8 text-primary",
          )}
        >
          <Icon size={15} />
        </span>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">{item.value}</p>
        {item.sub && (
          <p className="mt-1 truncate text-[11px] text-muted-foreground group-hover:text-foreground/80">
            {item.sub}
          </p>
        )}
      </div>
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4">
      {content}
    </div>
  );
}

export function StatKpiGrid({
  items,
  columnsClassName = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  ariaLabel = "Chỉ số tổng quan",
}: {
  items: StatKpiCardItem[];
  columnsClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <section aria-label={ariaLabel} className={cn("grid gap-3", columnsClassName)}>
      {items.map((item) => (
        <StatKpiCard key={item.label} item={item} />
      ))}
    </section>
  );
}

export interface StatSummaryBoxItem {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  valueClassName?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  href?: string;
}

export function StatSummaryStrip({
  items,
  columnsClassName = "grid-cols-2 lg:grid-cols-4",
  className,
}: {
  items: StatSummaryBoxItem[];
  columnsClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3", columnsClassName, className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const inner = (
          <>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-muted-foreground">{item.label}</p>
              <p className={cn("mt-1 font-mono text-xl font-extrabold text-foreground tabular-nums", item.valueClassName)}>
                {item.value}
              </p>
              {item.sub && <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{item.sub}</p>}
            </div>
            {Icon && (
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  item.iconClassName ?? "bg-primary/10 text-primary",
                )}
              >
                <Icon size={17} />
              </span>
            )}
          </>
        );
        if (item.href) {
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-2xs transition-colors hover:border-primary/40"
            >
              {inner}
            </Link>
          );
        }
        return (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-2xs"
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
