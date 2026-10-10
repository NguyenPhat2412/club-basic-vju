"use client";
import { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RowAction = { icon: ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean };

export function TableRowActions({ actions }: { actions: RowAction[] }) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e: MouseEvent) => e.stopPropagation()}>
      {actions.map((action) => (
        <button key={action.label} type="button" title={action.label} aria-label={action.label} disabled={action.disabled} onClick={action.onClick}
          className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-primary transition-colors disabled:opacity-50 [&_svg]:size-3.5",
            action.danger ? "text-destructive hover:bg-destructive/10" : "hover:bg-primary/10")}>
          {action.icon}
        </button>
      ))}
    </div>
  );
}
