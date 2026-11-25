"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CornerDownLeft, PanelLeft, Search, X } from "lucide-react";
import type { NavSection } from "@/config/navigation";
import { useI18n } from "@/providers/I18nContext";
import { cn, shortDisplayName } from "@/lib/utils";
import { iconForTab } from "./WorkspaceTabSpecs";

type QuickShortcut = {
  href: string;
  label: string;
  groupLabel: string;
  searchKey: string;
  icon: ReturnType<typeof iconForTab>;
};

const PREFERRED_HREFS = [
  "/dashboard",
  "/management?tab=clubs",
  "/events",
  "/schedule",
  "/applications",
  "/profile",
  "/documents",
  "/notifications",
];

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

export function WorkspaceEmptyState({
  sections,
  userName,
  onOpenShortcut,
}: {
  sections: NavSection[];
  userName?: string;
  onOpenShortcut: (href: string) => void;
}) {
  const { tr } = useI18n();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const allItems = useMemo<QuickShortcut[]>(() => {
    const byHref = new Map<string, QuickShortcut>();
    const add = (href: string, rawLabel: string, rawGroup: string, tab?: string, tier?: string) => {
      if (byHref.has(href)) return;
      const label = tr(rawLabel);
      const groupLabel = tr(rawGroup);
      byHref.set(href, {
        href,
        label,
        groupLabel,
        searchKey: normalizeSearchText(`${label} ${rawLabel} ${groupLabel} ${rawGroup} ${href}`),
        icon: iconForTab(href, tab, tier),
      });
    };

    add("/dashboard", "Tổng quan", "Bảng điều khiển");
    for (const sec of sections) {
      for (const grp of sec.groups) {
        for (const item of grp.items) {
          add(item.href, item.label, grp.label, item.tab, item.tier);
        }
      }
    }
    return Array.from(byHref.values());
  }, [sections, tr]);

  const defaultShortcuts = useMemo<QuickShortcut[]>(() => {
    const map = new Map(allItems.map((item) => [item.href, item]));
    const picked: QuickShortcut[] = [];
    for (const href of PREFERRED_HREFS) {
      const found = map.get(href);
      if (found) {
        picked.push(found);
        map.delete(href);
      }
      if (picked.length >= 8) break;
    }
    for (const extra of map.values()) {
      if (picked.length >= 8) break;
      picked.push(extra);
    }
    return picked;
  }, [allItems]);

  const normalizedQuery = normalizeSearchText(query);
  const isSearching = normalizedQuery.length > 0;

  const filteredItems = useMemo(() => {
    if (!isSearching) return defaultShortcuts;
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    return allItems.filter((item) => tokens.every((tok) => item.searchKey.includes(tok)));
  }, [allItems, defaultShortcuts, isSearching, normalizedQuery]);

  const clampedIndex = filteredItems.length > 0 ? Math.min(activeIndex, filteredItems.length - 1) : 0;
  const greetingName = shortDisplayName(userName);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setQuery("");
      setActiveIndex(0);
      return;
    }
    if (!filteredItems.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filteredItems[clampedIndex];
      if (target) onOpenShortcut(target.href);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8 sm:py-10">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border bg-card shadow-xs">
          <Image
            src="/images/vju-logo.png"
            alt="VJU ClubHub"
            width={40}
            height={40}
            className="size-10 rounded-full object-contain"
          />
        </div>

        <h1 className="mt-4 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          {greetingName ? `${tr("Xin chào")}, ${greetingName}` : "VJU ClubHub"}
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
          {tr("Chọn nhanh chức năng bên dưới hoặc mở trực tiếp bất kỳ mục nào trên thanh điều hướng bên trái.")}
        </p>

        {/* Cloudflare-style quick jump search bar */}
        <div className="mx-auto mt-5 max-w-xl text-left">
          <div className="relative flex h-11 items-center rounded-xl border border-border bg-card px-3 shadow-xs transition-all focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
            <Search size={16} className="shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              maxLength={120}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={tr("Tìm nhanh chức năng, trang quản lý…")}
              aria-label={tr("Tìm kiếm mục chức năng")}
              className="h-full w-full min-w-0 bg-transparent px-2.5 text-sm text-foreground placeholder:font-normal placeholder:text-slate-400/80 focus:outline-hidden"
            />
            {query ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="hidden font-mono text-[11px] font-medium text-muted-foreground sm:inline">
                  {filteredItems.length} {tr("kết quả")}
                </span>
                <button
                  type="button"
                  aria-label={tr("Xoá tìm kiếm")}
                  onClick={() => {
                    setQuery("");
                    setActiveIndex(0);
                    inputRef.current?.focus();
                  }}
                  className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <kbd className="hidden shrink-0 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-muted-foreground sm:inline-block">
                /
              </kbd>
            )}
          </div>
        </div>

        {isSearching ? (
          <div className="mx-auto mt-3 max-w-xl overflow-hidden rounded-xl border border-border bg-card text-left shadow-xs">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-7 text-center">
                <p className="text-xs font-semibold text-foreground">{tr("Không tìm thấy mục phù hợp")}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {tr("Thử từ khoá khác như: Sự kiện, Thành viên, Tài khoản, Cài đặt…")}
                </p>
              </div>
            ) : (
              <ul role="listbox" className="max-h-72 divide-y divide-border/60 overflow-y-auto">
                {filteredItems.map((item, idx) => {
                  const isActive = idx === clampedIndex;
                  return (
                    <li key={item.href} role="option" aria-selected={isActive}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => onOpenShortcut(item.href)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors",
                          isActive ? "bg-primary/8" : "hover:bg-muted/50",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={cn(
                              "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
                              isActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                            )}
                          >
                            {item.icon}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-foreground">{item.label}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{item.groupLabel}</p>
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          {isActive ? (
                            <CornerDownLeft size={13} className="text-primary" />
                          ) : (
                            <ArrowUpRight size={13} className="opacity-60" />
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-2.5 text-left sm:grid-cols-4 sm:gap-3">
            {defaultShortcuts.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => onOpenShortcut(item.href)}
                className="group flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-3.5 text-left shadow-2xs transition-all hover:border-primary/40 hover:bg-accent/40 hover:shadow-xs focus-visible:outline-2 focus-visible:outline-primary"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    {item.icon}
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="text-muted-foreground/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">{item.label}</p>
                  <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{item.groupLabel}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
          <PanelLeft size={12} className="text-primary" />
          {tr("Mẹo: Nhấn / để tìm nhanh hoặc bấm mục bất kỳ ở thanh bên trái.")}
        </p>
      </div>
    </div>
  );
}
