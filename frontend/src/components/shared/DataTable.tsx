"use client";

import { KeyboardEvent, ReactNode, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
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
  sortValue?: (row: T) => string | number | null | undefined;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  minWidth = "min-w-full",
  ariaLabel,
  alwaysTable = true,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  minWidth?: string;
  ariaLabel: string;
  alwaysTable?: boolean;
}) {
  const [sortState, setSortState] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sortState) return rows;
    const col = columns.find((c) => c.key === sortState.key);
    if (!col?.sortValue) return rows;
    const factor = sortState.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * factor;
      }
      return String(va).localeCompare(String(vb), "vi", { numeric: true, sensitivity: "base" }) * factor;
    });
  }, [columns, rows, sortState]);

  const toggleSort = (key: string) => {
    setSortState((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const actionCol = columns.find((c) => c.key === "actions");
  const dataCols = columns.filter((c) => c.key !== "actions");
  const primaryCol = dataCols[0];
  const restCols = dataCols.slice(1);

  return (
    <div className="min-h-0 w-full min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto px-4 py-3 sm:px-6 sm:py-3.5 [scrollbar-gutter:stable]">
      {!alwaysTable && (
        <div role="list" aria-label={ariaLabel} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
          {sortedRows.map((row) => {
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
          <thead className="sticky top-0 z-10 select-none border-b border-slate-200 bg-slate-50/95 text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-500 backdrop-blur-xs">
            <tr>
              {columns.map((c) => {
                const isSorted = sortState?.key === c.key;
                return (
                  <th
                    key={c.key}
                    aria-sort={
                      c.sortValue
                        ? isSorted
                          ? sortState.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                    className={cn(
                      "h-10 whitespace-nowrap px-2.5 py-2.5 first:pl-3.5 last:pr-3.5",
                      c.key === "actions" && "sticky right-0 z-20 bg-slate-50/95",
                      c.className
                    )}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-1 py-0.5 -mx-1 transition-colors hover:bg-slate-200/60 hover:text-slate-900",
                          isSorted && "text-primary"
                        )}
                      >
                        <span>{c.header}</span>
                        {isSorted ? (
                          sortState.dir === "asc" ? (
                            <ArrowUp size={11} />
                          ) : (
                            <ArrowDown size={11} />
                          )
                        ) : (
                          <ArrowUpDown size={11} className="opacity-55" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedRows.map((row) => (
              <tr
                key={rowKey(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => handleRowKeyDown(e, row, onRowClick) : undefined}
                className={cn(
                  "group h-12 bg-white text-xs text-slate-800 transition-colors even:bg-slate-50/60 hover:bg-slate-100/75 focus-visible:bg-slate-100/80 focus-visible:outline-hidden",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-2.5 py-2 first:pl-3.5 last:pr-3.5",
                      c.key === "actions" &&
                        "sticky right-0 bg-white/95 backdrop-blur-xs group-even:bg-slate-50/95 group-hover:bg-slate-100/95",
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
