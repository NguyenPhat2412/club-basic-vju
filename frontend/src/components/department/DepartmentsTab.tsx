"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { Lock, LockOpen, Pencil, UserCheck, UsersRound } from "lucide-react";
import { apiModel, ClubPositionSlot, Department, DepartmentMember } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { RowAction } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { ClubBoardPositionsSection } from "@/components/department/ClubBoardPositionsSection";
import { DepartmentTableSection } from "@/components/department/DepartmentTableSection";
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
    queryKey: qk.departments(clubId),
    queryFn: () => apiModel.departments(clubId),
    enabled: !!clubId && canViewDepts,
  });

  const structure = useQuery({
    queryKey: qk.clubPositions(clubId),
    queryFn: () => apiModel.clubPositions(clubId),
    enabled: !!clubId && canViewDepts,
  });

  const activeMembers = useQuery({
    queryKey: qk.clubMembers(clubId, "ACTIVE"),
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
    queryClient.invalidateQueries({ queryKey: qk.departments(clubId) });
    queryClient.invalidateQueries({ queryKey: qk.clubPositions(clubId) });
    queryClient.invalidateQueries({ queryKey: qk.departmentMembers() });
    queryClient.invalidateQueries({ queryKey: qk.clubMembers(clubId) });
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

      {departments.isPending ? (
        <LoadingRows />
      ) : departments.isError ? (
        <ErrorState message={describeError(departments.error)} onRetry={() => departments.refetch()} />
      ) : (
        <DepartmentTableSection
          items={departments.data.items}
          canCreate={canCreate}
          canRevokePosition={canRevokePosition}
          deptHeadSlotFor={deptHeadSlotFor}
          actionsFor={actionsFor}
          onRowClick={(d) => {
            if (session.canInDepartment("department.member.view", clubId, d.id)) setSelectedDept(d);
            else if (session.canInDepartment("department.update", clubId, d.id)) openEdit(d);
          }}
          onOpenCreate={() => {
            setCreating(true);
            setName("");
            setDescription("");
          }}
          onRevokeHead={(assignmentId) => revokePosition.mutate(assignmentId)}
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
