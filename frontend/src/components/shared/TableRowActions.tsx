"use client";

import { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RowAction = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function TableRowActions({ actions }: { actions: RowAction[] }) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e: MouseEvent) => e.stopPropagation()}>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          title={action.label}
          aria-label={action.label}
          disabled={action.disabled}
          onClick={action.onClick}
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-primary transition-colors disabled:opacity-50 [&_svg]:size-3.5",
            action.danger ? "text-destructive hover:bg-destructive/10" : "hover:bg-primary/10",
          )}
        >
          {action.icon}
        </button>
      ))}
    </div>
  );
}

export function UserIdentityCell({
  name,
  subtitle,
  fallbackLabel = "Thành viên",
}: {
  name?: string | null;
  subtitle?: string | null;
  fallbackLabel?: string;
}) {
  const displayName = name?.trim() || fallbackLabel;
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
        {displayName.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="max-w-56 truncate font-bold text-foreground">{displayName}</p>
        {subtitle && <p className="max-w-56 truncate font-mono text-[10.5px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
