"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { Activity, Building2, Eye, FilterX, Layers, ScrollText, Search, X } from "lucide-react";
import { apiModel, AuditLogItem } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useUserNames } from "@/hooks/user/useUsers";
import { DataTable } from "@/components/shared/DataTable";
import { FilterPopover } from "@/components/shared/FilterPopover";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { formatDateTime, formatDay, formatTime } from "@/lib/utils";
import { formatAuditAction, RESOURCE_LABELS, resourceLabel } from "@/utils/audit/audit-meta";

const LIMIT = 20;

export function AuditLogsView() {
  const session = useSession();
  const canView = session.can("audit.view");
  const nameOf = useUserNames(session.can("user.view"));
  const [search, setSearch] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [clubId, setClubId] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(LIMIT);
  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  const clubs = useQuery({
    queryKey: qk.clubs("audit"),
    queryFn: () => apiModel.clubs("", "", 0, 100),
    enabled: session.ready && canView,
  });

  const logs = useQuery({
    queryKey: qk.auditLogs(resourceType, clubId, offset, limit),
    queryFn: () =>
      apiModel.auditLogs({
        resourceType: resourceType || undefined,
        clubId: clubId || undefined,
        offset,
        limit,
      }),
    placeholderData: keepPreviousData,
    enabled: session.ready && canView,
  });

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

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (logs.data?.items ?? []).filter((l) => {
      if (!q) return true;
      return (
        actorLabel(l.actorUserId).toLowerCase().includes(q) ||
        formatAuditAction(l.action).toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.resourceId ?? "").toLowerCase().includes(q) ||
        (l.ipAddress ?? "").toLowerCase().includes(q) ||
        (l.userAgent ?? "").toLowerCase().includes(q) ||
        clubName(l.clubId).toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs.data?.items, search, clubs.data?.items]);

  if (session.ready && !canView) {
    return (
      <ListPage title="Nhật ký hệ thống">
        <EmptyState icon={<ScrollText />} title="Bạn không có quyền xem nhật ký hệ thống" />
      </ListPage>
    );
  }

  const hasFilters = Boolean(search.trim() || resourceType || clubId);
  const clearFilters = () => { setSearch(""); setResourceType(""); setClubId(""); setOffset(0); };

  return (
    <ListPage title="Nhật ký hệ thống">
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border bg-white px-3 py-1.5 sm:px-4">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:w-auto sm:flex-1">
          <div className="relative w-full min-w-0 sm:min-w-[180px] sm:max-w-[260px] sm:flex-1">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm người thực hiện, hành động, IP…"
              className="h-8 pl-8 pr-7 text-xs"
            />
            {search && (
              <button
                type="button"
                aria-label="Xoá tìm kiếm"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <FilterPopover activeCount={[resourceType, clubId].filter(Boolean).length} onClear={clearFilters} title="Lọc nhật ký hệ thống">
            <FormField label="Phân hệ" hideIndicator>
              <Select aria-label="Lọc theo phân hệ" value={resourceType} onChange={(e) => { setResourceType(e.target.value); setOffset(0); }} className="h-8 text-xs">
                <option value="">Tất cả phân hệ</option>
                {Object.keys(RESOURCE_LABELS).map((k) => <option key={k} value={k}>{resourceLabel(k)}</option>)}
              </Select>
            </FormField>
            <FormField label="Đơn vị / Câu lạc bộ" hideIndicator>
              <Select aria-label="Lọc theo CLB" value={clubId} onChange={(e) => { setClubId(e.target.value); setOffset(0); }} className="h-8 text-xs">
                <option value="">Tất cả câu lạc bộ</option>
                {(clubs.data?.items ?? []).map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
              </Select>
            </FormField>
          </FilterPopover>
          {hasFilters && (
            <Button variant="outline" size="sm" className="h-8" onClick={clearFilters}>
              <FilterX size={13} /> Xoá lọc
            </Button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <CountBadge>{logs.data?.total ?? 0} bản ghi</CountBadge>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-3 px-3 pt-2.5 sm:grid-cols-3 sm:px-5">
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
      ) : !filteredLogs.length ? (
        <EmptyState icon={<ScrollText />} title="Không tìm thấy bản ghi nhật ký" actionLabel={hasFilters ? "Xoá bộ lọc" : undefined} onAction={hasFilters ? clearFilters : undefined} />
      ) : (
        <DataTable
          ariaLabel="Nhật ký hệ thống"
          minWidth="min-w-[860px]"
          rows={filteredLogs}
          rowKey={(l) => l.id}
          onRowClick={setSelected}
          columns={[
            {
              key: "time",
              header: "Thời gian",
              sortValue: (l) => l.createdAt,
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
              sortValue: (l) => actorLabel(l.actorUserId),
              render: (l) => <span className="font-semibold text-foreground">{actorLabel(l.actorUserId)}</span>,
            },
            {
              key: "resource",
              header: "Phân hệ",
              sortValue: (l) => resourceLabel(l.resourceType),
              render: (l) => (
                <Badge tone="primary" dot={false}>
                  {resourceLabel(l.resourceType)}
                </Badge>
              ),
            },
            {
              key: "action",
              header: "Hành động",
              sortValue: (l) => formatAuditAction(l.action),
              render: (l) => <span className="font-semibold text-foreground">{formatAuditAction(l.action)}</span>,
            },
            {
              key: "club",
              header: "Phạm vi áp dụng",
              sortValue: (l) => clubName(l.clubId),
              render: (l) => <span className="text-xs text-muted-foreground">{clubName(l.clubId)}</span>,
            },
            {
              key: "ipAddress",
              header: "IP / Thiết bị",
              sortValue: (l) => l.ipAddress ?? "",
              render: (l) => (
                <span className="font-mono text-xs text-muted-foreground" title={l.userAgent ?? undefined}>
                  {l.ipAddress || "—"}
                </span>
              ),
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
        <Pagination offset={offset} limit={limit} total={logs.data.total} onOffset={setOffset} onLimit={setLimit} />
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
                ["Địa chỉ IP", <span key="ip" className="font-mono text-xs">{selected.ipAddress || "—"}</span>],
                [
                  "Thiết bị (User-Agent)",
                  <span key="ua" className="break-all font-mono text-xs text-muted-foreground">
                    {selected.userAgent || "—"}
                  </span>,
                ],
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
