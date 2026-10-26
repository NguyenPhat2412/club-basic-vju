"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { apiModel } from "@/lib/api";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDay, formatTime } from "@/lib/utils";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["notifications"], queryFn: apiModel.notifications });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "notifications"] });
  };
  const markRead = useMutation({ mutationFn: apiModel.markNotificationRead, onSuccess: refresh });
  const markAllRead = useMutation({ mutationFn: apiModel.markAllNotificationsRead, onSuccess: refresh });
  const unread = list.data?.items.filter((n) => !n.read).length ?? 0;
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
        onRefresh={() => list.refetch()}
      />
      {list.isPending ? <LoadingRows /> : list.isError ? <ErrorState message={describeError(list.error)} onRetry={() => list.refetch()} />
        : !list.data.items.length ? <EmptyState icon={<Bell />} title="Chưa có thông báo" />
          : <DataTable ariaLabel="Thông báo" minWidth="min-w-[820px]" rows={list.data.items} rowKey={(n) => n.id} columns={[
            { key: "time", header: "Thời gian", render: (n) => <div className="font-mono"><b className="text-primary">{formatDay(n.createdAt)}</b><span className="ml-2 text-muted-foreground">{formatTime(n.createdAt)}</span></div> },
            { key: "title", header: "Tiêu đề", render: (n) => <span className={n.read ? "" : "font-bold"}>{n.title}</span> },
            { key: "message", header: "Nội dung", className: "max-w-[420px] whitespace-normal", render: (n) => <span className="text-muted-foreground">{n.message}</span> },
            { key: "status", header: "Trạng thái", render: (n) => n.read ? <Badge>Đã đọc</Badge> : <Badge tone="primary">Chưa đọc</Badge> },
            { key: "actions", header: "Thao tác", className: "text-right", render: (n) => <TableRowActions actions={[
              { icon: <CheckCheck />, label: "Đánh dấu đã đọc", onClick: () => markRead.mutate(n.id), disabled: n.read || markRead.isPending },
            ]} /> },
          ]} />}
    </ListPage>
  );
}
