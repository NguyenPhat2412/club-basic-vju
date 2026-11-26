"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, ChevronDown, Hash, Images, Maximize2, Minus, Search, X } from "lucide-react";
import type { ChatAppearanceConfig } from "@/forms/chat/chat-appearance";
import type { FloatingChatSize } from "@/providers/ChatDockProvider";
import type { WsConnectionStatus } from "@/hooks/chat/useChatRealtime";
import { resolveMediaUrl } from "@/lib/media";
import { ChatAppearancePopover } from "@/components/management/ChatAppearancePopover";
import { FloatingChatAiPopover } from "@/components/chat/FloatingChatAiPopover";
import { cn } from "@/lib/utils";
import type { MyChatChannel } from "@/types/chat/chat.types";

const MENU_ITEM =
  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900";

export function FloatingChatHeader({
  channel,
  wsStatus,
  muted,
  onToggleMute,
  searchOpen,
  onToggleSearch,
  channelMediaCount,
  onOpenGallery,
  canSummarize,
  hasUserMessages,
  aiOpen,
  onAiOpenChange,
  appearance,
  onUpdateAppearance,
  onResetAppearance,
  windowSize,
  onWindowSizeChange,
  onExpandFull,
  onMinimize,
  onClose,
}: {
  channel: MyChatChannel;
  wsStatus: WsConnectionStatus;
  muted: boolean;
  onToggleMute: () => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  channelMediaCount: number;
  onOpenGallery: () => void;
  canSummarize: boolean;
  hasUserMessages: boolean;
  aiOpen: boolean;
  onAiOpenChange: (open: boolean) => void;
  appearance: ChatAppearanceConfig;
  onUpdateAppearance: (patch: Partial<ChatAppearanceConfig>) => void;
  onResetAppearance: () => void;
  windowSize: FloatingChatSize;
  onWindowSizeChange?: (size: FloatingChatSize) => void;
  onExpandFull: () => void;
  onMinimize: () => void;
  onClose: () => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const clubLogo = logoFailed ? null : resolveMediaUrl(channel.clubLogoUrl);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="relative z-40 flex items-center justify-between gap-1.5 rounded-t-2xl border-b border-slate-200 bg-white px-2.5 py-2">
      <div ref={menuRef} className="static min-w-0 flex-1">
        <button
          type="button"
          title="Tuỳ chọn đoạn chat"
          aria-label="Tuỳ chọn đoạn chat"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            "flex w-full min-w-0 items-center gap-2 rounded-xl px-1 py-0.5 text-left transition-colors hover:bg-slate-100/90",
            menuOpen && "bg-slate-100",
          )}
        >
          <div className="relative shrink-0">
            {clubLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clubLogo}
                alt={channel.clubName}
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="size-8 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <span data-no-i18n="true" className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-[10.5px] font-extrabold text-primary">
                {channel.clubCode.slice(0, 3).toUpperCase()}
              </span>
            )}
            <span
              title={wsStatus === "connected" ? "Trực tuyến" : "Đang kết nối…"}
              className={cn(
                "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white",
                wsStatus === "connected" ? "bg-primary" : "bg-slate-400",
              )}
            />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="flex items-center gap-1 truncate text-xs font-extrabold text-slate-900">
              <Hash size={11} className="shrink-0 text-primary" />
              <span data-no-i18n="true" className="truncate">{channel.name}</span>
              {muted && (
                <span title="Đã tắt thông báo kênh" className="inline-flex shrink-0 text-slate-400">
                  <BellOff size={10.5} />
                </span>
              )}
              <ChevronDown
                size={12}
                className={cn("shrink-0 text-slate-400 transition-transform", menuOpen && "rotate-180 text-primary")}
              />
            </p>
            <p data-no-i18n="true" className="truncate text-[10.5px] text-slate-500">
              {channel.clubCode} · {channel.clubName}
            </p>
          </div>
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label="Tuỳ chọn đoạn chat"
            className="tg-pop-in absolute left-2 top-full z-50 mt-1.5 w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => { setMenuOpen(false); onToggleSearch(); }}
              className={cn(MENU_ITEM, searchOpen && "bg-primary/8 text-primary")}
            >
              <span className="inline-flex items-center gap-2">
                <Search size={13.5} className="text-primary" /> Tìm trong đoạn chat
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={channelMediaCount === 0}
              onClick={() => { setMenuOpen(false); onOpenGallery(); }}
              className={cn(MENU_ITEM, channelMediaCount === 0 && "opacity-45")}
            >
              <span className="inline-flex items-center gap-2">
                <Images size={13.5} className="text-primary" /> Ảnh &amp; video trong đoạn chat
              </span>
              {channelMediaCount > 0 && (
                <span data-no-i18n="true" className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                  {channelMediaCount}
                </span>
              )}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { setMenuOpen(false); onToggleMute(); }}
              className={MENU_ITEM}
            >
              <span className="inline-flex items-center gap-2">
                {muted ? <Bell size={13.5} className="text-primary" /> : <BellOff size={13.5} className="text-slate-500" />}
                {muted ? "Bật thông báo kênh" : "Tắt thông báo kênh"}
              </span>
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              role="menuitem"
              onClick={() => { setMenuOpen(false); onExpandFull(); }}
              className={MENU_ITEM}
            >
              <span className="inline-flex items-center gap-2">
                <Maximize2 size={13.5} className="text-slate-500" /> Mở toàn màn hình
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <FloatingChatAiPopover
          channelId={channel.id}
          canSummarize={canSummarize}
          hasUserMessages={hasUserMessages}
          open={aiOpen}
          onOpenChange={onAiOpenChange}
        />
        <ChatAppearancePopover
          iconOnly
          config={appearance}
          onUpdate={onUpdateAppearance}
          onReset={onResetAppearance}
          floatingSize={windowSize}
          onFloatingSizeChange={onWindowSizeChange}
        />
        <button
          type="button"
          title="Thu gọn thành bong bóng"
          aria-label="Thu gọn thành bong bóng"
          onClick={onMinimize}
          className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          title="Đóng khung chat"
          aria-label="Đóng khung chat"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-destructive"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
}
