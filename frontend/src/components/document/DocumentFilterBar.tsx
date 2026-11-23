"use client";

import { FilterX, Plus, Search, X } from "lucide-react";
import type { Club, Department } from "@/lib/api";
import {
  DOCUMENT_FORMAT_OPTIONS,
  type DocumentFormatFilter,
  type DocumentSortOption,
} from "@/forms/document/document-filter-meta";
import { SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

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
    <div className="border-b border-border/70 bg-card px-4 py-2 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        {isEmbedded && (
          <div className="relative min-w-[200px] flex-1 sm:max-w-[240px]">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="Tìm tên tài liệu…"
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
        )}

        {!isSystemTier && !isEmbedded && (
          <Select
            aria-label="Chọn CLB"
            value={activeClubId}
            onChange={(e) => onChangeClub(e.target.value)}
            className="h-8 w-full text-xs sm:w-48"
          >
            {allowedClubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}

        {!isSystemTier && (
          <Select
            aria-label="Lọc theo không gian lưu trữ"
            value={scopeFilter}
            onChange={(e) => onChangeScope(e.target.value)}
            className="h-8 w-full text-xs sm:w-38"
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
          className="h-8 w-full text-xs sm:w-38"
        >
          <option value="">Mọi mức hiển thị</option>
          {isSystemTier ? (
            <>
              <option value="PUBLIC_INTERNAL">Toàn trường</option>
              <option value="OFFICERS">Bảo mật BCN (Sổ Quỹ)</option>
            </>
          ) : (
            <>
              <option value="MEMBERS">Thành viên CLB</option>
              <option value="OFFICERS">Bảo mật BCN (Sổ Quỹ)</option>
              <option value="DEPARTMENT_ONLY">Nội bộ Ban</option>
            </>
          )}
        </Select>

        <Select
          aria-label="Lọc theo phân loại"
          value={categoryFilter}
          onChange={(e) => onChangeCategory(e.target.value)}
          className="h-8 w-full text-xs sm:w-40"
        >
          <option value="">Mọi phân loại</option>
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Lọc theo định dạng tệp"
          value={formatFilter}
          onChange={(e) => onChangeFormat(e.target.value as DocumentFormatFilter)}
          className="h-8 w-full text-xs sm:w-42"
        >
          {DOCUMENT_FORMAT_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Sắp xếp tài liệu"
          value={sortBy}
          onChange={(e) => onChangeSort(e.target.value as DocumentSortOption)}
          className="h-8 w-full text-xs sm:w-38"
        >
          <option value="newest">Mới nhất trước</option>
          <option value="oldest">Cũ nhất trước</option>
          <option value="name_asc">Tên A → Z</option>
          <option value="size_desc">Kích thước lớn nhất</option>
        </Select>

        {activeFilterCount > 0 && (
          <Button variant="outline" size="sm" onClick={onResetFilters} className="h-8">
            <FilterX size={13} /> Xoá lọc ({activeFilterCount})
          </Button>
        )}

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
    </div>
  );
}
