"use client";

import { ReactNode, useMemo, useState } from "react";
import { Building2, FilterX, Plus, Search, X } from "lucide-react";
import { Department } from "@/lib/api";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/States";
import { RowAction, TableRowActions } from "@/components/shared/TableRowActions";
import { CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

export function DepartmentTableSection({
  items,
  canCreate,
  actionsFor,
  onRowClick,
  onOpenCreate,
  betweenToolbarAndTable,
}: {
  items: Department[];
  canCreate: boolean;
  actionsFor: (dept: Department) => RowAction[];
  onRowClick: (dept: Department) => void;
  onOpenCreate: () => void;
  betweenToolbarAndTable?: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "ACTIVE" | "INACTIVE">("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((d) => {
      if (statusFilter && d.status !== statusFilter) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || (d.description ?? "").toLowerCase().includes(q);
    });
  }, [items, search, statusFilter]);

  const paged = useMemo(() => filtered.slice(offset, offset + limit), [filtered, offset, limit]);
  const hasFilters = search.trim() !== "" || statusFilter !== "";
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setOffset(0);
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-1.5 border-b border-border bg-white px-3 py-1.5 sm:px-4">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          <div className="relative min-w-[180px] flex-1 sm:max-w-[240px]">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              maxLength={200}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              placeholder="Tìm tên ban, mô tả…"
              className="h-8 pl-8 pr-7 text-xs"
            />
            {search && (
              <button
                type="button"
                aria-label="Xoá tìm kiếm"
                onClick={() => {
                  setSearch("");
                  setOffset(0);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <Select
            aria-label="Lọc trạng thái ban"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "" | "ACTIVE" | "INACTIVE");
              setOffset(0);
            }}
            className="h-8 w-full text-xs sm:w-40"
          >
            <option value="">Mọi trạng thái ({items.length})</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </Select>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="h-8">
              <FilterX size={13} /> Xoá lọc
            </Button>
          )}
          <CountBadge>
            {filtered.length}/{items.length} ban
          </CountBadge>
        </div>

        {canCreate && (
          <Button size="sm" onClick={onOpenCreate} className="h-8 px-2.5 text-xs font-bold">
            <Plus size={14} /> Tạo ban chuyên môn
          </Button>
        )}
      </div>

      {betweenToolbarAndTable}

      {!items.length ? (
        <EmptyState
          icon={<Building2 />}
          title="CLB chưa có ban chuyên môn nào"
          actionLabel={canCreate ? "Tạo ban chuyên môn" : undefined}
          onAction={canCreate ? onOpenCreate : undefined}
        />
      ) : !filtered.length ? (
        <EmptyState
          icon={<Building2 />}
          title="Không có ban chuyên môn khớp bộ lọc"
          description="Thử thay đổi từ khoá hoặc bộ lọc trạng thái."
          actionLabel="Xoá bộ lọc"
          onAction={clearFilters}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Ban chuyên môn"
            minWidth="min-w-[640px]"
            rows={paged}
            rowKey={(d) => d.id}
            onRowClick={onRowClick}
            columns={[
              {
                key: "name",
                header: "Tên ban chuyên môn",
                sortValue: (d) => d.name,
                render: (d) => <span className="font-bold text-foreground">{d.name}</span>,
              },
              {
                key: "desc",
                header: "Mô tả nhiệm vụ",
                className: "max-w-[340px]",
                render: (d) => <p className="truncate text-muted-foreground">{d.description || "—"}</p>,
              },
              {
                key: "status",
                header: "Trạng thái",
                sortValue: (d) => d.status,
                render: (d) => <StatusBadge status={d.status} />,
              },
              {
                key: "actions",
                header: "Thao tác",
                className: "text-right",
                render: (d) => {
                  const acts = actionsFor(d);
                  return acts.length ? (
                    <TableRowActions actions={acts} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  );
                },
              },
            ]}
          />
          <Pagination offset={offset} limit={limit} total={filtered.length} onOffset={setOffset} onLimit={setLimit} />
        </>
      )}
    </div>
  );
}
