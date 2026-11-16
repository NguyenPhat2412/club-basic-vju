import { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

function handleRowKeyDown<T>(e: KeyboardEvent<HTMLElement>, row: T, onRowClick?: (row: T) => void) {
  if (!onRowClick || e.target !== e.currentTarget) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onRowClick(row);
  }
}

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
  minWidth = "min-w-full",
  ariaLabel,
  alwaysTable = false,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  minWidth?: string;
  ariaLabel: string;
  alwaysTable?: boolean;
}) {
  const actionCol = columns.find((c) => c.key === "actions");
  const dataCols = columns.filter((c) => c.key !== "actions");
  const primaryCol = dataCols[0];
  const restCols = dataCols.slice(1);

  return (
    <div className="min-h-0 w-full min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 [scrollbar-gutter:stable]">
      {/* Giao diện Thẻ (Card Grid) tự động trên Mobile, iPad & Split-screen (< 1280px) khi không bật alwaysTable */}
      {!alwaysTable && (
      <div role="list" aria-label={ariaLabel} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
        {rows.map((row) => {
          const key = rowKey(row);
          return (
            <div
              key={key}
              role="listitem"
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (e) => handleRowKeyDown(e, row, onRowClick) : undefined}
              className={cn(
                "flex min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                onRowClick && "cursor-pointer active:bg-slate-50"
              )}
            >
              <div className="min-w-0">
                {primaryCol && (
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {primaryCol.header}
                    </p>
                    <div className="mt-1 min-w-0 text-xs text-slate-900">{primaryCol.render(row)}</div>
                  </div>
                )}

                {restCols.length > 0 && (
                  <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5 text-xs sm:grid-cols-2">
                    {restCols.map((col) => (
                      <div
                        key={col.key}
                        className="flex min-w-0 items-start justify-between gap-3 sm:flex-col sm:justify-start sm:gap-0.5"
                      >
                        <dt className="shrink-0 text-[10.5px] font-semibold text-slate-500">{col.header}</dt>
                        <dd className="min-w-0 text-right text-xs text-slate-800 sm:text-left">
                          {col.render(row)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>

              {actionCol && (
                <div
                  className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                    {actionCol.header}
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {actionCol.render(row)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Giao diện Bảng đầy đủ */}
      <div
        className={cn(
          "w-full max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs",
          alwaysTable ? "block" : "hidden xl:block"
        )}
      >
        <table
          aria-label={ariaLabel}
          className={cn("w-full border-collapse whitespace-normal text-left text-xs", minWidth)}
        >
          <thead className="sticky top-0 z-10 select-none border-b border-slate-200 bg-slate-50/90 text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500 backdrop-blur-xs">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    alwaysTable
                      ? "h-10 whitespace-nowrap px-2.5 py-2.5 first:pl-3.5 last:pr-3.5"
                      : "h-11 whitespace-nowrap px-3.5 py-3 first:pl-4 last:pr-4 lg:px-4 lg:first:pl-5 lg:last:pr-5",
                    c.key === "actions" && "sticky right-0 z-20 bg-slate-50/95",
                    c.className
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => handleRowKeyDown(e, row, onRowClick) : undefined}
                className={cn(
                  "group h-14 text-xs text-slate-800 transition-colors hover:bg-slate-50/80 focus-visible:bg-slate-50 focus-visible:outline-hidden",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      alwaysTable
                        ? "px-2.5 py-2.5 first:pl-3.5 last:pr-3.5"
                        : "px-3.5 py-2.5 first:pl-4 last:pr-4 lg:px-4 lg:first:pl-5 lg:last:pr-5",
                      c.key === "actions" &&
                        "sticky right-0 bg-white/95 backdrop-blur-xs group-hover:bg-slate-50/95",
                      c.className
                    )}
                  >
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
