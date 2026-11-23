"use client";

import { useMemo, useState } from "react";
import { Building2, FilterX, Plus, Search, Trash2, X } from "lucide-react";
import { ClubPositionSlot, Department } from "@/lib/api";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/States";
import { RowAction, TableRowActions } from "@/components/shared/TableRowActions";
import { CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { resolveMediaUrl } from "@/lib/media";

export function DepartmentTableSection({
  items,
  canCreate,
  canRevokePosition,
  deptHeadSlotFor,
  actionsFor,
  onRowClick,
  onOpenCreate,
  onRevokeHead,
}: {
  items: Department[];
  canCreate: boolean;
  canRevokePosition: boolean;
  deptHeadSlotFor: (departmentId: string) => ClubPositionSlot | undefined;
  actionsFor: (dept: Department) => RowAction[];
  onRowClick: (dept: Department) => void;
  onOpenCreate: () => void;
  onRevokeHead: (assignmentId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "ACTIVE" | "INACTIVE">("");
  const [headFilter, setHeadFilter] = useState<"" | "HAS_HEAD" | "NO_HEAD">("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((d) => {
      if (statusFilter && d.status !== statusFilter) return false;
      const holder = deptHeadSlotFor(d.id)?.holders?.[0];
      if (headFilter === "HAS_HEAD" && !holder) return false;
      if (headFilter === "NO_HEAD" && holder) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q) ||
        (holder?.fullName ?? "").toLowerCase().includes(q) ||
        (holder?.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter, headFilter, deptHeadSlotFor]);

  const paged = useMemo(() => filtered.slice(offset, offset + limit), [filtered, offset, limit]);
  const hasFilters = search.trim() !== "" || statusFilter !== "" || headFilter !== "";
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setHeadFilter("");
    setOffset(0);
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-border/60 bg-card px-4 py-2.5 sm:px-6">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[210px] flex-1 sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              maxLength={200}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              placeholder="Tìm tên ban, mô tả, Trưởng ban…"
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
            className="h-8 w-full text-xs sm:w-44"
          >
            <option value="">Mọi trạng thái ({items.length})</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </Select>
          <Select
            aria-label="Lọc bổ nhiệm Trưởng ban"
            value={headFilter}
            onChange={(e) => {
              setHeadFilter(e.target.value as "" | "HAS_HEAD" | "NO_HEAD");
              setOffset(0);
            }}
            className="h-8 w-full text-xs sm:w-48"
          >
            <option value="">Mọi vị trí Trưởng ban</option>
            <option value="HAS_HEAD">Đã có Trưởng ban</option>
            <option value="NO_HEAD">Chưa bổ nhiệm Trưởng ban</option>
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
          <Button size="sm" onClick={onOpenCreate} className="h-8">
            <Plus size={14} /> Tạo ban chuyên môn
          </Button>
        )}
      </div>

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
          description="Thử thay đổi từ khoá hoặc bộ lọc trạng thái / Trưởng ban."
          actionLabel="Xoá bộ lọc"
          onAction={clearFilters}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Ban chuyên môn"
            minWidth="min-w-[740px]"
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
                key: "head",
                header: "Trưởng ban",
                sortValue: (d) => deptHeadSlotFor(d.id)?.holders?.[0]?.fullName ?? "",
                render: (d) => {
                  const holder = deptHeadSlotFor(d.id)?.holders?.[0];
                  if (!holder) {
                    return <span className="text-xs italic text-muted-foreground">Chưa bổ nhiệm</span>;
                  }
                  const avatarSrc = resolveMediaUrl(holder.avatarUrl);
                  const displayName = holder.fullName || holder.email;
                  return (
                    <div className="flex min-w-0 items-center gap-2">
                      {avatarSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarSrc}
                          alt={displayName}
                          className="size-7 shrink-0 rounded-full border border-border/70 object-cover"
                        />
                      ) : (
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {displayName.trim().slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-foreground">{displayName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{holder.email}</p>
                      </div>
                      {canRevokePosition && (
                        <button
                          type="button"
                          aria-label={`Miễn nhiệm Trưởng ban ${holder.fullName || holder.email}`}
                          title="Miễn nhiệm Trưởng ban"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Miễn nhiệm Trưởng ban ${holder.fullName || holder.email} khỏi ${d.name}?`)) {
                              onRevokeHead(holder.assignmentId);
                            }
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                },
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
