"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Check, ChevronDown } from "lucide-react";
import { useActiveUnit, type ActiveUnit } from "@/hooks/useActiveUnit";
import { ClubAvatar } from "@/components/shared/ClubMedia";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/I18nContext";

const SWITCHER_COPY = {
  vi: {
    ariaLabel: "Chuyển đổi đơn vị làm việc",
    menuHeading: "Đơn vị & Chức vụ hiện tại",
    hint: "Chuyển đổi ngữ cảnh quyền thao tác và nhật ký kiểm toán tức thời.",
    noUnits: "Chưa có đơn vị trực thuộc",
  },
  en: {
    ariaLabel: "Switch active unit",
    menuHeading: "Active Units & Roles",
    hint: "Switches active permissions and audit context immediately.",
    noUnits: "No assigned units",
  },
  ja: {
    ariaLabel: "所属ユニットを切り替え",
    menuHeading: "所属ユニット・役職",
    hint: "権限コンテキストと監査ログ対象ユニットを即座に切り替えます。",
    noUnits: "所属ユニットがありません",
  },
} as const;

export function UnitSwitcher({
  compact = false,
  clubIdsFilter,
  selectedClubId,
  onSwitchClub,
  className,
}: {
  compact?: boolean;
  clubIdsFilter?: Set<string>;
  selectedClubId?: string;
  onSwitchClub?: (clubId: string) => void;
  className?: string;
}) {
  const { locale } = useI18n();
  const copy = SWITCHER_COPY[locale];
  const router = useRouter();
  const pathname = usePathname();
  const { units, activeUnit, setActiveUnitId } = useActiveUnit();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const visibleUnits = useMemo<ActiveUnit[]>(
    () => (clubIdsFilter ? units.filter((u) => clubIdsFilter.has(u.clubId)) : units),
    [clubIdsFilter, units],
  );

  const currentUnit = useMemo(
    () =>
      (selectedClubId ? visibleUnits.find((u) => u.clubId === selectedClubId) : undefined) ??
      (activeUnit ? visibleUnits.find((u) => u.clubId === activeUnit.clubId) : undefined) ??
      visibleUnits[0] ??
      null,
    [activeUnit, selectedClubId, visibleUnits],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!currentUnit) return null;

  const handleSelect = (unit: ActiveUnit) => {
    setOpen(false);
    setActiveUnitId(unit.clubId);
    if (onSwitchClub) {
      onSwitchClub(unit.clubId);
      return;
    }
    if (pathname === "/management") {
      const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      params.set("clubId", unit.clubId);
      if (!params.get("tab") || params.get("tab") === "clubs") {
        params.set("tab", "overview");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={copy.ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`${currentUnit.clubCode} · ${currentUnit.roleLabel}`}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-border bg-card text-left transition-colors hover:bg-secondary",
          compact ? "h-8 max-w-[116px] px-2 sm:max-w-[230px]" : "h-9 max-w-[260px] px-2.5",
        )}
      >
        <Building2 size={13} className="shrink-0 text-primary" />
        <span className="truncate text-xs font-bold text-foreground">{currentUnit.clubCode}</span>
        <span className="hidden truncate rounded bg-accent px-1.5 py-0.5 text-[10.5px] font-semibold text-primary sm:inline">
          {currentUnit.roleLabel}
        </span>
        <ChevronDown size={13} className="ml-auto shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={copy.ariaLabel}
          className="fixed inset-x-3 top-14 z-50 rounded-xl border border-border bg-card p-1.5 shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-10 sm:w-80"
        >
          <div className="border-b border-border/70 px-2.5 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {copy.menuHeading}
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{copy.hint}</p>
          </div>

          <div className="mt-1 max-h-72 space-y-0.5 overflow-y-auto">
            {visibleUnits.length === 0 ? (
              <p className="px-2.5 py-3 text-xs text-muted-foreground">{copy.noUnits}</p>
            ) : (
              visibleUnits.map((unit) => {
                const selected = unit.clubId === currentUnit.clubId;
                return (
                  <button
                    key={unit.clubId}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(unit)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                      selected ? "bg-accent text-foreground" : "hover:bg-secondary",
                    )}
                  >
                    <ClubAvatar
                      name={unit.clubName}
                      code={unit.clubCode}
                      logoUrl={unit.logoUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">{unit.clubCode}</span>
                        <span className="truncate rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          {unit.roleLabel}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">{unit.clubName}</p>
                    </div>
                    {selected && <Check size={14} className="shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
