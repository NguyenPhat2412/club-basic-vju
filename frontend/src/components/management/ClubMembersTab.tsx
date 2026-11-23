"use client";

import {
  Eye,
  FilterX,
  PauseCircle,
  PlayCircle,
  Search,
  ShieldCheck,
  UserMinus,
  UserRound,
  X,
} from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { ExportReportMenu } from "@/components/shared/ExportReportMenu";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { formatDay } from "@/lib/utils";
import { Department, Membership, Page } from "@/types";
import { exportClubMembersReport } from "@/utils/export/club-reports";

interface ClubMembersTabProps {
  activeClubId: string;
  canViewMembers: boolean;
  canAddMember: boolean;
  canUpdateMember: boolean;
  canRemoveMember: boolean;
  canViewMemberDetail: boolean;
  canInDepartment: (key: string, clubId: string, departmentId: string) => boolean;
  memberStatusFilter: string;
  setMemberStatusFilter: (val: string) => void;
  memberDeptFilter: string;
  setMemberDeptFilter: (val: string) => void;
  memberSearch: string;
  setMemberSearch: (val: string) => void;
  memberOffset: number;
  setMemberOffset: (offset: number) => void;
  memberLimit: number;
  setMemberLimit: (limit: number) => void;
  membersData?: Page<Membership>;
  membersPending: boolean;
  membersError: unknown;
  onRetryMembers: () => void;
  onOpenAddMember: () => void;
  onSelectMember: (id: string) => void;
  memberOf: (m: Membership) => React.ReactNode;
  activeDepartments: Department[];
  departmentsByMember: Record<string, Department[]>;
  assignPending: boolean;
  onAssignDepartment: (departmentId: string, membershipId: string) => void;
  onUnassignDepartment: (departmentId: string, membershipId: string) => void;
  statusPending: boolean;
  onUpdateStatus: (id: string, value: string) => void;
  onConfirmLeave: (m: Membership) => void;
}

export function ClubMembersTab({
  activeClubId,
  canViewMembers,
  canAddMember,
  canUpdateMember,
  canRemoveMember,
  canViewMemberDetail,
  canInDepartment,
  memberStatusFilter,
  setMemberStatusFilter,
  memberDeptFilter,
  setMemberDeptFilter,
  memberSearch,
  setMemberSearch,
  memberOffset,
  setMemberOffset,
  memberLimit,
  setMemberLimit,
  membersData,
  membersPending,
  membersError,
  onRetryMembers,
  onOpenAddMember,
  onSelectMember,
  memberOf,
  activeDepartments,
  departmentsByMember,
  assignPending,
  onAssignDepartment,
  onUnassignDepartment,
  statusPending,
  onUpdateStatus,
  onConfirmLeave,
}: ClubMembersTabProps) {
  const canAssignAnyDept = activeDepartments.some((d) =>
    canInDepartment("department.member.add", activeClubId, d.id)
  );
  const hasAnyMemberAction = canViewMemberDetail || canUpdateMember || canRemoveMember;
  const hasFilters = Boolean(memberStatusFilter || memberDeptFilter || memberSearch.trim());

  const resetFilters = () => {
    setMemberStatusFilter("");
    setMemberDeptFilter("");
    setMemberSearch("");
    setMemberOffset(0);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-card px-4 py-2.5 sm:px-6">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1 sm:max-w-[260px]">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={memberSearch}
              onChange={(e) => {
                setMemberSearch(e.target.value);
                setMemberOffset(0);
              }}
              placeholder="Tìm tên, email hoặc MSSV thành viên…"
              aria-label="Tìm thành viên"
              className="h-8 pl-8 pr-7 text-xs"
            />
            {memberSearch && (
              <button
                type="button"
                aria-label="Xoá tìm kiếm"
                onClick={() => {
                  setMemberSearch("");
                  setMemberOffset(0);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {activeDepartments.length > 0 && (
            <Select
              aria-label="Lọc theo ban chuyên môn"
              value={memberDeptFilter}
              onChange={(e) => {
                setMemberDeptFilter(e.target.value);
                setMemberOffset(0);
              }}
              className="h-8 w-full text-xs sm:w-40"
            >
              <option value="">Tất cả ban chuyên môn</option>
              {activeDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  Ban: {d.name}
                </option>
              ))}
            </Select>
          )}

          <Select
            aria-label="Lọc trạng thái thành viên"
            value={memberStatusFilter}
            onChange={(e) => {
              setMemberStatusFilter(e.target.value);
              setMemberOffset(0);
            }}
            className="h-8 w-full text-xs sm:w-44"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">ACTIVE — Đang hoạt động</option>
            <option value="SUSPENDED">SUSPENDED — Tạm đình chỉ</option>
            <option value="LEFT">LEFT — Đã rời CLB</option>
          </Select>

          {hasFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="h-8">
              <FilterX size={13} /> Xoá lọc
            </Button>
          )}
        </div>
        {canViewMembers && Boolean(membersData?.total) && (
          <ExportReportMenu
            compact
            onExport={(mode) =>
              exportClubMembersReport({
                mode,
                clubId: activeClubId,
                statusFilter: memberStatusFilter,
                deptFilter: memberDeptFilter,
                search: memberSearch,
                departmentsByMember,
              })
            }
          />
        )}
      </div>

      {!canViewMembers ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="Bạn chưa có quyền xem danh sách thành viên CLB"
          description="Nếu bạn phụ trách Ban chuyên môn, vui lòng chuyển sang tab Ban chuyên môn để quản lý thành viên trong ban."
        />
      ) : membersPending ? (
        <LoadingRows />
      ) : membersError ? (
        <ErrorState message={describeError(membersError)} onRetry={onRetryMembers} />
      ) : !membersData?.items.length ? (
        <EmptyState
          icon={<UserRound />}
          title={hasFilters ? "Không có thành viên khớp bộ lọc" : "CLB chưa có thành viên"}
          actionLabel={hasFilters ? "Xoá bộ lọc" : canAddMember ? "Thêm thành viên" : undefined}
          onAction={hasFilters ? resetFilters : canAddMember ? onOpenAddMember : undefined}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Thành viên"
            minWidth="min-w-[760px]"
            rows={membersData.items}
            rowKey={(m) => m.id}
            onRowClick={canViewMemberDetail ? (m) => onSelectMember(m.id) : undefined}
            columns={[
              {
                key: "index",
                header: "STT",
                className: "w-10 text-center font-mono text-muted-foreground",
                render: (m) => <span>{memberOffset + membersData.items.indexOf(m) + 1}</span>,
              },
              {
                key: "member",
                header: "Thành viên",
                sortValue: (m) => m.userFullName ?? "",
                render: (m) => memberOf(m),
              },
              {
                key: "joined",
                header: "Ngày tham gia",
                className: "whitespace-nowrap",
                sortValue: (m) => m.joinedAt ?? "",
                render: (m) => <span className="font-mono font-bold text-primary">{formatDay(m.joinedAt)}</span>,
              },
              {
                key: "departments",
                header: "Ban chuyên môn",
                render: (m) => (
                  <DepartmentChips
                    departments={departmentsByMember[m.id] ?? m.departments ?? []}
                    canRemove={(d) =>
                      m.status !== "LEFT" && canInDepartment("department.member.remove", activeClubId, d.id)
                    }
                    onRemove={(d) => onUnassignDepartment(d.id, m.id)}
                  />
                ),
              },
              ...(canAssignAnyDept
                ? [
                    {
                      key: "assign",
                      header: "Phân ban nhanh",
                      render: (m: Membership) => {
                        if (m.status !== "ACTIVE") {
                          return <span className="text-xs text-muted-foreground">—</span>;
                        }
                        const currentDepts = departmentsByMember[m.id] ?? m.departments ?? [];
                        const assignableDepts = activeDepartments.filter(
                          (d) =>
                            canInDepartment("department.member.add", activeClubId, d.id) &&
                            !currentDepts.some((x) => x.id === d.id)
                        );
                        if (!assignableDepts.length) return <span className="text-xs text-muted-foreground">—</span>;
                        return (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Select
                              aria-label="Phân vào ban"
                              value=""
                              className="h-8 w-40 text-xs"
                              disabled={assignPending}
                              onChange={(e) =>
                                e.target.value && onAssignDepartment(e.target.value, m.id)
                              }
                            >
                              <option value="">+ Thêm vào ban…</option>
                              {assignableDepts.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                        );
                      },
                    },
                  ]
                : []),
              {
                key: "status",
                header: "Trạng thái",
                className: "whitespace-nowrap",
                sortValue: (m) => m.status,
                render: (m) => <StatusBadge status={m.status} />,
              },
              ...(hasAnyMemberAction
                ? [
                    {
                      key: "actions",
                      header: "Thao tác",
                      className: "text-right whitespace-nowrap",
                      render: (m: Membership) => {
                        const actions = [
                          ...(canViewMemberDetail
                            ? [{ icon: <Eye />, label: "Xem chi tiết", onClick: () => onSelectMember(m.id) }]
                            : []),
                          ...(canUpdateMember && m.status === "ACTIVE"
                            ? [
                                {
                                  icon: <PauseCircle />,
                                  label: "Tạm đình chỉ",
                                  onClick: () => onUpdateStatus(m.id, "SUSPENDED"),
                                  disabled: statusPending,
                                },
                              ]
                            : []),
                          ...(canUpdateMember && m.status === "SUSPENDED"
                            ? [
                                {
                                  icon: <PlayCircle />,
                                  label: "Kích hoạt lại",
                                  onClick: () => onUpdateStatus(m.id, "ACTIVE"),
                                  disabled: statusPending,
                                },
                              ]
                            : []),
                          ...(canRemoveMember && m.status !== "LEFT"
                            ? [
                                {
                                  icon: <UserMinus />,
                                  label: "Cho rời CLB",
                                  danger: true,
                                  onClick: () => onConfirmLeave(m),
                                },
                              ]
                            : []),
                        ];
                        return actions.length ? (
                          <TableRowActions actions={actions} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        );
                      },
                    },
                  ]
                : []),
            ]}
          />
          <Pagination
            offset={memberOffset}
            limit={memberLimit}
            total={membersData.total}
            onOffset={setMemberOffset}
            onLimit={setMemberLimit}
          />
        </>
      )}
    </div>
  );
}

function DepartmentChips({
  departments,
  canRemove,
  onRemove,
}: {
  departments: Array<{ id: string; name: string }>;
  canRemove: (d: { id: string; name: string }) => boolean;
  onRemove: (d: { id: string; name: string }) => void;
}) {
  if (!departments.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
      {departments.map((d) => (
        <Badge key={d.id} tone="primary" dot={false} className={canRemove(d) ? "pr-1" : undefined}>
          {d.name}
          {canRemove(d) && (
            <button
              type="button"
              aria-label={`Gỡ khỏi ${d.name}`}
              onClick={() => onRemove(d)}
              className="rounded-full p-0.5 hover:bg-primary/15"
            >
              <X size={10} />
            </button>
          )}
        </Badge>
      ))}
    </div>
  );
}
