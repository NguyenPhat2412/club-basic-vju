"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { Bell, CheckCheck, ExternalLink, Eye, FilterX, Search, X } from "lucide-react";
import { apiModel, Notification } from "@/lib/api";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer } from "@/components/shared/Overlays";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { targetHrefForNotification } from "@/forms/notification/notification-links";
import { formatDateTime, formatDay, formatTime } from "@/lib/utils";
import { BrowserNotificationToggle } from "./BrowserNotificationToggle";

export const targetHrefFor = targetHrefForNotification;

export function NotificationsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState<"" | "unread" | "read">("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const hasClientFilter = Boolean(search.trim() || readFilter || typeFilter);
  const queryOffset = hasClientFilter ? 0 : offset;
  const queryLimit = hasClientFilter ? 100 : limit;

  const list = useQuery({
    queryKey: qk.notifications(queryOffset, queryLimit),
    queryFn: () => apiModel.notifications(queryOffset, queryLimit),
    placeholderData: keepPreviousData,
  });

  const detail = useQuery({
    queryKey: qk.notifications("detail", selectedId),
    queryFn: () => apiModel.notificationDetail(selectedId!),
    enabled: !!selectedId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.notifications() });
    queryClient.invalidateQueries({ queryKey: qk.unreadSummary() });
    queryClient.invalidateQueries({ queryKey: qk.dashboard("notifications") });
  };

  const markRead = useMutation({ mutationFn: apiModel.markNotificationRead, onSuccess: refresh });
  const markAllRead = useMutation({ mutationFn: apiModel.markAllNotificationsRead, onSuccess: refresh });

  const openNotification = (n: Notification) => {
    setSelectedId(n.id);
    if (!n.read && !markRead.isPending) {
      markRead.mutate(n.id);
    }
  };

  const rawItems = useMemo(() => list.data?.items ?? [], [list.data?.items]);
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rawItems.filter((n) => {
      if (readFilter === "unread" && n.read) return false;
      if (readFilter === "read" && !n.read) return false;
      if (typeFilter && (n.referenceType ?? "") !== typeFilter) return false;
      if (!q) return true;
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    });
  }, [rawItems, search, readFilter, typeFilter]);

  const visibleRows = hasClientFilter ? filteredItems.slice(offset, offset + limit) : filteredItems;
  const effectiveTotal = hasClientFilter ? filteredItems.length : (list.data?.total ?? 0);
  const unread = rawItems.filter((n) => !n.read).length;
  const activeDetail = detail.data;
  const activeLink = activeDetail ? targetHrefFor(activeDetail) : null;

  const resetFilters = () => {
    setSearch("");
    setReadFilter("");
    setTypeFilter("");
    setOffset(0);
  };

  return (
    <ListPage title="Thông báo">
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-1.5 border-b border-border bg-white px-3 py-1.5 sm:px-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <CountBadge>{unread} chưa đọc</CountBadge>
          <div className="relative min-w-[160px] flex-1 sm:max-w-[220px]">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              placeholder="Tìm tiêu đề hoặc nội dung…"
              className="h-8 pl-8 pr-7 text-xs"
            />
            {search && (
              <button
                type="button"
                aria-label="Xoá tìm kiếm"
                onClick={() => {
                  setSearch("");
                  setOffset(0);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <Select
            aria-label="Lọc trạng thái đọc"
            value={readFilter}
            onChange={(e) => {
              setReadFilter(e.target.value as "" | "unread" | "read");
              setOffset(0);
            }}
            className="h-8 w-full text-xs sm:w-34"
          >
            <option value="">Mọi trạng thái</option>
            <option value="unread">Chưa đọc</option>
            <option value="read">Đã đọc</option>
          </Select>

          <Select
            aria-label="Lọc phân hệ thông báo"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setOffset(0);
            }}
            className="h-8 w-full text-xs sm:w-40"
          >
            <option value="">Mọi phân hệ</option>
            <option value="CHAT">Tin nhắn & Kênh Chat</option>
            <option value="CLUB_APPLICATION_REVIEW">Đơn ứng tuyển (BCN)</option>
            <option value="CLUB_APPLICATION">Đơn đăng ký cá nhân</option>
            <option value="EVENT">Sự kiện CLB</option>
            <option value="TASK">Công việc</option>
            <option value="DOCUMENT">Kho tài liệu</option>
          </Select>

          {hasClientFilter && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="h-8">
              <FilterX size={13} /> Xoá lọc
            </Button>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <BrowserNotificationToggle />
          {unread > 0 && (
            <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" disabled={markAllRead.isPending} onClick={() => markAllRead.mutate()}>
              <CheckCheck size={13} /> Đọc tất cả
            </Button>
          )}
        </div>
      </div>

      {list.isPending ? (
        <LoadingRows />
      ) : list.isError ? (
        <ErrorState message={describeError(list.error)} onRetry={() => list.refetch()} />
      ) : !visibleRows.length ? (
        <EmptyState
          icon={<Bell />}
          title={hasClientFilter ? "Không có thông báo khớp bộ lọc" : "Chưa có thông báo"}
          description={
            hasClientFilter
              ? "Thử xoá điều kiện lọc để xem toàn bộ lịch sử thông báo."
              : "Khi đơn đăng ký được xét duyệt hoặc câu lạc bộ gửi thông báo, nội dung sẽ hiển thị tại đây."
          }
          actionLabel={hasClientFilter ? "Xoá bộ lọc" : undefined}
          onAction={hasClientFilter ? resetFilters : undefined}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Thông báo"
            minWidth="min-w-[780px]"
            rows={visibleRows}
            rowKey={(n) => n.id}
            onRowClick={openNotification}
            columns={[
              {
                key: "time",
                header: "Thời gian",
                className: "whitespace-nowrap",
                sortValue: (n) => n.createdAt,
                render: (n) => (
                  <div className="font-mono">
                    <b className="text-primary">{formatDay(n.createdAt)}</b>
                    <span className="ml-1.5 text-muted-foreground">{formatTime(n.createdAt)}</span>
                  </div>
                ),
              },
              {
                key: "title",
                header: "Tiêu đề",
                className: "min-w-[200px] max-w-[280px]",
                sortValue: (n) => n.title,
                render: (n) => (
                  <span className={n.read ? "line-clamp-1" : "line-clamp-1 font-bold text-foreground"}>
                    {n.title}
                  </span>
                ),
              },
              {
                key: "message",
                header: "Nội dung",
                className: "max-w-[380px] whitespace-normal",
                render: (n) => <span className="line-clamp-2 text-muted-foreground">{n.message}</span>,
              },
              {
                key: "status",
                header: "Trạng thái",
                className: "whitespace-nowrap",
                sortValue: (n) => Number(n.read),
                render: (n) => (n.read ? <Badge>Đã đọc</Badge> : <Badge tone="primary">Chưa đọc</Badge>),
              },
              {
                key: "actions",
                header: "Thao tác",
                className: "text-right whitespace-nowrap",
                render: (n) => {
                  const link = targetHrefFor(n);
                  return (
                    <TableRowActions
                      actions={[
                        { icon: <Eye />, label: "Xem chi tiết", onClick: () => openNotification(n) },
                        ...(link
                          ? [
                              {
                                icon: <ExternalLink />,
                                label: link.label,
                                onClick: () => {
                                  if (!n.read) markRead.mutate(n.id);
                                  router.push(link.href);
                                },
                              },
                            ]
                          : []),
                        {
                          icon: <CheckCheck />,
                          label: "Đánh dấu đã đọc",
                          onClick: () => markRead.mutate(n.id),
                          disabled: n.read || markRead.isPending,
                        },
                      ]}
                    />
                  );
                },
              },
            ]}
          />
          <Pagination
            offset={offset}
            limit={limit}
            total={effectiveTotal}
            onOffset={setOffset}
            onLimit={setLimit}
          />
        </>
      )}

      <EntityDrawer
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={activeDetail?.title ?? "Chi tiết thông báo"}
        subtitle={activeDetail ? formatDateTime(activeDetail.createdAt) : undefined}
        icon={<Bell />}
        footer={
          activeDetail ? (
            <div className="flex flex-wrap items-center gap-2">
              {!activeDetail.read && (
                <Button variant="outline" size="sm" disabled={markRead.isPending} onClick={() => markRead.mutate(activeDetail.id)}>
                  <CheckCheck size={14} /> Đánh dấu đã đọc
                </Button>
              )}
              {activeLink && (
                <Button size="sm" onClick={() => router.push(activeLink.href)}>
                  <ExternalLink size={14} /> {activeLink.label}
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        {detail.isPending ? (
          <LoadingRows rows={3} />
        ) : detail.isError ? (
          <ErrorState message={describeError(detail.error)} onRetry={() => detail.refetch()} />
        ) : (
          activeDetail && (
            <DetailList
              rows={[
                ["Trạng thái", activeDetail.read ? <Badge key="r">Đã đọc</Badge> : <Badge key="u" tone="primary">Chưa đọc</Badge>],
                ["Thời gian", formatDateTime(activeDetail.createdAt)],
                ["Tiêu đề", <span key="t" className="font-bold">{activeDetail.title}</span>],
                ["Nội dung", <p key="m" className="whitespace-pre-line leading-6 text-foreground">{activeDetail.message}</p>],
              ]}
            />
          )
        )}
      </EntityDrawer>
    </ListPage>
  );
}
