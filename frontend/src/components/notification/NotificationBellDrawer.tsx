"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  CheckCheck,
  ExternalLink,
  Inbox,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { apiModel, Notification } from "@/lib/api";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import {
  UNREAD_SUMMARY_QUERY_KEY,
  useUnreadNotificationSummary,
} from "@/hooks/notification/useGlobalRealtimeNotifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  notificationReferenceMeta as referenceMeta,
  targetHrefForNotification as targetHrefFor,
} from "@/forms/notification/notification-links";
import { cn, formatDateTime } from "@/lib/utils";
import { useI18n } from "@/providers/I18nContext";

const emptySubscribe = () => () => {};
const APP_REVIEW_PERMS = ["application.view", "application.review", "application.approve", "application.reject"];

type NotifFilter = "all" | "unread" | "chat" | "club" | "ops";

export function NotificationBellDrawer({
  active = false,
  size = "sm",
}: {
  active?: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useOptionalSession();
  const { tr } = useI18n();
  const bellLabel = tr("Thông báo");
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotifFilter>("all");
  const [search, setSearch] = useState("");

  const canReviewApps = APP_REVIEW_PERMS.some(session.can);
  const canQuery = Boolean(session.user && !session.mustChangePassword);
  const unreadSummary = useUnreadNotificationSummary(canQuery);

  const list = useQuery({
    queryKey: ["notifications", 0, "bell-drawer"],
    queryFn: () => apiModel.notifications(0, 40),
    enabled: canQuery,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: UNREAD_SUMMARY_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "notifications"] });
  };

  const markRead = useMutation({
    mutationFn: apiModel.markNotificationRead,
    onSuccess: refresh,
  });

  const markAllRead = useMutation({
    mutationFn: apiModel.markAllNotificationsRead,
    onSuccess: refresh,
  });

  const items = useMemo(() => list.data?.items ?? [], [list.data?.items]);
  const pageUnreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);
  const unreadCount = unreadSummary.data?.unreadNotifications ?? pageUnreadCount;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((n) => {
      const meta = referenceMeta(n.referenceType);
      if (filter === "unread" && n.read) return false;
      if (filter === "chat" && meta.group !== "chat") return false;
      if (filter === "club" && meta.group !== "club") return false;
      if (filter === "ops" && meta.group !== "ops") return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        meta.label.toLowerCase().includes(q)
      );
    });
  }, [filter, items, search]);

  const handleSelectItem = (n: Notification, customHref?: string) => {
    if (!n.read && !markRead.isPending) {
      markRead.mutate(n.id);
    }
    const href = customHref ?? targetHrefFor(n)?.href;
    if (href) {
      setOpen(false);
      router.push(href);
    }
  };

  return (
    <>
      <button
        type="button"
        data-no-i18n="true"
        aria-label={bellLabel}
        title={bellLabel}
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
          list.refetch();
        }}
        className={cn(
          "relative grid shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary",
          size === "md" ? "size-9 text-slate-700" : "size-8",
          (active || open) && "border-primary/30 bg-primary/8 text-primary"
        )}
      >
        <Bell size={size === "md" ? 17 : 15} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9.5px] font-bold leading-none text-white shadow-2xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isClient &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[75] flex justify-end overflow-x-hidden bg-black/45 backdrop-blur-2xs"
            onMouseDown={() => setOpen(false)}
          >
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Thông báo hệ thống"
              onMouseDown={(e) => e.stopPropagation()}
              className="slide-in-right flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3.5 sm:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bell size={16} />
                  </span>
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="truncate whitespace-nowrap text-sm font-bold text-slate-900">Thông báo</h3>
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      {unreadCount} chưa đọc
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label="Tải lại thông báo"
                    title="Tải lại"
                    onClick={() => list.refetch()}
                    className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-800"
                  >
                    <RefreshCw size={14} className={cn(list.isFetching && "animate-spin")} />
                  </button>
                  {unreadCount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-[11px]"
                      disabled={markAllRead.isPending}
                      onClick={() => markAllRead.mutate()}
                    >
                      <CheckCheck size={13} /> Đọc hết
                    </Button>
                  )}
                  <button
                    type="button"
                    aria-label="Đóng ngăn thông báo"
                    onClick={() => setOpen(false)}
                    className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-800"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Quick Search */}
              <div className="space-y-2 border-b border-slate-100 bg-white px-4 py-2.5 sm:px-5">
                <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100/90 p-1">
                  {(
                    [
                      { key: "all", label: `Tất cả (${items.length})` },
                      { key: "unread", label: `Chưa đọc (${unreadCount})` },
                      { key: "chat", label: "Tin nhắn" },
                      { key: "club", label: "CLB & Đơn" },
                      { key: "ops", label: "Hoạt động" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilter(tab.key)}
                      className={cn(
                        "flex-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold transition-all",
                        filter === tab.key
                          ? "bg-white font-bold text-primary shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search size={13.5} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Lọc nhanh tiêu đề, nội dung thông báo…"
                    aria-label="Lọc nhanh thông báo"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-hidden"
                  />
                  {search && (
                    <button
                      type="button"
                      aria-label="Xoá từ khoá"
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
                {list.isPending ? (
                  <div className="space-y-2.5 p-4">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={i} className="h-18 animate-pulse rounded-xl bg-slate-100" />
                    ))}
                  </div>
                ) : !filteredItems.length ? (
                  <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-14 text-center">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Inbox size={22} />
                    </span>
                    <p className="text-sm font-bold text-slate-900">
                      {items.length === 0 ? "Chưa có thông báo nào" : "Không có thông báo khớp bộ lọc"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {items.length === 0
                        ? "Các thông báo xét duyệt đơn, công việc và sự kiện sẽ hiển thị trực tiếp tại đây."
                        : "Thử chuyển sang mục Tất cả hoặc xoá từ khoá tìm kiếm."}
                    </p>
                  </div>
                ) : (
                  filteredItems.map((n) => {
                    const target = targetHrefFor(n);
                    const meta = referenceMeta(n.referenceType);
                    const isAppNotif =
                      n.referenceType === "CLUB_APPLICATION" || n.referenceType === "APPLICATION";
                    return (
                      <div
                        key={n.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectItem(n)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSelectItem(n);
                          }
                        }}
                        className={cn(
                          "group cursor-pointer px-4 py-3.5 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-hidden sm:px-5",
                          !n.read && "bg-primary/[0.035]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-2">
                            <span
                              className={cn(
                                "mt-1.5 size-2 shrink-0 rounded-full",
                                n.read ? "bg-slate-200" : "bg-primary"
                              )}
                            />
                            <div className="min-w-0">
                              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                <Badge tone={meta.tone} dot={false}>
                                  {meta.label}
                                </Badge>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {formatDateTime(n.createdAt)}
                                </span>
                              </div>
                              <p
                                className={cn(
                                  "text-xs leading-snug text-slate-900",
                                  !n.read ? "font-bold" : "font-medium"
                                )}
                              >
                                {n.title}
                              </p>
                            </div>
                          </div>
                          {!n.read && (
                            <button
                              type="button"
                              aria-label="Đánh dấu đã đọc"
                              title="Đánh dấu đã đọc"
                              onClick={(e) => {
                                e.stopPropagation();
                                markRead.mutate(n.id);
                              }}
                              className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-white hover:text-primary"
                            >
                              <CheckCheck size={13} />
                            </button>
                          )}
                        </div>

                        <p className="mt-1 line-clamp-2 pl-4 text-xs leading-relaxed text-slate-600">
                          {n.message}
                        </p>

                        {(target || (isAppNotif && canReviewApps)) && (
                          <div className="mt-2 flex flex-wrap items-center justify-end gap-2 pl-4">
                            {isAppNotif && canReviewApps && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectItem(n, "/management?tab=applications");
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10"
                              >
                                Hàng đợi duyệt CLB <ArrowRight size={11} />
                              </button>
                            )}
                            {target && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:underline">
                                {target.label} <ExternalLink size={11} />
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
                <span className="text-[11px] text-slate-500">
                  Tổng cộng {list.data?.total ?? 0} thông báo
                </span>
                <Link
                  href="/notifications"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Quản lý tất cả <ArrowRight size={13} />
                </Link>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
