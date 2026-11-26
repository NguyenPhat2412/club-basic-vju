"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BellOff, ExternalLink, Hash, MessageCircle, Search, X } from "lucide-react";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { useMyChatChannels } from "@/hooks/chat/useClubChat";
import { useUnreadNotificationSummary } from "@/hooks/notification/useGlobalRealtimeNotifications";
import { useMutedChatChannels } from "@/forms/chat/chat-mute";
import { useChatDock } from "@/providers/ChatDockProvider";
import { formatChatTimeCompact } from "@/lib/chat-message-cache";
import { resolveMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { MyChatChannel } from "@/types/chat/chat.types";

function ClubChannelBadge({ channel }: { channel: MyChatChannel }) {
  const [failed, setFailed] = useState(false);
  const logo = failed ? null : resolveMediaUrl(channel.clubLogoUrl);
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={channel.clubName}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="size-10 shrink-0 rounded-full border border-slate-200 bg-white object-cover"
      />
    );
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-extrabold text-primary ring-1 ring-primary/15">
      {channel.clubCode.slice(0, 3).toUpperCase()}
    </span>
  );
}

export function TopbarChatMenu({ size = "sm" }: { size?: "sm" | "md" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const session = useOptionalSession();
  const dock = useChatDock();
  const [localOpen, setLocalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const containerRef = useRef<HTMLDivElement>(null);

  const open = dock ? dock.pickerOpen : localOpen;
  const setOpen = dock ? dock.setPickerOpen : setLocalOpen;

  const canQuery = Boolean(session.user && !session.mustChangePassword);
  const unreadSummary = useUnreadNotificationSummary(canQuery);
  const channelsQuery = useMyChatChannels(canQuery);
  const mutedChannels = useMutedChatChannels();

  const channels = useMemo(() => channelsQuery.data ?? [], [channelsQuery.data]);
  const channelUnreadSum = useMemo(
    () => channels.reduce((sum, ch) => sum + (ch.unreadCount ?? 0), 0),
    [channels],
  );
  const totalUnread = Math.max(unreadSummary.data?.unreadChatMessages ?? 0, channelUnreadSum);

  const isOnFullChat = pathname === "/management" && searchParams.get("tab") === "chat";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClickOutside);
    };
  }, [open, setOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return channels.filter((ch) => {
      if (filter === "unread" && (ch.unreadCount ?? 0) <= 0) return false;
      if (!q) return true;
      return (
        ch.name.toLowerCase().includes(q) ||
        ch.clubName.toLowerCase().includes(q) ||
        ch.clubCode.toLowerCase().includes(q) ||
        (ch.lastMessagePreview ?? "").toLowerCase().includes(q)
      );
    });
  }, [channels, filter, search]);

  const handleSelectChannel = (ch: MyChatChannel) => {
    setOpen(false);
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
    if (dock && isDesktop && !isOnFullChat) {
      dock.openChannel(ch.id);
      return;
    }
    router.push(`/management?tab=chat&clubId=${encodeURIComponent(ch.clubId)}&channelId=${encodeURIComponent(ch.id)}`);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Đoạn chat CLB"
        title="Đoạn chat CLB (Messenger)"
        aria-expanded={open}
        onClick={() => {
          const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
          if (!isDesktop) {
            setOpen(false);
            router.push("/management?tab=chat");
            return;
          }
          const next = !open;
          setOpen(next);
          if (next) void channelsQuery.refetch();
        }}
        className={cn(
          "relative grid shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary",
          size === "md" ? "size-9 text-slate-700" : "size-8",
          (open || isOnFullChat) && "border-primary/30 bg-primary/8 text-primary",
        )}
      >
        <MessageCircle size={size === "md" ? 17 : 15} />
        {totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9.5px] font-bold leading-none text-white shadow-2xs">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Đoạn chat câu lạc bộ"
          className="fade-in fixed inset-x-3 top-14 z-50 flex max-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-10 sm:w-[348px]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold tracking-tight text-slate-900">Đoạn chat CLB</h3>
              {totalUnread > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {`${totalUnread} mới`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Mở trang Chat toàn màn hình"
                onClick={() => {
                  setOpen(false);
                  router.push("/management?tab=chat");
                }}
                className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary"
              >
                <ExternalLink size={14} />
              </button>
              <button
                type="button"
                aria-label="Đóng danh sách chat"
                onClick={() => setOpen(false)}
                className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-2 border-b border-slate-100 px-3 py-2">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                maxLength={120}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kênh chat, tên CLB…"
                className="h-8 w-full rounded-full border border-slate-200 bg-slate-50 pl-8 pr-7 text-xs text-slate-900 outline-none focus:border-primary/40 focus:bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {(["all", "unread"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    filter === tab
                      ? "bg-primary/10 text-primary"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {tab === "all" ? `Tất cả (${channels.length})` : `Chưa đọc`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            {channelsQuery.isPending ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : !filtered.length ? (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                <MessageCircle size={24} className="mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">
                  {filter === "unread" ? "Bạn đã đọc hết mọi đoạn chat." : "Chưa có kênh chat phù hợp."}
                </p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {filtered.map((ch) => {
                  const unread = ch.unreadCount ?? 0;
                  const isMuted = mutedChannels.has(ch.id);
                  const time = ch.lastMessageAt ? formatChatTimeCompact(ch.lastMessageAt) : "";
                  return (
                    <li key={ch.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectChannel(ch)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-slate-100/90"
                      >
                        <ClubChannelBadge channel={ch} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <p className={cn("flex min-w-0 items-center gap-1 truncate text-xs text-slate-900", unread > 0 ? "font-extrabold" : "font-semibold")}>
                              <Hash size={11} className="shrink-0 text-slate-400" />
                              <span data-no-i18n="true" className="truncate">{ch.name}</span>
                              {isMuted && (
                                <span title="Đã tắt thông báo kênh" className="inline-flex shrink-0 text-slate-400">
                                  <BellOff size={10.5} />
                                </span>
                              )}
                            </p>
                            {time && (
                              <span className={cn("shrink-0 text-[10px]", unread > 0 ? "font-bold text-primary" : "text-slate-400")}>
                                {time}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span data-no-i18n="true" className="shrink-0 rounded bg-primary/8 px-1.5 py-0.5 text-[9.5px] font-bold text-primary">
                              {ch.clubCode}
                            </span>
                            {ch.lastMessagePreview ? (
                              <p data-no-i18n="true" className={cn("truncate text-[11px]", unread > 0 ? "font-semibold text-slate-800" : "text-slate-500")}>
                                {`${ch.lastSenderName ? `${ch.lastSenderName}: ` : ""}${ch.lastMessagePreview}`}
                              </p>
                            ) : (
                              <p className={cn("truncate text-[11px]", unread > 0 ? "font-semibold text-slate-800" : "text-slate-500")}>
                                Chưa có tin nhắn
                              </p>
                            )}
                          </div>
                        </div>
                        {unread > 0 && (
                          <span className="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-2 text-center">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/management?tab=chat");
              }}
              className="text-xs font-bold text-primary hover:underline"
            >
              Xem toàn bộ trong Chat &amp; AI CLB
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
