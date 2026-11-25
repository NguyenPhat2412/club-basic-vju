"use client";

import { MouseEvent, ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type RowAction = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

type MenuCoords = {
  right: number;
  top?: number;
  bottom?: number;
};

export function TableRowActions({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: globalThis.MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  if (actions.length === 0) return null;

  if (actions.length === 1) {
    const only = actions[0]!;
    return (
      <div className="flex items-center justify-end" onClick={(e: MouseEvent) => e.stopPropagation()}>
        <button
          type="button"
          title={only.label}
          aria-label={only.label}
          disabled={only.disabled}
          onClick={only.onClick}
          className={cn(
            "inline-flex h-7.5 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:opacity-50 [&_svg]:size-3.5",
            only.danger
              ? "border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive/10"
              : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-primary/40 hover:bg-white hover:text-primary",
          )}
        >
          {only.icon}
          <span className="max-w-28 truncate">{only.label}</span>
        </button>
      </div>
    );
  }

  const normalActions = actions.filter((a) => !a.danger);
  const dangerActions = actions.filter((a) => a.danger);

  const toggleMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const estimatedHeight = actions.length * 34 + (dangerActions.length > 0 && normalActions.length > 0 ? 16 : 12);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedHeight + 12 && rect.top > estimatedHeight + 12;
    const right = Math.max(8, window.innerWidth - rect.right);
    setCoords(
      openUpward
        ? { right, bottom: window.innerHeight - rect.top + 6 }
        : { right, top: rect.bottom + 6 },
    );
    setOpen(true);
  };

  const renderItem = (action: RowAction) => (
    <button
      key={action.label}
      type="button"
      role="menuitem"
      disabled={action.disabled}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(false);
        action.onClick();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-3.5 [&_svg]:shrink-0",
        action.danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-slate-700 hover:bg-primary/8 hover:text-primary [&_svg]:text-slate-500 hover:[&_svg]:text-primary",
      )}
    >
      {action.icon}
      <span className="truncate">{action.label}</span>
    </button>
  );

  return (
    <div className="flex items-center justify-end" onClick={(e: MouseEvent) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mở danh sách thao tác"
        onClick={toggleMenu}
        className={cn(
          "inline-flex h-7.5 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-2xs transition-colors",
          open
            ? "border-primary/45 bg-primary/8 text-primary"
            : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-white hover:text-slate-900",
        )}
      >
        <span>Thao tác</span>
        <ChevronDown size={13} className={cn("text-slate-400 transition-transform duration-150", open && "rotate-180 text-primary")} />
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              right: `${coords.right}px`,
              ...(coords.top !== undefined ? { top: `${coords.top}px` } : {}),
              ...(coords.bottom !== undefined ? { bottom: `${coords.bottom}px` } : {}),
            }}
            className="fade-in fixed z-[90] min-w-48 max-w-60 rounded-xl border border-slate-200/95 bg-white p-1.5 shadow-lg"
          >
            {normalActions.length > 0 && <div className="space-y-0.5">{normalActions.map(renderItem)}</div>}
            {dangerActions.length > 0 && (
              <div className={cn("space-y-0.5", normalActions.length > 0 && "mt-1.5 border-t border-slate-100 pt-1.5")}>
                {dangerActions.map(renderItem)}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function UserIdentityCell({
  name,
  subtitle,
  fallbackLabel = "Thành viên",
}: {
  name?: string | null;
  subtitle?: string | null;
  fallbackLabel?: string;
}) {
  const displayName = name?.trim() || fallbackLabel;
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
        {displayName.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="max-w-56 truncate font-bold text-foreground">{displayName}</p>
        {subtitle && <p className="max-w-56 truncate font-mono text-[10.5px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
