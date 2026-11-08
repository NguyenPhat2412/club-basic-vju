"use client";

import { Calendar, Eye, FilterX, XCircle } from "lucide-react";
import { MyEventParticipation } from "@/lib/api";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { StatSummaryStrip } from "@/components/shared/StatCards";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { formatDay } from "@/lib/utils";

export function MyEventsHistorySection({
  items,
  total,
  activeRegistrationsCount,
  isPending,
  isError,
  error,
  onRetry,
  regStatusFilter,
  setRegStatusFilter,
  roleFilter,
  setRoleFilter,
  historyOffset,
  setHistoryOffset,
  historyLimit,
  onDiscoverTab,
  onSelectParticipation,
  canCancelNow,
  cancelPending,
  onCancelRegistration,
}: {
  items: MyEventParticipation[];
  total: number;
  activeRegistrationsCount: number;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  regStatusFilter: string;
  setRegStatusFilter: (v: string) => void;
  roleFilter: string;
  setRoleFilter: (v: string) => void;
  historyOffset: number;
  setHistoryOffset: (offset: number) => void;
  historyLimit: number;
  onDiscoverTab: () => void;
  onSelectParticipation: (item: MyEventParticipation) => void;
  canCancelNow: (eventStatus: string, registrationStatus: string, deadline?: string) => boolean;
  cancelPending: boolean;
  onCancelRegistration: (eventId: string) => void;
}) {
  const attendedTotal = items.filter((i) => i.countedAsAttended).length;
  const ctvTotal = items.filter((i) => i.participantType === "CTV" && i.registrationStatus === "REGISTERED").length;

  return (
    <div className="flex flex-1 flex-col space-y-3">
      <StatSummaryStrip
        className="px-4 pt-3 sm:px-6"
        items={[
          { label: "Tổng lượt đăng ký", value: total },
          { label: "Đang giữ chỗ (REGISTERED)", value: activeRegistrationsCount, valueClassName: "text-primary" },
          { label: "Đã tính tham gia (Có mặt / Muộn)", value: attendedTotal, valueClassName: "text-emerald-700" },
          { label: "Tham gia vai trò CTV", value: ctvTotal, valueClassName: "text-amber-700" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6">
        <p className="text-xs text-muted-foreground">
          Theo dõi trạng thái đăng ký, vai trò trong sự kiện (Thành viên / Cộng tác viên) và kết quả điểm danh cá nhân.
        </p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Select
            aria-label="Lọc trạng thái đăng ký"
            value={regStatusFilter}
            onChange={(e) => {
              setRegStatusFilter(e.target.value);
              setHistoryOffset(0);
            }}
            className="h-9 w-full text-xs sm:w-44"
          >
            <option value="">Tất cả đăng ký</option>
            <option value="REGISTERED">Đang đăng ký</option>
            <option value="CANCELLED">Đã huỷ đăng ký</option>
          </Select>
          <Select
            aria-label="Lọc vai trò tham gia"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setHistoryOffset(0);
            }}
            className="h-9 w-full text-xs sm:w-44"
          >
            <option value="">Mọi tư cách</option>
            <option value="MEMBER">Thành viên CLB</option>
            <option value="CTV">Cộng tác viên (CTV)</option>
          </Select>
          {(regStatusFilter || roleFilter) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRegStatusFilter("");
                setRoleFilter("");
                setHistoryOffset(0);
              }}
            >
              <FilterX size={14} /> Xoá lọc
            </Button>
          )}
        </div>
      </div>

      {isPending ? (
        <LoadingRows />
      ) : isError ? (
        <ErrorState message={describeError(error)} onRetry={onRetry} />
      ) : !items.length ? (
        <EmptyState
          icon={<Calendar />}
          title="Bạn chưa đăng ký sự kiện nào"
          description="Hãy chuyển sang tab Khám phá sự kiện để đăng ký tham gia hoạt động hoặc làm Cộng tác viên."
          actionLabel="Khám phá sự kiện"
          onAction={onDiscoverTab}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Lịch sử sự kiện và điểm danh của tôi"
            rows={items}
            rowKey={(item) => item.registrationId}
            onRowClick={onSelectParticipation}
            columns={[
              {
                key: "event",
                header: "Sự kiện & Câu lạc bộ",
                render: (item) => (
                  <div>
                    <p className="font-bold text-foreground">{item.eventTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.clubName} ({item.clubCode}) · {formatDay(item.startTime)}
                    </p>
                  </div>
                ),
              },
              {
                key: "role",
                header: "Tư cách & Phân công",
                render: (item) => (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={item.participantType} />
                    {item.eventRole && <Badge tone="neutral">{item.eventRole}</Badge>}
                  </div>
                ),
              },
              {
                key: "eventStatus",
                header: "TT Sự kiện",
                render: (item) => <StatusBadge status={item.eventStatus} />,
              },
              {
                key: "regStatus",
                header: "TT Đăng ký",
                render: (item) => <StatusBadge status={item.registrationStatus} />,
              },
              {
                key: "attendance",
                header: "Kết quả điểm danh",
                render: (item) =>
                  item.attendanceStatus ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={item.attendanceStatus} />
                      {item.countedAsAttended && (
                        <Badge tone="primary" dot={false}>
                          Tính tham gia
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Chưa ghi nhận</span>
                  ),
              },
              {
                key: "actions",
                header: "Thao tác",
                className: "text-right",
                render: (item) => (
                  <TableRowActions
                    actions={[
                      { icon: <Eye />, label: "Xem chi tiết", onClick: () => onSelectParticipation(item) },
                      ...(canCancelNow(item.eventStatus, item.registrationStatus, item.registrationDeadline)
                        ? [
                            {
                              icon: <XCircle />,
                              label: "Huỷ đăng ký",
                              danger: true,
                              disabled: cancelPending,
                              onClick: () => onCancelRegistration(item.eventId),
                            },
                          ]
                        : []),
                    ]}
                  />
                ),
              },
            ]}
          />
          <Pagination
            offset={historyOffset}
            limit={historyLimit}
            total={total}
            onOffset={setHistoryOffset}
          />
        </>
      )}
    </div>
  );
}
