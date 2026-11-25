"use client";

import type { ReactNode } from "react";
import { FilterX, Plus, Search, X } from "lucide-react";
import type { Club, Department } from "@/lib/api";
import {
  DOCUMENT_FORMAT_OPTIONS,
  type DocumentFormatFilter,
  type DocumentSortOption,
} from "@/forms/document/document-filter-meta";
import { SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { FilterPopover } from "@/components/shared/FilterPopover";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";

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
  tierSlot,
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
  tierSlot?: ReactNode;
}) {
  const popoverFilterCount = [
    scopeFilter,
    visibilityFilter,
    formatFilter,
    categoryFilter,
    sortBy !== "newest" ? sortBy : "",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border bg-white px-3 py-1.5 sm:px-4">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:w-auto sm:flex-1">
        <div className="relative min-w-0 flex-1 sm:max-w-[260px]">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
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

        <FilterPopover activeCount={popoverFilterCount} onClear={onResetFilters} title="Lọc tài liệu">
          {!isSystemTier && !isEmbedded && (
            <FormField label="Câu lạc bộ" hideIndicator>
              <Select aria-label="Chọn CLB" value={activeClubId} onChange={(e) => onChangeClub(e.target.value)} className="h-8 text-xs">
                {allowedClubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>
          )}
          {!isSystemTier && (
            <FormField label="Phạm vi lưu trữ" hideIndicator>
              <Select aria-label="Lọc theo không gian lưu trữ" value={scopeFilter} onChange={(e) => onChangeScope(e.target.value)} className="h-8 text-xs">
                <option value="">Tất cả phạm vi</option>
                <option value="__CLUB_ONLY__">Kho chung CLB</option>
                {viewableDepts.map((dep) => <option key={dep.id} value={dep.id}>Ban: {dep.name}</option>)}
              </Select>
            </FormField>
          )}
          <FormField label="Mức hiển thị" hideIndicator>
            <Select aria-label="Lọc mức hiển thị" value={visibilityFilter} onChange={(e) => onChangeVisibility(e.target.value)} className="h-8 text-xs">
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
          </FormField>
          <FormField label="Phân loại" hideIndicator>
            <Select aria-label="Lọc theo phân loại" value={categoryFilter} onChange={(e) => onChangeCategory(e.target.value)} className="h-8 text-xs">
              <option value="">Mọi phân loại</option>
              {categoryOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Định dạng tệp" hideIndicator>
            <Select aria-label="Lọc theo định dạng tệp" value={formatFilter} onChange={(e) => onChangeFormat(e.target.value as DocumentFormatFilter)} className="h-8 text-xs">
              {DOCUMENT_FORMAT_OPTIONS.map((opt) => <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Sắp xếp" hideIndicator>
            <Select aria-label="Sắp xếp tài liệu" value={sortBy} onChange={(e) => onChangeSort(e.target.value as DocumentSortOption)} className="h-8 text-xs">
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="name_asc">Tên A → Z</option>
              <option value="size_desc">Kích thước lớn nhất</option>
            </Select>
          </FormField>
        </FilterPopover>

        {popoverFilterCount > 0 && (
          <Button variant="outline" size="sm" onClick={onResetFilters} className="h-8">
            <FilterX size={13} /> Xoá lọc
          </Button>
        )}
      </div>

      <div className="flex w-full max-w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:shrink-0">
        {tierSlot}
        {canRestore && (
          <SegmentedTabs
            value={effectiveTrash ? "trash" : "live"}
            onChange={(v) => onChangeTrash(v === "trash")}
            options={[
              { value: "live", label: "Đang dùng" },
              { value: "trash", label: isSystemTier ? "Thùng rác" : `Thùng rác (${deletedCount})` },
            ]}
          />
        )}
        {canUpload && !effectiveTrash && (
          <Button size="sm" onClick={onOpenUpload} className="h-8">
            <Plus size={14} /> Tải lên
          </Button>
        )}
      </div>
    </div>
  );
}
