"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Compass, LayoutDashboard, Search, Sparkles, X } from "lucide-react";
import type { NavSection } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/I18nContext";

type SearchEntry = {
  id: string;
  label: string;
  groupLabel: string;
  href: string;
  tab?: string;
  keywords: string;
};

function foldText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function QuickPageSearch({
  sections,
  authenticated,
}: {
  sections: NavSection[];
  authenticated: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentClubId = searchParams.get("clubId");
  const { tr } = useI18n();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const desktopInputRef = useRef<HTMLInputElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);

  const entries = useMemo<SearchEntry[]>(() => {
    const list: SearchEntry[] = [];
    const seen = new Set<string>();

    if (authenticated) {
      list.push({
        id: "route:/dashboard",
        label: tr("Tổng quan hệ thống"),
        groupLabel: tr("Bảng điều khiển"),
        href: "/dashboard",
        keywords: foldText("Tổng quan hệ thống Bảng điều khiển Dashboard KPI"),
      });
      seen.add("/dashboard");
    }

    for (const sec of sections) {
      for (const grp of sec.groups) {
        for (const item of grp.items) {
          const key = `${item.href}|${item.tab ?? ""}|${item.tier ?? ""}`;
          if (seen.has(key)) continue;
          seen.add(key);
          list.push({
            id: key,
            label: item.label,
            groupLabel: grp.label,
            href: item.href,
            tab: item.tab,
            keywords: foldText(`${item.label} ${grp.label} ${item.tab ?? ""} ${item.href}`),
          });
        }
      }
    }

    list.push({
      id: "route:/home",
      label: tr("Trang chủ giới thiệu VJU ClubHub"),
      groupLabel: tr("Cổng công khai"),
      href: "/home",
      keywords: foldText("Trang chủ giới thiệu Landing Home VJU"),
    });

    return list;
  }, [authenticated, sections, tr]);

  const filtered = useMemo(() => {
    const q = foldText(query);
    if (!q) return entries;
    return entries.filter((item) => item.keywords.includes(q));
  }, [entries, query]);

  const safeIndex = filtered.length > 0 ? Math.min(activeIndex, filtered.length - 1) : 0;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        if (window.innerWidth >= 768) {
          desktopInputRef.current?.focus();
        } else {
          setTimeout(() => mobileInputRef.current?.focus(), 20);
        }
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const navigateTo = (entry: SearchEntry) => {
    let targetHref = entry.href;
    if (entry.tab && currentClubId && targetHref.startsWith("/management?")) {
      const params = new URLSearchParams(targetHref.split("?")[1] ?? "");
      params.set("clubId", currentClubId);
      targetHref = `/management?${params.toString()}`;
    }
    setOpen(false);
    setQuery("");
    router.push(targetHref);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter" && filtered[safeIndex]) {
      e.preventDefault();
      navigateTo(filtered[safeIndex]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Mobile icon button (< 768px) to guarantee 0px topbar overflow */}
      <button
        type="button"
        aria-label={tr("Tìm trang...")}
        title={`${tr("Tìm trang...")} (⌘K)`}
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => mobileInputRef.current?.focus(), 20);
        }}
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary md:hidden",
          open && "border-primary/30 bg-primary/8 text-primary"
        )}
      >
        <Search size={15} />
      </button>

      {/* Desktop / Tablet inline search input matching reference UI */}
      <div
        className={cn(
          "hidden h-8 w-44 items-center gap-2 rounded-lg border bg-slate-50/80 px-2.5 text-xs transition-all md:flex xl:w-56",
          open
            ? "border-primary bg-white ring-2 ring-primary/15"
            : "border-slate-200 hover:border-slate-300 hover:bg-white"
        )}
      >
        <Search size={13.5} className="shrink-0 text-slate-400" />
        <input
          ref={desktopInputRef}
          maxLength={120}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={tr("Tìm trang...")}
          aria-label={tr("Tìm trang...")}
          className="min-w-0 flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
        />
        {query ? (
          <button
            type="button"
            aria-label={tr("Xoá tìm kiếm")}
            onClick={() => {
              setQuery("");
              desktopInputRef.current?.focus();
            }}
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={12} />
          </button>
        ) : (
          <kbd className="hidden rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[9.5px] font-semibold text-slate-400 xl:inline-block">
            ⌘K
          </kbd>
        )}
      </div>

      {open && (
        <div
          role="listbox"
          aria-label={tr("Danh sách trang điều hướng nhanh")}
          className="panel-modal fixed inset-x-3 top-14 z-50 max-h-[72dvh] overflow-hidden md:absolute md:inset-x-auto md:right-0 md:top-10 md:w-84 fade-in"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 md:hidden">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input
              ref={mobileInputRef}
              maxLength={120}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={tr("Tìm trang quản lý, chức năng...")}
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3 py-1.5 text-[10.5px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Sparkles size={11} className="text-primary" /> {tr("Truy cập nhanh")} ({filtered.length})
            </span>
            <span className="hidden text-[10px] text-slate-400 sm:inline">↑↓ · Enter</span>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-500">
                {tr("Không tìm thấy trang phù hợp với từ khoá.")}
              </div>
            ) : (
              filtered.map((entry, idx) => {
                const isActive = idx === safeIndex;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => navigateTo(entry)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                      isActive ? "bg-primary/8 text-primary" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-md border",
                          isActive
                            ? "border-primary/25 bg-white text-primary"
                            : "border-slate-200/80 bg-slate-50 text-slate-500"
                        )}
                      >
                        {entry.href === "/dashboard" ? <LayoutDashboard size={13.5} /> : <Compass size={13.5} />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{entry.label}</p>
                        <p className="truncate text-[10.5px] text-slate-400">{entry.groupLabel}</p>
                      </div>
                    </div>
                    <ArrowUpRight size={13} className="shrink-0 opacity-60" />
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
