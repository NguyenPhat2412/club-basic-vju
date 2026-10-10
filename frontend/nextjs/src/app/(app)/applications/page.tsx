"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Eye, XCircle } from "lucide-react";
import { apiModel, ApplicationSummary } from "@/lib/api";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer } from "@/components/shared/Overlays";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatDay } from "@/lib/utils";

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const list = useQuery({ queryKey: ["my-applications"], queryFn: apiModel.myApplications });
  const detail = useQuery({ queryKey: ["my-applications", selectedId], queryFn: () => apiModel.application(selectedId!), enabled: !!selectedId });
  const cancel = useMutation({
    mutationFn: (id: string) => apiModel.cancelApplication(id),
    onSuccess: (app) => { setNotice(`Đã huỷ đơn vào ${app.clubName}.`); queryClient.invalidateQueries({ queryKey: ["my-applications"] }); },
  });
  const confirmCancel = (app: ApplicationSummary) => { if (confirm(`Huỷ đơn đăng ký vào ${app.clubName}?`)) cancel.mutate(app.id); };

  return (
    <ListPage title="Đơn đăng ký của tôi">
      <BreadcrumbToolbar crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Câu lạc bộ" }, { label: "Đơn đăng ký của tôi" }]}
        titleBadge={<CountBadge>{list.data?.total ?? 0}</CountBadge>} onRefresh={() => list.refetch()} />
      {notice && <Notice tone="success">{notice}</Notice>}
      {cancel.error && <Notice tone="error">{describeError(cancel.error)}</Notice>}
      {list.isPending ? <LoadingRows /> : list.isError ? <ErrorState message={describeError(list.error)} onRetry={() => list.refetch()} />
        : !list.data.items.length ? <EmptyState icon={<ClipboardList />} title="Bạn chưa gửi đơn nào" description="Vào Khám phá CLB để chọn CLB phù hợp." />
          : <DataTable ariaLabel="Đơn đăng ký" rows={list.data.items} rowKey={(a) => a.id} onRowClick={(a) => setSelectedId(a.id)} columns={[
            { key: "date", header: "Ngày gửi", render: (a) => <span className="font-mono font-bold text-primary">{formatDay(a.createdAt)}</span> },
            { key: "club", header: "Câu lạc bộ", render: (a) => <div><p className="font-bold">{a.clubName}</p><code className="font-mono text-[10.5px] font-bold text-primary">{a.clubCode}</code></div> },
            { key: "status", header: "Trạng thái", render: (a) => <StatusBadge status={a.status} /> },
            { key: "reviewed", header: "Ngày xét duyệt", render: (a) => <span className="font-mono">{formatDay(a.reviewedAt)}</span> },
            { key: "actions", header: "Thao tác", className: "text-right", render: (a) => <TableRowActions actions={[
              { icon: <Eye />, label: "Xem chi tiết", onClick: () => setSelectedId(a.id) },
              ...(a.status === "PENDING" ? [{ icon: <XCircle />, label: "Huỷ đơn", danger: true, onClick: () => confirmCancel(a), disabled: cancel.isPending }] : []),
            ]} /> },
          ]} />}

      <EntityDrawer open={!!selectedId} onClose={() => setSelectedId(null)} title={detail.data?.clubName ?? "Đơn đăng ký"} subtitle={detail.data?.clubCode} icon={<ClipboardList />}
        footer={detail.data?.status === "PENDING" ? <Button variant="destructive" size="sm" onClick={() => { confirmCancel(detail.data!); setSelectedId(null); }}><XCircle size={14} /> Huỷ đơn</Button> : undefined}>
        {detail.isPending ? <LoadingRows rows={3} /> : detail.data && <DetailList rows={[
          ["Trạng thái", <StatusBadge key="s" status={detail.data.status} />],
          ["Ngày gửi", formatDateTime(detail.data.createdAt)],
          ["Lời nhắn", <p key="m" className="whitespace-pre-line">{detail.data.message}</p>],
          ["Ngày xét duyệt", formatDateTime(detail.data.reviewedAt)],
          ["Ghi chú duyệt", detail.data.reviewNote || "—"],
        ]} />}
      </EntityDrawer>
    </ListPage>
  );
}
