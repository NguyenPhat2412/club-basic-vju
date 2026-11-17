"use client";

import { RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/I18nContext";
import type { WorkspaceTabSpec } from "./WorkspaceTabSpecs";

export function WorkspaceTabMenu({
  openSpecs,
  activeId,
  activateTab,
  closeTab,
  resetStarterTabs,
  closeOtherTabs,
  closeAllToOverview,
}: {
  openSpecs: WorkspaceTabSpec[];
  activeId: string;
  activateTab: (spec: WorkspaceTabSpec) => void;
  closeTab: (id: string) => void;
  resetStarterTabs: () => void;
  closeOtherTabs: () => void;
  closeAllToOverview: () => void;
}) {
  const { tr } = useI18n();
  return (
    <div
      role="menu"
      className="panel-modal absolute right-0 top-9 z-50 w-68 overflow-hidden p-1.5 fade-in"
    >
      <div className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
        {tr("Trang đang mở")} ({openSpecs.length})
      </div>
      <div className="max-h-64 space-y-0.5 overflow-y-auto">
        {openSpecs.map((spec) => {
          const isActive = spec.id === activeId;
          return (
            <div
              key={spec.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                isActive ? "bg-primary/8 font-bold text-primary" : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <button
                type="button"
                onClick={() => activateTab(spec)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className={cn("shrink-0", isActive ? "text-primary" : "text-slate-400")}>
                  {spec.icon}
                </span>
                <div className="min-w-0">
                  <p className="truncate">{spec.label}</p>
                  <p className="truncate text-[10px] font-normal text-slate-400">{spec.groupLabel}</p>
                </div>
              </button>
              {openSpecs.length > 1 && (
                <button
                  type="button"
                  aria-label={`${tr("Đóng tab")} ${spec.label}`}
                  onClick={() => closeTab(spec.id)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-800"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5">
        <button
          type="button"
          onClick={resetStarterTabs}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          <RotateCcw size={13} className="text-primary" /> {tr("Khôi phục bộ tab quản lý chuẩn")}
        </button>
        <button
          type="button"
          onClick={closeOtherTabs}
          className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          {tr("Đóng các tab khác")}
        </button>
        <button
          type="button"
          onClick={closeAllToOverview}
          className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          {tr("Thu gọn về Tổng quan")}
        </button>
      </div>
    </div>
  );
}
