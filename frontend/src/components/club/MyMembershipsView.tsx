"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ClipboardList, Compass, FilterX, UsersRound } from "lucide-react";
import { apiModel } from "@/lib/api";
import { clubSlugFromCode } from "@/lib/media";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { ClubAvatar, useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { formatDay } from "@/lib/utils";

const LIMIT = 20;

export function MyMembershipsView() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const mediaCatalog = useClubMediaCatalog(true);

  const list = useQuery({
    queryKey: ["my-memberships", statusFilter, offset],
    queryFn: () =>
      apiModel.myMemberships({
        status: statusFilter || undefined,
        offset,
        limit: LIMIT,
      }),
    placeholderData: keepPreviousData,
  });

  const hasFilter = statusFilter !== "";
  const clearFilter = () => {
    setStatusFilter("");
    setOffset(0);
  };

  return (
    <ListPage title="CLB đã tham gia">
      <BreadcrumbToolbar
        crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Câu lạc bộ" }, { label: "CLB đã tham gia" }]}
        titleBadge={<CountBadge>{list.data?.total ?? 0}</CountBadge>}
        extraActions={
          <>
            <Select
              aria-label="Lọc theo trạng thái thành viên"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setOffset(0);
              }}
              className="h-9 w-full text-xs sm:w-52"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">ACTIVE — Đang tham gia</option>
              <option value="SUSPENDED">SUSPENDED — Tạm đình chỉ</option>
              <option value="LEFT">LEFT — Đã rời CLB</option>
            </Select>
            {hasFilter && (
              <Button variant="outline" size="sm" onClick={clearFilter}>
                <FilterX size={14} /> Xoá bộ lọc
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push("/applications")}>
              <ClipboardList size={14} /> Đơn đăng ký của tôi
            </Button>
          </>
        }
        onRefresh={() => list.refetch()}
      />
      {list.isPending ? (
        <LoadingRows />
      ) : list.isError ? (
        <ErrorState message={describeError(list.error)} onRetry={() => list.refetch()} />
      ) : !list.data.items.length ? (
        <EmptyState
          icon={hasFilter ? <UsersRound /> : <Compass />}
          title={hasFilter ? "Không có lịch sử thành viên khớp bộ lọc" : "Bạn chưa tham gia câu lạc bộ nào"}
          description={
            hasFilter
              ? "Hãy xoá bộ lọc trạng thái để xem toàn bộ lịch sử tham gia CLB của bạn."
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
            rows={list.data.items}
            rowKey={(m) => m.id}
            columns={[
              {
                key: "club",
                header: "Câu lạc bộ",
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
                render: (m) => <span className="font-mono font-bold text-primary">{formatDay(m.joinedAt)}</span>,
              },
              {
                key: "left",
                header: "Ngày rời CLB",
                render: (m) =>
                  m.leftAt ? (
                    <span className="font-mono text-muted-foreground">{formatDay(m.leftAt)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Đang gắn bó</span>
                  ),
              },
              { key: "status", header: "Trạng thái", render: (m) => <StatusBadge status={m.status} /> },
            ]}
          />
          <Pagination offset={offset} limit={LIMIT} total={list.data.total} onOffset={setOffset} />
        </>
      )}
    </ListPage>
  );
}
