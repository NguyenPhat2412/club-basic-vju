import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = { key: string; header: string; className?: string; render: (row: T) => ReactNode };

export function DataTable<T>({ columns, rows, rowKey, onRowClick, minWidth = "min-w-[960px]", ariaLabel }: {
  columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; onRowClick?: (row: T) => void; minWidth?: string; ariaLabel: string;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
      <table aria-label={ariaLabel} className={cn("w-full border-collapse whitespace-nowrap text-left text-xs", minWidth)}>
        <thead className="sticky top-0 z-10 h-11 select-none border-b border-border bg-muted/95 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground backdrop-blur-xs">
          <tr>{columns.map((c) => <th key={c.key} className={cn("h-11 px-3.5 py-3", c.className)}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((row) => (
            <tr key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn("h-14 text-xs transition-colors hover:bg-muted/40", onRowClick && "cursor-pointer")}>
              {columns.map((c) => <td key={c.key} className={cn("px-3.5 py-2", c.className)}>{c.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
