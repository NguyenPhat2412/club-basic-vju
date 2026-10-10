"use client";
import { useQuery } from "@tanstack/react-query";
import { UsersRound } from "lucide-react";
import { apiModel } from "@/lib/api";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { formatDay } from "@/lib/utils";

export default function MembershipsPage() {
  const list = useQuery({ queryKey: ["my-memberships"], queryFn: apiModel.myMemberships });
  return (
    <ListPage title="CLB đã tham gia">
      <BreadcrumbToolbar crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Câu lạc bộ" }, { label: "CLB đã tham gia" }]}
        titleBadge={<CountBadge>{list.data?.total ?? 0}</CountBadge>} onRefresh={() => list.refetch()} />
      {list.isPending ? <LoadingRows /> : list.isError ? <ErrorState message={describeError(list.error)} onRetry={() => list.refetch()} />
        : !list.data.items.length ? <EmptyState icon={<UsersRound />} title="Bạn chưa là thành viên CLB nào" description="Khi đơn được duyệt, CLB sẽ xuất hiện ở đây." />
          : <DataTable ariaLabel="CLB đã tham gia" minWidth="min-w-[760px]" rows={list.data.items} rowKey={(m) => m.id} columns={[
            { key: "club", header: "Câu lạc bộ", render: (m) => <div><p className="font-bold">{m.clubName}</p><code className="font-mono text-[10.5px] font-bold text-primary">{m.clubCode}</code></div> },
            { key: "departments", header: "Ban", render: (m) => m.departments.length
              ? <div className="flex flex-wrap gap-1">{m.departments.map((d) => <Badge key={d.id} tone="primary" dot={false}>{d.name}</Badge>)}</div>
              : <span className="text-muted-foreground">—</span> },
            { key: "joined", header: "Ngày tham gia", render: (m) => <span className="font-mono font-bold text-primary">{formatDay(m.joinedAt)}</span> },
            { key: "left", header: "Ngày rời", render: (m) => <span className="font-mono">{formatDay(m.leftAt)}</span> },
            { key: "status", header: "Trạng thái", render: (m) => <StatusBadge status={m.status} /> },
          ]} />}
    </ListPage>
  );
}
