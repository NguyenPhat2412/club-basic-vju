"use client";

import {
  Eye,
  FilterX,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  UserMinus,
  UserRound,
  X,
} from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { formatDay } from "@/lib/utils";
import { Department, Membership, Page } from "@/types";

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
  memberOffset: number;
  setMemberOffset: (offset: number) => void;
  memberLimit: number;
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
  memberOffset,
  setMemberOffset,
  memberLimit,
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
    canInDepartment("department.member.add", activeClubId, d.id),
  );
  const hasAnyMemberAction = canViewMemberDetail || canUpdateMember || canRemoveMember;

  return (
    <div className="flex flex-1 flex-col space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 sm:px-6">
        <p className="text-xs text-muted-foreground">
          Quản lý vòng đời thành viên (Đang hoạt động · Tạm đình chỉ · Đã rời CLB) và phân công vào các ban chuyên môn.
        </p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Select
            aria-label="Lọc trạng thái thành viên"
            value={memberStatusFilter}
            onChange={(e) => {
              setMemberStatusFilter(e.target.value);
              setMemberOffset(0);
            }}
            className="h-9 w-full text-xs sm:w-52"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">ACTIVE — Đang hoạt động</option>
            <option value="SUSPENDED">SUSPENDED — Tạm đình chỉ</option>
            <option value="LEFT">LEFT — Đã rời CLB</option>
          </Select>
          {memberStatusFilter !== "" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMemberStatusFilter("");
                setMemberOffset(0);
              }}
            >
              <FilterX size={14} /> Xoá bộ lọc
            </Button>
          )}
        </div>
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
          title={memberStatusFilter ? "Không có thành viên khớp bộ lọc" : "CLB chưa có thành viên"}
          actionLabel={
            memberStatusFilter ? "Xoá bộ lọc" : canAddMember ? "Thêm thành viên" : undefined
          }
          onAction={
            memberStatusFilter
              ? () => {
                  setMemberStatusFilter("");
                  setMemberOffset(0);
                }
              : canAddMember
                ? onOpenAddMember
                : undefined
          }
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Thành viên"
            rows={membersData.items}
            rowKey={(m) => m.id}
            onRowClick={canViewMemberDetail ? (m) => onSelectMember(m.id) : undefined}
            columns={[
              { key: "member", header: "Thành viên", render: (m) => memberOf(m) },
              {
                key: "joined",
                header: "Ngày tham gia",
                render: (m) => <span className="font-mono font-bold text-primary">{formatDay(m.joinedAt)}</span>,
              },
              {
                key: "departments",
                header: "Ban",
                render: (m) => (
                  <DepartmentChips
                    departments={departmentsByMember[m.id] ?? []}
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
                      header: "Phân ban",
                      render: (m: Membership) => {
                        if (m.status !== "ACTIVE") {
                          return <span className="text-xs text-muted-foreground">—</span>;
                        }
                        const assignableDepts = activeDepartments.filter(
                          (d) =>
                            canInDepartment("department.member.add", activeClubId, d.id) &&
                            !(departmentsByMember[m.id] ?? []).some((x) => x.id === d.id),
                        );
                        if (!assignableDepts.length) return <span className="text-xs text-muted-foreground">—</span>;
                        return (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Select
                              aria-label="Phân vào ban"
                              value=""
                              className="h-8 w-44 text-xs"
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
              { key: "status", header: "Trạng thái", render: (m) => <StatusBadge status={m.status} /> },
              ...(hasAnyMemberAction
                ? [
                    {
                      key: "actions",
                      header: "Thao tác",
                      className: "text-right",
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
  departments: Department[];
  canRemove: (d: Department) => boolean;
  onRemove: (d: Department) => void;
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
