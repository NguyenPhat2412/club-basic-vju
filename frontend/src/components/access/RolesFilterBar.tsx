"use client";

import { ChevronsDownUp, ChevronsUpDown, FilterX, LayoutGrid, Search, Table2, X } from "lucide-react";
import { PermissionGroup, Scope } from "@/lib/api";
import { scopeLabel } from "@/components/shared/RolePicker";
import { Select } from "@/components/ui/input";
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
  visiblePermCount: number;
  totalPermCount: number;
  filteredGroupCount: number;
  hasFilters: boolean;
  onClearFilters: () => void;
  viewMode: "matrix" | "focused";
  onViewModeChange: (mode: "matrix" | "focused") => void;
  allCollapsed: boolean;
  onToggleAllModules: () => void;
};

export function RolesFilterBar({
  search,
  onSearchChange,
  moduleFilter,
  onModuleFilterChange,
  scopeFilter,
  onScopeFilterChange,
  groups,
  visiblePermCount,
  totalPermCount,
  filteredGroupCount,
  hasFilters,
  onClearFilters,
  viewMode,
  onViewModeChange,
  allCollapsed,
  onToggleAllModules,
}: Props) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-card px-4 py-2 sm:px-6">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:flex-1">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            maxLength={200}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên hoặc mô tả quyền…"
            aria-label="Tìm tên quyền chức năng"
            className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-7 text-xs text-foreground focus:border-primary focus:outline-hidden"
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
        <Select
          aria-label="Lọc theo phân hệ"
          value={moduleFilter}
          onChange={(e) => onModuleFilterChange(e.target.value)}
          className="h-8 w-full text-xs sm:w-48"
        >
          <option value="">Tất cả phân hệ ({groups.length})</option>
          {groups.map((g) => (
            <option key={g.module} value={g.module}>
              {moduleLabel(g.module)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Lọc theo phạm vi"
          value={scopeFilter}
          onChange={(e) => onScopeFilterChange(e.target.value as "" | Scope)}
          className="h-8 w-full text-xs sm:w-36"
        >
          <option value="">Mọi phạm vi</option>
          <option value="GLOBAL">{scopeLabel("GLOBAL")}</option>
          <option value="CLUB">{scopeLabel("CLUB")}</option>
          <option value="DEPARTMENT">{scopeLabel("DEPARTMENT")}</option>
        </Select>
        {hasFilters && (
          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={onClearFilters}>
            <FilterX size={13} /> Xoá lọc
          </Button>
        )}
        <span className="hidden font-mono text-[11px] font-medium text-muted-foreground 2xl:inline">
          Hiển thị {visiblePermCount}/{totalPermCount} quyền · {filteredGroupCount} phân hệ
        </span>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {viewMode === "matrix" && filteredGroupCount > 0 && (
          <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={onToggleAllModules}>
            {allCollapsed ? <ChevronsUpDown size={13} /> : <ChevronsDownUp size={13} />}
            <span>{allCollapsed ? "Mở rộng" : "Thu gọn"}</span>
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
              "inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors",
              viewMode === "matrix" ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Table2 size={13} /> Ma trận
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("focused")}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors",
              viewMode === "focused" ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid size={13} /> Theo vai trò
          </button>
        </div>
      </div>
    </div>
  );
}
