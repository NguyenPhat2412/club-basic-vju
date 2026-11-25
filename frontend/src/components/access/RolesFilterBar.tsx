"use client";

import type { ReactNode } from "react";
import { ChevronsDownUp, ChevronsUpDown, FilterX, LayoutGrid, Search, Table2, X } from "lucide-react";
import { PermissionGroup, Scope } from "@/lib/api";
import { scopeLabel } from "@/components/shared/RolePicker";
import { FilterPopover } from "@/components/shared/FilterPopover";
import { CountBadge } from "@/components/ui/badge";
import { FormField, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moduleLabel } from "@/utils/access/permission-meta";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  moduleFilter: string;
  onModuleFilterChange: (value: string) => void;
  scopeFilter: "" | Scope;
  onScopeFilterChange: (value: "" | Scope) => void;
  groups: PermissionGroup[];
  roleCount?: number;
  visiblePermCount: number;
  totalPermCount: number;
  filteredGroupCount: number;
  hasFilters: boolean;
  onClearFilters: () => void;
  viewMode: "matrix" | "focused";
  onViewModeChange: (mode: "matrix" | "focused") => void;
  allCollapsed: boolean;
  onToggleAllModules: () => void;
  rightActions?: ReactNode;
};

export function RolesFilterBar({
  search,
  onSearchChange,
  moduleFilter,
  onModuleFilterChange,
  scopeFilter,
  onScopeFilterChange,
  groups,
  roleCount,
  visiblePermCount,
  totalPermCount,
  filteredGroupCount,
  hasFilters,
  onClearFilters,
  viewMode,
  onViewModeChange,
  allCollapsed,
  onToggleAllModules,
  rightActions,
}: Props) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 border-b border-border bg-white px-3 py-1.5 sm:px-4">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:w-auto sm:flex-1">
        <div className="relative w-full min-w-0 sm:min-w-[140px] sm:max-w-[190px] sm:flex-1">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            maxLength={200}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên hoặc mô tả quyền…"
            aria-label="Tìm tên quyền chức năng"
            className="h-8 pl-8 pr-7 text-xs"
          />
          {search && (
            <button
              type="button"
              aria-label="Xoá từ khoá tìm kiếm"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <FilterPopover activeCount={[moduleFilter, scopeFilter].filter(Boolean).length} onClear={onClearFilters} title="Lọc phân quyền">
          <FormField label="Phân hệ" hideIndicator>
            <Select aria-label="Lọc theo phân hệ" value={moduleFilter} onChange={(e) => onModuleFilterChange(e.target.value)} className="h-8 text-xs">
              <option value="">Tất cả phân hệ ({groups.length})</option>
              {groups.map((g) => <option key={g.module} value={g.module}>{moduleLabel(g.module)}</option>)}
            </Select>
          </FormField>
          <FormField label="Phạm vi quyền" hideIndicator>
            <Select aria-label="Lọc theo phạm vi" value={scopeFilter} onChange={(e) => onScopeFilterChange(e.target.value as "" | Scope)} className="h-8 text-xs">
              <option value="">Mọi phạm vi</option>
              <option value="GLOBAL">{scopeLabel("GLOBAL")}</option>
              <option value="CLUB">{scopeLabel("CLUB")}</option>
              <option value="DEPARTMENT">{scopeLabel("DEPARTMENT")}</option>
            </Select>
          </FormField>
        </FilterPopover>
        {hasFilters && (
          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={onClearFilters}>
            <FilterX size={13} /> Xoá lọc
          </Button>
        )}
        <span className="hidden 2xl:inline-flex">
          <CountBadge>
            {roleCount !== undefined ? `${roleCount} vai trò · ` : ""}{visiblePermCount}/{totalPermCount} quyền
          </CountBadge>
        </span>
      </div>

      <div className="flex w-full max-w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:shrink-0">
        {viewMode === "matrix" && filteredGroupCount > 0 && (
          <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={onToggleAllModules}>
            {allCollapsed ? <ChevronsUpDown size={13} /> : <ChevronsDownUp size={13} />}
            <span className="hidden sm:inline">{allCollapsed ? "Mở rộng" : "Thu gọn"}</span>
          </Button>
        )}
        <div
          className="inline-flex h-8 items-center rounded-lg border border-border bg-muted/40 p-0.5"
          role="group"
          aria-label="Chế độ hiển thị phân quyền"
        >
          <button
            type="button"
            onClick={() => onViewModeChange("matrix")}
            className={cn(
              "inline-flex h-full items-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors",
              viewMode === "matrix" ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Table2 size={13} /> Ma trận
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("focused")}
            className={cn(
              "inline-flex h-full items-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors",
              viewMode === "focused" ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid size={13} /> Theo vai trò
          </button>
        </div>
        {rightActions}
      </div>
    </div>
  );
}
