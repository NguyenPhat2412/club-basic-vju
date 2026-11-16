"use client";

import { Filter, Plus, RotateCcw, Search, X } from "lucide-react";
import type { Club, Department } from "@/lib/api";
import {
  DOCUMENT_FORMAT_OPTIONS,
  type DocumentFormatFilter,
  type DocumentSortOption,
} from "@/forms/document/document-filter-meta";
import { SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DocumentFilterBar({
  isEmbedded,
  isSystemTier,
  allowedClubs,
  activeClubId,
  onChangeClub,
  viewableDepts,
  scopeFilter,
  onChangeScope,
  visibilityFilter,
  onChangeVisibility,
  formatFilter,
  onChangeFormat,
  categoryFilter,
  categoryOptions,
  onChangeCategory,
  sortBy,
  onChangeSort,
  search,
  onChangeSearch,
  canRestore,
  effectiveTrash,
  deletedCount,
  onChangeTrash,
  canUpload,
  onOpenUpload,
  shownCount,
  totalCount,
  onResetFilters,
}: {
  isEmbedded: boolean;
  isSystemTier: boolean;
  allowedClubs: Club[];
  activeClubId: string;
  onChangeClub: (clubId: string) => void;
  viewableDepts: Department[];
  scopeFilter: string;
  onChangeScope: (scope: string) => void;
  visibilityFilter: string;
  onChangeVisibility: (vis: string) => void;
  formatFilter: DocumentFormatFilter;
  onChangeFormat: (fmt: DocumentFormatFilter) => void;
  categoryFilter: string;
  categoryOptions: Array<{ value: string; label: string }>;
  onChangeCategory: (cat: string) => void;
  sortBy: DocumentSortOption;
  onChangeSort: (sort: DocumentSortOption) => void;
  search: string;
  onChangeSearch: (q: string) => void;
  canRestore: boolean;
  effectiveTrash: boolean;
  deletedCount: number;
  onChangeTrash: (trash: boolean) => void;
  canUpload: boolean;
  onOpenUpload: () => void;
  shownCount: number;
  totalCount: number;
  onResetFilters: () => void;
}) {
  const activeFilterCount = [
    search.trim(),
    scopeFilter,
    visibilityFilter,
    formatFilter,
    categoryFilter,
    sortBy !== "newest" ? sortBy : "",
  ].filter(Boolean).length;

  return (
    <div className="border-b border-border/70 bg-card px-4 py-2.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[210px] flex-1 sm:max-w-[260px]">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="Lọc nhanh theo tên tài liệu…"
            aria-label="Lọc theo tên tài liệu"
            className="h-8 pl-8 pr-7 text-xs"
          />
          {search && (
            <button
              type="button"
              aria-label="Xoá tìm kiếm"
              onClick={() => onChangeSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {!isSystemTier && !isEmbedded && (
          <Select
            aria-label="Chọn CLB"
            value={activeClubId}
            onChange={(e) => onChangeClub(e.target.value)}
            className="h-8 w-full text-xs sm:w-52"
          >
            {allowedClubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
          </Select>
        )}

        {!isSystemTier && (
          <Select
            aria-label="Lọc theo không gian lưu trữ"
            value={scopeFilter}
            onChange={(e) => onChangeScope(e.target.value)}
            className="h-8 w-full text-xs sm:w-40"
          >
            <option value="">Tất cả phạm vi</option>
            <option value="__CLUB_ONLY__">Kho chung CLB</option>
            {viewableDepts.map((dep) => (
              <option key={dep.id} value={dep.id}>
                Ban: {dep.name}
              </option>
            ))}
          </Select>
        )}

        <Select
          aria-label="Lọc mức hiển thị"
          value={visibilityFilter}
          onChange={(e) => onChangeVisibility(e.target.value)}
          className="h-8 w-full text-xs sm:w-40"
        >
          <option value="">Mọi mức hiển thị</option>
          {isSystemTier ? (
            <>
              <option value="PUBLIC_INTERNAL">Toàn trường</option>
              <option value="OFFICERS">Ban chủ nhiệm</option>
            </>
          ) : (
            <>
              <option value="MEMBERS">Thành viên CLB</option>
              <option value="OFFICERS">Ban chủ nhiệm</option>
              <option value="DEPARTMENT_ONLY">Nội bộ Ban</option>
            </>
          )}
        </Select>

        <Select
          aria-label="Lọc theo phân loại"
          value={categoryFilter}
          onChange={(e) => onChangeCategory(e.target.value)}
          className="h-8 w-full text-xs sm:w-44"
        >
          <option value="">Mọi phân loại</option>
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Sắp xếp tài liệu"
          value={sortBy}
          onChange={(e) => onChangeSort(e.target.value as DocumentSortOption)}
          className="h-8 w-full text-xs sm:w-40"
        >
          <option value="newest">Mới nhất trước</option>
          <option value="oldest">Cũ nhất trước</option>
          <option value="name_asc">Tên A → Z</option>
          <option value="size_desc">Kích thước lớn nhất</option>
        </Select>

        <div className="flex items-center gap-2 sm:ml-auto">
          {canRestore && (
            <SegmentedTabs
              value={effectiveTrash ? "trash" : "live"}
              onChange={(v) => onChangeTrash(v === "trash")}
              options={[
                { value: "live", label: "Đang dùng" },
                {
                  value: "trash",
                  label: isSystemTier ? "Thùng rác" : `Thùng rác (${deletedCount})`,
                },
              ]}
            />
          )}
          {isEmbedded && canUpload && !effectiveTrash && (
            <Button size="sm" onClick={onOpenUpload} className="h-8">
              <Plus size={14} /> Tải lên
            </Button>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Lọc nhanh định dạng tệp">
          <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Filter size={12} /> Định dạng:
          </span>
          {DOCUMENT_FORMAT_OPTIONS.map((opt) => {
            const active = formatFilter === opt.value;
            return (
              <button
                key={opt.value || "all"}
                type="button"
                aria-pressed={active}
                onClick={() => onChangeFormat(opt.value)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
                  active
                    ? "border-primary/40 bg-primary/12 text-primary"
                    : "border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {opt.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
          <span>
            Hiển thị <b className="font-semibold text-foreground">{shownCount}</b> /{" "}
            <b className="font-semibold text-foreground">{totalCount}</b> tài liệu
          </span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/8 px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/14"
            >
              <RotateCcw size={11} /> Xoá lọc ({activeFilterCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
