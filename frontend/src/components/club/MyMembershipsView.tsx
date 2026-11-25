"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { ClipboardList, Compass, Eye, FilterX, Search, UsersRound, X } from "lucide-react";
import { apiModel } from "@/lib/api";
import { clubSlugFromCode } from "@/lib/media";
import { ClubAvatar, useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { DataTable } from "@/components/shared/DataTable";
import { FilterPopover } from "@/components/shared/FilterPopover";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { formatDay } from "@/lib/utils";

const LIMIT = 20;

export function MyMembershipsView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(LIMIT);
  const mediaCatalog = useClubMediaCatalog(true);

  const list = useQuery({
    queryKey: qk.myMemberships(statusFilter, offset, limit),
    queryFn: () =>
      apiModel.myMemberships({
        status: statusFilter || undefined,
        offset,
        limit,
      }),
    placeholderData: keepPreviousData,
  });

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list.data?.items ?? []).filter((m) => {
      if (!q) return true;
      return (
        m.clubName.toLowerCase().includes(q) ||
        m.clubCode.toLowerCase().includes(q) ||
        m.departments.some((d) => d.name.toLowerCase().includes(q))
      );
    });
  }, [list.data?.items, search]);

  const hasFilter = statusFilter !== "" || search.trim() !== "";
  const clearFilter = () => {
    setSearch("");
    setStatusFilter("");
    setOffset(0);
  };

  return (
    <ListPage title="CLB đã tham gia">
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border bg-white px-3 py-1.5 sm:px-4">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:w-auto sm:flex-1">
          <div className="relative w-full min-w-0 sm:min-w-[170px] sm:max-w-[240px] sm:flex-1">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên CLB, mã CLB, ban…" className="h-8 pl-8 pr-7 text-xs" />
            {search && (
              <button type="button" aria-label="Xoá tìm kiếm" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>
          <FilterPopover activeCount={statusFilter ? 1 : 0} onClear={clearFilter} title="Lọc CLB đã tham gia">
            <FormField label="Trạng thái thành viên" hideIndicator>
              <Select aria-label="Lọc theo trạng thái thành viên" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }} className="h-8 text-xs">
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">ACTIVE — Đang tham gia</option>
                <option value="SUSPENDED">SUSPENDED — Tạm đình chỉ</option>
                <option value="LEFT">LEFT — Đã rời CLB</option>
              </Select>
            </FormField>
          </FilterPopover>
          {hasFilter && (
            <Button variant="outline" size="sm" className="h-8" onClick={clearFilter}>
              <FilterX size={13} /> Xoá lọc
            </Button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <CountBadge>{list.data?.total ?? 0} CLB</CountBadge>
          <Button variant="outline" size="sm" className="h-8" onClick={() => router.push("/applications")}>
            <ClipboardList size={13} /> Đơn đăng ký của tôi
          </Button>
        </div>
      </div>
      {list.isPending ? (
        <LoadingRows />
      ) : list.isError ? (
        <ErrorState message={describeError(list.error)} onRetry={() => list.refetch()} />
      ) : !filteredItems.length ? (
        <EmptyState
          icon={hasFilter ? <UsersRound /> : <Compass />}
          title={hasFilter ? "Không có lịch sử thành viên khớp bộ lọc" : "Bạn chưa tham gia câu lạc bộ nào"}
          description={
            hasFilter
              ? "Hãy xoá bộ lọc trạng thái hoặc từ khoá để xem toàn bộ lịch sử tham gia CLB của bạn."
              : "Khi đơn đăng ký được duyệt hoặc bạn được thêm vào CLB, thông tin thành viên và lịch sử tham gia sẽ hiển thị tại đây."
          }
          actionLabel={hasFilter ? "Xoá bộ lọc" : "Khám phá câu lạc bộ"}
          onAction={hasFilter ? clearFilter : () => router.push("/clubs")}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="CLB đã tham gia"
            minWidth="min-w-[780px]"
            rows={filteredItems}
            rowKey={(m) => m.id}
            onRowClick={(m) => router.push(`/clubs?clubId=${m.clubId}`)}
            columns={[
              {
                key: "club",
                header: "Câu lạc bộ",
                sortValue: (m) => m.clubName,
                render: (m) => {
                  const media = mediaCatalog.data?.clubs[clubSlugFromCode(m.clubCode)];
                  return (
                    <div className="flex min-w-0 items-center gap-3">
                      <ClubAvatar name={m.clubName} code={m.clubCode} fallbackUrl={media?.logo} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-bold">{m.clubName}</p>
                        <code className="font-mono text-[10.5px] font-bold text-primary">{m.clubCode}</code>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "departments",
                header: "Ban chuyên môn",
                sortValue: (m) => m.departments.length,
                render: (m) =>
                  m.departments.length ? (
                    <div className="flex flex-wrap gap-1">
                      {m.departments.map((d) => (
                        <Badge key={d.id} tone="primary" dot={false}>
                          {d.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
              {
                key: "joined",
                header: "Ngày tham gia",
                sortValue: (m) => m.joinedAt,
                render: (m) => <span className="font-mono font-bold text-primary">{formatDay(m.joinedAt)}</span>,
              },
              {
                key: "left",
                header: "Ngày rời CLB",
                sortValue: (m) => m.leftAt ?? "",
                render: (m) =>
                  m.leftAt ? (
                    <span className="font-mono text-muted-foreground">{formatDay(m.leftAt)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Đang gắn bó</span>
                  ),
              },
              { key: "status", header: "Trạng thái", sortValue: (m) => m.status, render: (m) => <StatusBadge status={m.status} /> },
              {
                key: "actions",
                header: "Thao tác",
                className: "text-right",
                render: (m) => (
                  <TableRowActions
                    actions={[{ icon: <Eye />, label: "Xem thông tin CLB", onClick: () => router.push(`/clubs?clubId=${m.clubId}`) }]}
                  />
                ),
              },
            ]}
          />
          <Pagination offset={offset} limit={limit} total={list.data.total} onOffset={setOffset} onLimit={setLimit} />
        </>
      )}
    </ListPage>
  );
}
