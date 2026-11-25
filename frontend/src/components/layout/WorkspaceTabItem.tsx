"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/I18nContext";
import type { WorkspaceTabSpec } from "./WorkspaceTabSpecs";

export function WorkspaceTabItem({
  spec,
  isActive,
  canClose,
  tabRef,
  activateTab,
  closeTab,
  setHoveredTip,
}: {
  spec: WorkspaceTabSpec;
  isActive: boolean;
  canClose: boolean;
  tabRef: (el: HTMLDivElement | null) => void;
  activateTab: (spec: WorkspaceTabSpec) => void;
  closeTab: (id: string) => void;
  setHoveredTip: (tip: { label: string; x: number; y: number } | null) => void;
}) {
  const { tr } = useI18n();
  return (
    <div
      ref={tabRef}
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
      onClick={() => activateTab(spec)}
      onAuxClick={(e) => {
        if (e.button === 1 && canClose) {
          e.preventDefault();
          closeTab(spec.id);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activateTab(spec);
        }
      }}
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHoveredTip({
          label: spec.label,
          x: rect.left + rect.width / 2,
          y: rect.bottom + 7,
        });
      }}
      onMouseLeave={() => setHoveredTip(null)}
      className={cn(
        "group relative flex h-6.5 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs transition-all focus-visible:outline-2 focus-visible:outline-primary",
        isActive
          ? "border border-slate-200/95 bg-white font-bold text-slate-900 shadow-2xs before:absolute before:inset-x-2 before:-top-[1px] before:h-[2.5px] before:rounded-full before:bg-primary"
          : "border border-transparent bg-slate-50/55 font-medium text-slate-600 hover:border-slate-200/70 hover:bg-slate-100/90 hover:text-slate-900"
      )}
    >
      <span className={cn("shrink-0", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")}>
        {spec.icon}
      </span>
      <span
        className={cn(
          "truncate",
          isActive ? "max-w-[180px] sm:max-w-[240px]" : "max-w-[92px] sm:max-w-[112px]"
        )}
      >
        {spec.label}
      </span>
      {canClose && (
        <button
          type="button"
          aria-label={`${tr("Đóng tab")} ${spec.label}`}
          onClick={(e) => {
            e.stopPropagation();
            closeTab(spec.id);
          }}
          className={cn(
            "ml-0.5 grid size-4 shrink-0 place-items-center rounded-sm transition-colors hover:bg-slate-200/80 hover:text-slate-900",
            isActive
              ? "text-slate-400"
              : "text-slate-400 opacity-70 group-hover:opacity-100"
          )}
        >
          <X size={11.5} />
        </button>
      )}
    </div>
  );
}
