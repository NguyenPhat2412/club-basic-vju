"use client";

import { Award, FilterX, QrCode, Search, X } from "lucide-react";
import type { Club } from "@/lib/api";
import { SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EVENT_TYPE_LABELS } from "@/forms/event/event-form";

export function EventsPortalToolbar({
  tab,
  onTabChange,
  isLoggedIn,
  canViewTrainingPointsReport,
  discoverCount,
  myHistoryTotal,
  search,
  onSearchChange,
  clubFilter,
  onClubFilterChange,
  unitOptions,
  typeFilter,
  onTypeFilterChange,
  ctvFilter,
  onCtvFilterChange,
  hasDiscoverFilters,
  onClearFilters,
  onOpenQr,
  onOpenReport,
  onRefresh,
}: {
  tab: "discover" | "mine";
  onTabChange: (tab: "discover" | "mine") => void;
  isLoggedIn: boolean;
  canViewTrainingPointsReport: boolean;
  discoverCount: number;
  myHistoryTotal: number;
  search: string;
  onSearchChange: (value: string) => void;
  clubFilter: string;
  onClubFilterChange: (value: string) => void;
  unitOptions: Club[];
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  ctvFilter: "ALL" | "CTV_ONLY";
  onCtvFilterChange: (value: "ALL" | "CTV_ONLY") => void;
  hasDiscoverFilters: boolean;
  onClearFilters: () => void;
  onOpenQr: () => void;
  onOpenReport: () => void;
  onRefresh: () => void;
}) {
  void onRefresh;
  return (
    <div className="relative z-30 flex flex-wrap items-center justify-between gap-1.5 border-b border-border bg-white px-3 py-1.5 sm:px-4">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {isLoggedIn && (
          <SegmentedTabs
            value={tab}
            onChange={onTabChange}
            options={[
              { value: "discover", label: `Khám phá (${discoverCount})` },
              { value: "mine", label: `Của tôi (${myHistoryTotal})` },
            ]}
          />
        )}
        {tab === "discover" && (
          <>
            <div className="relative min-w-[150px] flex-1 sm:max-w-[200px]">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm sự kiện, CLB…"
                aria-label="Tìm tên sự kiện, CLB, địa điểm"
                className="h-8 pl-8 pr-7 text-xs"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Xoá tìm kiếm"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <Select
              aria-label="Lọc theo đơn vị / CLB"
              value={clubFilter}
              onChange={(e) => onClubFilterChange(e.target.value)}
              className="h-8 w-full text-xs sm:w-40"
            >
              <option value="">Tất cả 13 đơn vị</option>
              {unitOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.code?.toUpperCase() === "DOANVJU"
                    ? `Đoàn TN VJU (${unit.name})`
                    : unit.code
                      ? `${unit.code} · ${unit.name}`
                      : unit.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Lọc loại sự kiện"
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              className="h-8 w-full text-xs sm:w-34"
            >
              <option value="">Mọi loại hình</option>
              {Object.entries(EVENT_TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Lọc đối tượng sự kiện"
              value={ctvFilter}
              onChange={(e) => onCtvFilterChange(e.target.value as "ALL" | "CTV_ONLY")}
              className="h-8 w-full text-xs sm:w-36"
            >
              <option value="ALL">Tất cả sự kiện</option>
              <option value="CTV_ONLY">Mở tuyển CTV</option>
            </Select>
            {hasDiscoverFilters && (
              <Button size="sm" variant="outline" className="h-8" onClick={onClearFilters}>
                <FilterX size={13} /> Xoá lọc
              </Button>
            )}
          </>
        )}
      </div>

      {isLoggedIn && (
        <div className="flex shrink-0 items-center gap-1.5">
          {canViewTrainingPointsReport && (
            <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" onClick={onOpenReport}>
              <Award size={13} /> Báo cáo ĐRL
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" onClick={onOpenQr}>
            <QrCode size={13} /> Điểm danh QR
          </Button>
        </div>
      )}
    </div>
  );
}
