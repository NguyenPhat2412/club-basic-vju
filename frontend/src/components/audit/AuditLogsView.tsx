"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Activity, Building2, Eye, Layers, ScrollText } from "lucide-react";
import { apiModel, AuditLogItem } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useUserNames } from "@/hooks/user/useUsers";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { formatDateTime, formatDay, formatTime } from "@/lib/utils";
import { formatAuditAction, RESOURCE_LABELS, resourceLabel } from "@/utils/audit/audit-meta";

const LIMIT = 20;

export function AuditLogsView() {
  const session = useSession();
  const canView = session.can("audit.view");
  const nameOf = useUserNames(session.can("user.view"));
  const [resourceType, setResourceType] = useState("");
  const [clubId, setClubId] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  const clubs = useQuery({
    queryKey: ["clubs", "audit"],
    queryFn: () => apiModel.clubs("", "", 0, 100),
    enabled: session.ready && canView,
  });

  const logs = useQuery({
    queryKey: ["audit-logs", resourceType, clubId, offset],
    queryFn: () =>
      apiModel.auditLogs({
        resourceType: resourceType || undefined,
        clubId: clubId || undefined,
        offset,
        limit: LIMIT,
      }),
    placeholderData: keepPreviousData,
    enabled: session.ready && canView,
  });

  if (session.ready && !canView) {
    return (
      <ListPage title="Nhật ký hệ thống">
        <EmptyState icon={<ScrollText />} title="Bạn không có quyền xem nhật ký hệ thống" />
      </ListPage>
    );
  }

  const actorLabel = (userId?: string) => {
    if (!userId) return "Hệ thống";
    const u = nameOf(userId);
    return u?.fullName || u?.email || userId.slice(0, 8);
  };

  const clubName = (id?: string) => {
    if (!id) return "Toàn hệ thống";
    const c = (clubs.data?.items ?? []).find((x) => x.id === id);
    return c ? `${c.code} · ${c.name}` : id.slice(0, 8);
  };

  return (
    <ListPage title="Nhật ký hệ thống">
      <BreadcrumbToolbar
        crumbs={[
          { label: "Tổng quan", href: "/dashboard" },
          { label: "Quản trị hệ thống" },
          { label: "Nhật ký hệ thống" },
        ]}
        titleBadge={<CountBadge>{logs.data?.total ?? 0} bản ghi</CountBadge>}
        extraActions={
          <>
            <Select
              aria-label="Lọc theo phân hệ"
              value={resourceType}
              onChange={(e) => {
                setResourceType(e.target.value);
                setOffset(0);
              }}
              className="h-9 w-full text-xs sm:w-48"
            >
              <option value="">Tất cả phân hệ</option>
              {Object.keys(RESOURCE_LABELS).map((k) => (
                <option key={k} value={k}>
                  {resourceLabel(k)}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Lọc theo CLB"
              value={clubId}
              onChange={(e) => {
                setClubId(e.target.value);
                setOffset(0);
              }}
              className="h-9 w-full text-xs sm:w-52"
            >
              <option value="">Tất cả câu lạc bộ</option>
              {(clubs.data?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </option>
              ))}
            </Select>
          </>
        }
        onRefresh={() => logs.refetch()}
      />

      <div className="grid shrink-0 grid-cols-1 gap-3 px-4 pt-4 sm:grid-cols-3 sm:px-6">
        <div className="flex min-w-0 items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-2xs">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground">Tổng số bản ghi nhật ký</p>
            <p className="mt-1 font-mono text-xl font-extrabold text-foreground">{logs.data?.total ?? 0}</p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Activity size={17} />
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-2xs">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground">Phân hệ đang lọc</p>
            <p className="mt-1 truncate text-sm font-bold text-foreground">
              {resourceType ? resourceLabel(resourceType) : `Toàn bộ ${Object.keys(RESOURCE_LABELS).length} phân hệ`}
            </p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers size={17} />
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-2xs">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground">Phạm vi tra cứu</p>
            <p className="mt-1 truncate text-sm font-bold text-foreground">
              {clubId ? clubName(clubId) : "Toàn hệ thống & Mọi CLB"}
            </p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 size={17} />
          </span>
        </div>
      </div>

      {logs.isPending ? (
        <LoadingRows />
      ) : logs.isError ? (
        <ErrorState message={describeError(logs.error)} onRetry={() => logs.refetch()} />
      ) : !logs.data.items.length ? (
        <EmptyState icon={<ScrollText />} title="Không tìm thấy bản ghi nhật ký" />
      ) : (
        <DataTable
          ariaLabel="Nhật ký hệ thống"
          rows={logs.data.items}
          rowKey={(l) => l.id}
          onRowClick={setSelected}
          columns={[
            {
              key: "time",
              header: "Thời gian",
              render: (l) => (
                <div className="font-mono">
                  <b className="text-primary">{formatDay(l.createdAt)}</b>
                  <span className="ml-2 text-muted-foreground">{formatTime(l.createdAt)}</span>
                </div>
              ),
            },
            {
              key: "actor",
              header: "Người thực hiện",
              render: (l) => <span className="font-semibold text-foreground">{actorLabel(l.actorUserId)}</span>,
            },
            {
              key: "resource",
              header: "Phân hệ",
              render: (l) => (
                <Badge tone="primary" dot={false}>
                  {resourceLabel(l.resourceType)}
                </Badge>
              ),
            },
            {
              key: "action",
              header: "Hành động",
              render: (l) => <span className="font-semibold text-foreground">{formatAuditAction(l.action)}</span>,
            },
            {
              key: "club",
              header: "Phạm vi áp dụng",
              render: (l) => <span className="text-xs text-muted-foreground">{clubName(l.clubId)}</span>,
            },
            {
              key: "actions",
              header: "Chi tiết",
              className: "text-right",
              render: (l) => (
                <TableRowActions
                  actions={[{ icon: <Eye />, label: "Xem chi tiết", onClick: () => setSelected(l) }]}
                />
              ),
            },
          ]}
        />
      )}
      {logs.data && logs.data.total > 0 && (
        <Pagination offset={offset} limit={LIMIT} total={logs.data.total} onOffset={setOffset} />
      )}

      <EntityDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? resourceLabel(selected.resourceType) : "Chi tiết nhật ký"}
        subtitle={selected ? formatAuditAction(selected.action) : undefined}
        icon={<ScrollText />}
      >
        {selected && (
          <>
            <DetailList
              rows={[
                ["Thời gian", formatDateTime(selected.createdAt)],
                ["Người thực hiện", actorLabel(selected.actorUserId)],
                ["Phân hệ", resourceLabel(selected.resourceType)],
                ["Hành động", <span key="a" className="font-semibold">{formatAuditAction(selected.action)}</span>],
                ["Phạm vi", clubName(selected.clubId)],
                ["Mã bản ghi đối tượng", <span key="r" className="font-mono text-xs">{selected.resourceId}</span>],
              ]}
            />
            {selected.oldValue && (
              <Section title="Dữ liệu trước thay đổi">
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/60 p-3 font-mono text-xs">
                  {JSON.stringify(selected.oldValue, null, 2)}
                </pre>
              </Section>
            )}
            {selected.newValue && (
              <Section title="Dữ liệu sau thay đổi">
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/60 p-3 font-mono text-xs">
                  {JSON.stringify(selected.newValue, null, 2)}
                </pre>
              </Section>
            )}
          </>
        )}
      </EntityDrawer>
    </ListPage>
  );
}
