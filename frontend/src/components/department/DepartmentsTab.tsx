"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { apiModel, ClubPositionSlot, Department, DepartmentMember } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { RowAction, TableRowActions } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClubBoardPositionsSection } from "@/components/department/ClubBoardPositionsSection";
import {
  AssignPositionModal,
  MoveDepartmentMemberModal,
  RemoveDepartmentMemberModal,
  UpsertDepartmentModal,
} from "@/components/department/DepartmentModals";
import { DepartmentMembersDrawer } from "@/components/department/DepartmentMembersDrawer";

export function DepartmentsTab({
  clubId,
  onNotice,
  onError,
}: {
  clubId: string;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [assigningSlot, setAssigningSlot] = useState<ClubPositionSlot | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [movingMember, setMovingMember] = useState<{ dm: DepartmentMember; memberLabel: string } | null>(null);
  const [removingMember, setRemovingMember] = useState<{ dm: DepartmentMember; memberLabel: string } | null>(null);

  const canViewDepts = session.canInClub("department.view", clubId);
  const canCreate = session.canInClub("department.create", clubId);
  const canAssignPosition = session.canInClub("permission.assign", clubId);
  const canRevokePosition = session.canInClub("permission.revoke", clubId);
  const canViewClubMembers = session.canInClub("member.view", clubId);

  const departments = useQuery({
    queryKey: ["departments", clubId],
    queryFn: () => apiModel.departments(clubId),
    enabled: !!clubId && canViewDepts,
  });

  const structure = useQuery({
    queryKey: ["club-positions", clubId],
    queryFn: () => apiModel.clubPositions(clubId),
    enabled: !!clubId && canViewDepts,
  });

  const activeMembers = useQuery({
    queryKey: ["memberships", clubId, "ACTIVE"],
    queryFn: () => apiModel.clubMemberships(clubId, "ACTIVE"),
    enabled: !!clubId && canViewClubMembers && (!!assigningSlot || !!selectedDept),
  });

  const canViewSelectedDeptMembers = selectedDept
    ? session.canInDepartment("department.member.view", clubId, selectedDept.id)
    : false;
  const canAddSelectedDeptMember = selectedDept
    ? selectedDept.status === "ACTIVE" && session.canInDepartment("department.member.add", clubId, selectedDept.id)
    : false;
  const canRemoveSelectedDeptMember = selectedDept
    ? session.canInDepartment("department.member.remove", clubId, selectedDept.id)
    : false;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["departments", clubId] });
    queryClient.invalidateQueries({ queryKey: ["club-positions", clubId] });
    queryClient.invalidateQueries({ queryKey: ["department-members"] });
    queryClient.invalidateQueries({ queryKey: ["club-members", clubId] });
  };

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      apiModel.updateDepartmentStatus(id, status),
    onSuccess: (dept) => {
      onNotice(
        dept.status === "ACTIVE" ? `Đã kích hoạt ban "${dept.name}".` : `Đã ngừng hoạt động ban "${dept.name}".`
      );
      onError("");
      if (selectedDept?.id === dept.id) setSelectedDept(dept);
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const revokePosition = useMutation({
    mutationFn: (assignmentId: string) => apiModel.revokeClubPosition(clubId, assignmentId),
    onSuccess: () => {
      onNotice("Đã miễn nhiệm chức danh thành công.");
      onError("");
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setName(dept.name);
    setDescription(dept.description ?? "");
  };

  const deptHeadSlotFor = (departmentId: string): ClubPositionSlot | undefined =>
    (structure.data?.departmentPositions ?? []).find((s) => s.departmentId === departmentId);

  const moveTargetsForSelected = useMemo(() => {
    if (!selectedDept) return [];
    return (departments.data?.items ?? []).filter(
      (d) =>
        d.id !== selectedDept.id &&
        d.status === "ACTIVE" &&
        session.canInDepartment("department.member.add", clubId, d.id)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments.data, selectedDept, clubId, session.permissions]);

  const actionsFor = (dept: Department): RowAction[] => {
    const canViewMembers = session.canInDepartment("department.member.view", clubId, dept.id);
    const canEdit = session.canInDepartment("department.update", clubId, dept.id);
    const canActivate = dept.status !== "ACTIVE" && session.canInDepartment("department.activate", clubId, dept.id);
    const canDeactivate = dept.status === "ACTIVE" && session.canInDepartment("department.inactive", clubId, dept.id);
    const headSlot = deptHeadSlotFor(dept.id);
    return [
      ...(canViewMembers
        ? [{ icon: <UsersRound />, label: "Thành viên ban", onClick: () => setSelectedDept(dept) }]
        : []),
      ...(canAssignPosition && headSlot && dept.status === "ACTIVE"
        ? [
            {
              icon: <UserCheck />,
              label: headSlot.holders.length ? "Thay thế Trưởng ban (PB-14.2)" : "Bổ nhiệm Trưởng ban (PB-14.2)",
              onClick: () => setAssigningSlot(headSlot),
            },
          ]
        : []),
      ...(canEdit ? [{ icon: <Pencil />, label: "Sửa thông tin", onClick: () => openEdit(dept) }] : []),
      ...(canActivate
        ? [
            {
              icon: <LockOpen />,
              label: "Kích hoạt ban",
              onClick: () => toggleStatus.mutate({ id: dept.id, status: "ACTIVE" }),
            },
          ]
        : []),
      ...(canDeactivate
        ? [
            {
              icon: <Lock />,
              label: "Ngừng hoạt động",
              danger: true,
              onClick: () => toggleStatus.mutate({ id: dept.id, status: "INACTIVE" }),
            },
          ]
        : []),
    ];
  };

  return (
    <div className="space-y-4">
      <ClubBoardPositionsSection
        slots={structure.data?.clubPositions ?? []}
        isPending={structure.isPending}
        isError={structure.isError}
        error={structure.error}
        canAssignPosition={canAssignPosition}
        canRevokePosition={canRevokePosition}
        onAssignSlot={setAssigningSlot}
        onRevokeAssignment={(assignmentId) => revokePosition.mutate(assignmentId)}
      />

      {canCreate && (
        <div className="flex justify-end px-4">
          <Button
            size="sm"
            onClick={() => {
              setCreating(true);
              setName("");
              setDescription("");
            }}
          >
            <Plus size={14} /> Tạo ban chuyên môn
          </Button>
        </div>
      )}

      {departments.isPending ? (
        <LoadingRows />
      ) : departments.isError ? (
        <ErrorState message={describeError(departments.error)} onRetry={() => departments.refetch()} />
      ) : !departments.data.items.length ? (
        <EmptyState
          icon={<Building2 />}
          title="CLB chưa có ban chuyên môn nào"
          actionLabel={canCreate ? "Tạo ban chuyên môn" : undefined}
          onAction={
            canCreate
              ? () => {
                  setCreating(true);
                  setName("");
                  setDescription("");
                }
              : undefined
          }
        />
      ) : (
        <DataTable
          ariaLabel="Ban chuyên môn"
          rows={departments.data.items}
          rowKey={(d) => d.id}
          onRowClick={(d) =>
            session.canInDepartment("department.member.view", clubId, d.id)
              ? setSelectedDept(d)
              : session.canInDepartment("department.update", clubId, d.id)
                ? openEdit(d)
                : undefined
          }
          columns={[
            {
              key: "name",
              header: "Tên ban chuyên môn",
              render: (d) => <span className="font-bold text-foreground">{d.name}</span>,
            },
            {
              key: "head",
              header: "Trưởng ban (PB-14.2)",
              render: (d) => {
                const slot = deptHeadSlotFor(d.id);
                const holder = slot?.holders?.[0];
                if (!holder) {
                  return <span className="text-xs italic text-muted-foreground">Chưa bổ nhiệm</span>;
                }
                return (
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-foreground">{holder.fullName || holder.email}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{holder.email}</p>
                    </div>
                    {canRevokePosition && (
                      <button
                        type="button"
                        aria-label={`Miễn nhiệm Trưởng ban ${holder.fullName || holder.email}`}
                        title="Miễn nhiệm Trưởng ban"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Miễn nhiệm Trưởng ban ${holder.fullName || holder.email} khỏi ${d.name}?`)) {
                            revokePosition.mutate(holder.assignmentId);
                          }
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              },
            },
            {
              key: "desc",
              header: "Mô tả nhiệm vụ",
              className: "max-w-[340px]",
              render: (d) => <p className="truncate text-muted-foreground">{d.description || "—"}</p>,
            },
            { key: "status", header: "Trạng thái", render: (d) => <StatusBadge status={d.status} /> },
            {
              key: "actions",
              header: "Thao tác",
              className: "text-right",
              render: (d) => {
                const acts = actionsFor(d);
                return acts.length ? (
                  <TableRowActions actions={acts} />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                );
              },
            },
          ]}
        />
      )}

      <DepartmentMembersDrawer
        selectedDept={selectedDept}
        onClose={() => setSelectedDept(null)}
        canViewMembers={canViewSelectedDeptMembers}
        canAddMember={canAddSelectedDeptMember}
        canRemoveMember={canRemoveSelectedDeptMember}
        canViewClubMembers={canViewClubMembers}
        activeClubMembers={activeMembers.data?.items ?? []}
        moveTargets={moveTargetsForSelected}
        onMemberAdded={() => {
          onNotice(`Đã thêm thành viên vào "${selectedDept?.name}".`);
          onError("");
          refresh();
        }}
        onRequestMove={setMovingMember}
        onRequestRemove={setRemovingMember}
        onError={onError}
      />

      <MoveDepartmentMemberModal
        key={movingMember?.dm.id ?? "move-none"}
        selectedDept={selectedDept}
        movingMember={movingMember}
        moveTargets={moveTargetsForSelected}
        onClose={() => setMovingMember(null)}
        onMoved={(targetDeptId) => {
          const targetName =
            (departments.data?.items ?? []).find((d) => d.id === targetDeptId)?.name ?? "ban mới";
          onNotice(`Đã chuyển ${movingMember?.memberLabel} từ "${selectedDept?.name}" sang "${targetName}".`);
          onError("");
          refresh();
        }}
        onError={onError}
      />

      <RemoveDepartmentMemberModal
        selectedDept={selectedDept}
        removingMember={removingMember}
        onClose={() => setRemovingMember(null)}
        onRemoved={() => {
          onNotice(
            `Đã gỡ ${removingMember?.memberLabel} khỏi "${selectedDept?.name}" (giữ nguyên tư cách thành viên CLB).`
          );
          onError("");
          refresh();
        }}
        onError={onError}
      />

      <UpsertDepartmentModal
        clubId={clubId}
        creating={creating}
        editing={editing}
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(dept, isEdit) => {
          onNotice(isEdit ? `Đã cập nhật thông tin ban "${dept.name}".` : `Đã tạo ban "${dept.name}".`);
          onError("");
          if (selectedDept?.id === dept.id) setSelectedDept(dept);
          refresh();
        }}
        onError={onError}
      />

      <AssignPositionModal
        key={assigningSlot?.roleId ?? "assign-none"}
        clubId={clubId}
        assigningSlot={assigningSlot}
        activeClubMembers={activeMembers.data?.items ?? []}
        onClose={() => setAssigningSlot(null)}
        onAssigned={() => {
          onNotice(
            `Đã bổ nhiệm chức danh "${assigningSlot?.roleName}"${
              assigningSlot?.departmentName ? ` cho ${assigningSlot.departmentName}` : ""
            }.`
          );
          onError("");
          refresh();
        }}
        onError={onError}
      />
    </div>
  );
}
