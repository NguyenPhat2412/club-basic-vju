"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageSquarePlus, X } from "lucide-react";
import { useMyChatChannels } from "@/hooks/chat/useClubChat";
import { useUnreadNotificationSummary } from "@/hooks/notification/useGlobalRealtimeNotifications";
import { useChatDock } from "@/providers/ChatDockProvider";
import { FloatingChatWindow } from "@/components/chat/FloatingChatWindow";
import { resolveMediaUrl } from "@/lib/media";
import type { MyChatChannel } from "@/types/chat/chat.types";

function MinimizedChatHead({
  channel,
  onOpen,
  onClose,
}: {
  channel: MyChatChannel;
  onOpen: () => void;
  onClose: () => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = logoFailed ? null : resolveMediaUrl(channel.clubLogoUrl);
  const unread = channel.unreadCount ?? 0;

  return (
    <div className="group relative flex items-center hover:z-50">
      <div
        data-no-i18n="true"
        className="pointer-events-none absolute right-14 z-50 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl group-hover:block"
      >
        #{channel.name} · {channel.clubCode}
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Mở lại đoạn chat ${channel.name}`}
        className="relative flex size-12 items-center justify-center rounded-full border-2 border-white bg-white shadow-lg ring-1 ring-slate-200 transition-transform hover:scale-105"
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={channel.clubName}
            referrerPolicy="no-referrer"
            onError={() => setLogoFailed(true)}
            className="size-full rounded-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
            {channel.clubCode.slice(0, 3).toUpperCase()}
          </span>
        )}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[9.5px] font-bold text-white shadow-xs">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <button
        type="button"
        aria-label={`Đóng bong bóng ${channel.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute -right-1 -top-1 z-20 hidden size-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:text-destructive group-hover:flex"
      >
        <X size={11} />
      </button>
    </div>
  );
}

export function FloatingChatDock({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dock = useChatDock();
  const channelsQuery = useMyChatChannels(enabled);
  const unreadSummary = useUnreadNotificationSummary(enabled);

  const channels = useMemo(() => channelsQuery.data ?? [], [channelsQuery.data]);
  const reconcile = dock?.reconcileChannels;

  useEffect(() => {
    if (channelsQuery.isSuccess && reconcile) {
      reconcile(channels);
    }
  }, [channels, channelsQuery.isSuccess, reconcile]);

  const isOnFullChat = pathname === "/management" && searchParams.get("tab") === "chat";
  if (!enabled || !dock || isOnFullChat) return null;

  const byId = new Map(channels.map((ch) => [ch.id, ch]));
  const openChannels = dock.openIds.map((id) => byId.get(id)).filter((c): c is MyChatChannel => Boolean(c));
  const minimizedChannels = dock.minimizedIds.map((id) => byId.get(id)).filter((c): c is MyChatChannel => Boolean(c));
  const totalUnread = unreadSummary.data?.unreadChatMessages ?? 0;

  return (
    <div
      aria-label="Khung chat nổi CLB"
      className="pointer-events-none fixed bottom-0 right-4 z-40 hidden items-end gap-3 lg:flex"
    >
      <div className="relative z-10 flex items-end gap-3">
        {openChannels.map((ch) => (
          <FloatingChatWindow
            key={ch.id}
            channel={ch}
            onMinimize={() => dock.minimizeChannel(ch.id)}
            onClose={() => dock.closeChannel(ch.id)}
          />
        ))}
      </div>

      <div className="pointer-events-auto relative z-50 flex flex-col items-center gap-2.5 pb-4">
        {minimizedChannels.map((ch) => (
          <MinimizedChatHead
            key={ch.id}
            channel={ch}
            onOpen={() => dock.openChannel(ch.id)}
            onClose={() => dock.closeChannel(ch.id)}
          />
        ))}

        <button
          type="button"
          title="Mở danh sách đoạn chat CLB"
          aria-label="Mở danh sách đoạn chat CLB"
          onClick={dock.togglePicker}
          className="relative flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition-all hover:scale-105 hover:border-primary/40 hover:text-primary"
        >
          <MessageSquarePlus size={18} />
          {totalUnread > 0 && minimizedChannels.length === 0 && openChannels.length === 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[9.5px] font-bold text-white shadow-xs">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
