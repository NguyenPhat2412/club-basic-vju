"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ExternalLink, Eye } from "lucide-react";
import { apiModel, Notification } from "@/lib/api";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer } from "@/components/shared/Overlays";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatDay, formatTime } from "@/lib/utils";

const LIMIT = 20;

function targetHrefFor(n: Notification): { href: string; label: string } | null {
  if (n.referenceType === "CLUB_APPLICATION" && n.referenceId) {
    return { href: `/applications?applicationId=${n.referenceId}`, label: "Xem đơn đăng ký" };
  }
  if (n.referenceType === "CLUB") {
    return { href: n.referenceId ? `/clubs?clubId=${n.referenceId}` : "/clubs", label: "Xem câu lạc bộ" };
  }
  if (n.referenceType === "EVENT") {
    return { href: "/events", label: "Xem sự kiện & đăng ký" };
  }
  if (n.referenceType === "TASK") {
    return { href: "/schedule", label: "Xem công việc & tiến độ" };
  }
  if (n.referenceType === "MEMBERSHIP") {
    return { href: "/memberships", label: "Xem tư cách thành viên" };
  }
  if (n.referenceType === "DEPARTMENT") {
    return { href: "/management?tab=departments", label: "Xem ban chuyên môn" };
  }
  return null;
}

export function NotificationsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["notifications", offset],
    queryFn: () => apiModel.notifications(offset, LIMIT),
    placeholderData: keepPreviousData,
  });

  const detail = useQuery({
    queryKey: ["notifications", "detail", selectedId],
    queryFn: () => apiModel.notificationDetail(selectedId!),
    enabled: !!selectedId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "notifications"] });
  };

  const markRead = useMutation({ mutationFn: apiModel.markNotificationRead, onSuccess: refresh });
  const markAllRead = useMutation({ mutationFn: apiModel.markAllNotificationsRead, onSuccess: refresh });

  const openNotification = (n: Notification) => {
    setSelectedId(n.id);
    if (!n.read && !markRead.isPending) {
      markRead.mutate(n.id);
    }
  };

  const unread = list.data?.items.filter((n) => !n.read).length ?? 0;
  const activeDetail = detail.data;
  const activeLink = activeDetail ? targetHrefFor(activeDetail) : null;

  return (
    <ListPage title="Thông báo">
      <BreadcrumbToolbar
        crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Cá nhân" }, { label: "Thông báo" }]}
        titleBadge={<CountBadge>{unread} chưa đọc</CountBadge>}
        extraActions={
          unread > 0 ? (
            <Button size="sm" variant="outline" disabled={markAllRead.isPending} onClick={() => markAllRead.mutate()}>
              <CheckCheck size={14} /> Đánh dấu đã đọc tất cả
            </Button>
          ) : undefined
        }
        onRefresh={() => {
          list.refetch();
          if (selectedId) detail.refetch();
        }}
      />
      {list.isPending ? (
        <LoadingRows />
      ) : list.isError ? (
        <ErrorState message={describeError(list.error)} onRetry={() => list.refetch()} />
      ) : !list.data.items.length ? (
        <EmptyState
          icon={<Bell />}
          title="Chưa có thông báo"
          description="Khi đơn đăng ký được xét duyệt hoặc câu lạc bộ gửi thông báo, nội dung sẽ hiển thị tại đây."
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Thông báo"
            minWidth="min-w-[820px]"
            rows={list.data.items}
            rowKey={(n) => n.id}
            onRowClick={openNotification}
            columns={[
              {
                key: "time",
                header: "Thời gian",
                render: (n) => (
                  <div className="font-mono">
                    <b className="text-primary">{formatDay(n.createdAt)}</b>
                    <span className="ml-2 text-muted-foreground">{formatTime(n.createdAt)}</span>
                  </div>
                ),
              },
              {
                key: "title",
                header: "Tiêu đề",
                render: (n) => <span className={n.read ? "" : "font-bold text-foreground"}>{n.title}</span>,
              },
              {
                key: "message",
                header: "Nội dung",
                className: "max-w-[420px] whitespace-normal",
                render: (n) => <span className="line-clamp-2 text-muted-foreground">{n.message}</span>,
              },
              {
                key: "status",
                header: "Trạng thái",
                render: (n) => (n.read ? <Badge>Đã đọc</Badge> : <Badge tone="primary">Chưa đọc</Badge>),
              },
              {
                key: "actions",
                header: "Thao tác",
                className: "text-right",
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
          <Pagination offset={offset} limit={LIMIT} total={list.data.total} onOffset={setOffset} />
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
