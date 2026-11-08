import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  minWidth = "min-w-[680px] lg:min-w-[820px]",
  ariaLabel,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  minWidth?: string;
  ariaLabel: string;
}) {
  const actionCol = columns.find((c) => c.key === "actions");
  const dataCols = columns.filter((c) => c.key !== "actions");
  const primaryCol = dataCols[0];
  const restCols = dataCols.slice(1);

  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 py-3 sm:px-6 sm:py-4 [scrollbar-gutter:stable]">
      {/* Giao diện Thẻ dọc (Card List) tự động trên Mobile (< 768px) */}
      <div role="list" aria-label={ariaLabel} className="space-y-3 md:hidden">
        {rows.map((row) => {
          const key = rowKey(row);
          return (
            <div
              key={key}
              role="listitem"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-colors",
                onRowClick && "cursor-pointer active:bg-slate-50"
              )}
            >
              {primaryCol && (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {primaryCol.header}
                    </p>
                    <div className="mt-1 text-xs text-slate-900">{primaryCol.render(row)}</div>
                  </div>
                  {actionCol && (
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {actionCol.render(row)}
                    </div>
                  )}
                </div>
              )}

              {restCols.length > 0 && (
                <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5 text-xs sm:grid-cols-2">
                  {restCols.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-start justify-between gap-3 sm:flex-col sm:justify-start sm:gap-0.5"
                    >
                      <dt className="shrink-0 text-[10.5px] font-semibold text-slate-400">{col.header}</dt>
                      <dd className="min-w-0 text-right text-xs text-slate-800 sm:text-left">
                        {col.render(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>

      {/* Giao diện Bảng đầy đủ trên iPad & Laptop (>= 768px) */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs md:block">
        <table
          aria-label={ariaLabel}
          className={cn("w-full border-collapse whitespace-normal text-left text-xs lg:whitespace-nowrap", minWidth)}
        >
          <thead className="sticky top-0 z-10 select-none border-b border-slate-200 bg-slate-50/90 text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500 backdrop-blur-xs">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn("h-11 whitespace-nowrap px-3.5 py-3 first:pl-4 last:pr-4 lg:px-4 lg:first:pl-5 lg:last:pr-5", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "h-14 text-xs text-slate-800 transition-colors hover:bg-slate-50/80",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3.5 py-2.5 first:pl-4 last:pr-4 lg:px-4 lg:first:pl-5 lg:last:pr-5", c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
