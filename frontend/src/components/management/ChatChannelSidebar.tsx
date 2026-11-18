"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Hash, Plus, Trash2 } from "lucide-react";
import type { ChatChannel } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ChatChannelSidebar({
  channels,
  activeChannelId,
  canCreateChannel,
  canDeleteChannel,
  onSelectChannel,
  onWarmChannel,
  onOpenCreateModal,
  onRequestDeleteChannel,
}: {
  channels: ChatChannel[];
  activeChannelId: string;
  canCreateChannel: boolean;
  canDeleteChannel: (ch: ChatChannel) => boolean;
  onSelectChannel: (channelId: string) => void;
  onWarmChannel: (channelId: string) => void;
  onOpenCreateModal: () => void;
  onRequestDeleteChannel: (ch: ChatChannel) => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ ch: ChatChannel; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = (e: Event) => {
      if (e instanceof PointerEvent && menuRef.current?.contains(e.target as Node)) return;
      setCtxMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCtxMenu(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
    };
  }, [ctxMenu]);

  return (
    <aside className="flex min-h-0 shrink-0 flex-col border-b border-border/60 bg-muted/[0.16] lg:h-full lg:border-r lg:border-b-0">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 px-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Kênh ({channels.length})
        </span>
        {canCreateChannel && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            aria-label="Tạo kênh mới"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background px-2 text-[11px] font-semibold text-foreground hover:bg-muted"
          >
            <Plus size={12} /> Tạo kênh
          </button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto p-1.5 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
        {channels.map((ch) => {
          const active = ch.id === activeChannelId;
          const unread = (ch.unreadCount ?? 0) > 0 && !active;
          const deletable = canDeleteChannel(ch);

          return (
            <div
              key={ch.id}
              onContextMenu={(e) => {
                if (!deletable) return;
                e.preventDefault();
                setCtxMenu({ ch, x: e.clientX, y: e.clientY });
              }}
              className={cn(
                "group relative flex shrink-0 items-center justify-between gap-1 rounded-lg px-2.5 py-2 text-left text-xs transition-colors lg:w-full",
                active
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-foreground/85 hover:bg-muted/70"
              )}
            >
              <button
                type="button"
                aria-current={active ? "true" : undefined}
                onPointerEnter={() => onWarmChannel(ch.id)}
                onFocus={() => onWarmChannel(ch.id)}
                onClick={() => onSelectChannel(ch.id)}
                className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
              >
                <span className="flex w-full min-w-0 items-center justify-between gap-1.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Hash size={13} className="shrink-0 opacity-75" />
                    <span className="max-w-[140px] truncate lg:max-w-none">{ch.name}</span>
                  </span>
                  {unread && (
                    <span className="grid min-w-4 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">
                      {ch.unreadCount! > 99 ? "99+" : ch.unreadCount}
                    </span>
                  )}
                </span>
                {ch.departmentName && (
                  <span className="hidden w-full truncate pl-5 text-[10.5px] font-normal text-muted-foreground lg:block">
                    {ch.departmentName}
                  </span>
                )}
              </button>

              {deletable && (
                <button
                  type="button"
                  title={`Xoá kênh #${ch.name}`}
                  aria-label={`Xoá kênh ${ch.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestDeleteChannel(ch);
                  }}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {ctxMenu &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              left: Math.min(ctxMenu.x, (typeof window !== "undefined" ? window.innerWidth : 1024) - 210),
              top: Math.min(ctxMenu.y, (typeof window !== "undefined" ? window.innerHeight : 768) - 80),
            }}
            onContextMenu={(e) => e.preventDefault()}
            className="fixed z-50 w-[200px] rounded-xl border border-border bg-card p-1.5 text-xs shadow-xl"
          >
            <div className="mb-1 truncate border-b border-border/60 px-2 py-1 text-[11px] font-bold text-foreground">
              # {ctxMenu.ch.name}
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const target = ctxMenu.ch;
                setCtxMenu(null);
                onRequestDeleteChannel(target);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-semibold text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={13} className="shrink-0" />
              <span>Xoá kênh / nhóm chat</span>
            </button>
          </div>,
          document.body
        )}
    </aside>
  );
}
