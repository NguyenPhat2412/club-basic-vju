"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, Building2, Pencil, ShieldCheck, UserMinus } from "lucide-react";
import { apiModel, ClubPositionSlot, Department, DepartmentMember, Membership } from "@/lib/api";
import { ModalShell } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";

export function UpsertDepartmentModal({
  clubId,
  creating,
  editing,
  name,
  setName,
  description,
  setDescription,
  onClose,
  onSaved,
  onError,
}: {
  clubId: string;
  creating: boolean;
  editing: Department | null;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  onClose: () => void;
  onSaved: (dept: Department, isEdit: boolean) => void;
  onError: (msg: string) => void;
}) {
  const create = useMutation({
    mutationFn: () =>
      apiModel.createDepartment(clubId, {
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: (dept) => {
      onSaved(dept, false);
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  const update = useMutation({
    mutationFn: () =>
      apiModel.updateDepartment(editing!.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: (dept) => {
      onSaved(dept, true);
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  const isEdit = !!editing;

  return (
    <ModalShell
      open={creating || isEdit}
      onClose={onClose}
      title={isEdit ? "Cập nhật ban chuyên môn" : "Tạo ban chuyên môn"}
      icon={isEdit ? <Pencil /> : <Building2 />}
      onSubmit={() => (isEdit ? update.mutate() : create.mutate())}
      submitLabel={isEdit ? "Lưu thay đổi" : "Tạo ban"}
      submitLoading={create.isPending || update.isPending}
      submitDisabled={!name.trim()}
    >
      <FormField label="Tên ban chuyên môn" required>
        <Input
          value={name}
          maxLength={200}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: Ban Truyền thông, Ban Chuyên môn, Ban Sự kiện…"
        />
      </FormField>
      <FormField label="Mô tả chức năng">
        <Textarea
          value={description}
          maxLength={2000}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả ngắn gọn nhiệm vụ của ban…"
        />
      </FormField>
    </ModalShell>
  );
}

export function AssignPositionModal({
  clubId,
  assigningSlot,
  activeClubMembers,
  onClose,
  onAssigned,
  onError,
}: {
  clubId: string;
  assigningSlot: ClubPositionSlot | null;
  activeClubMembers: Membership[];
  onClose: () => void;
  onAssigned: () => void;
  onError: (msg: string) => void;
}) {
  const [candidateUserId, setCandidateUserId] = useState("");
  const [replaceHolder, setReplaceHolder] = useState(true);
  const [assignReason, setAssignReason] = useState("");

  const deptMembersForSlot = useQuery({
    queryKey: ["dept-members", assigningSlot?.departmentId],
    queryFn: () => apiModel.departmentMembers(assigningSlot!.departmentId!),
    enabled: !!assigningSlot?.departmentId,
  });

  const eligibleCandidates = (() => {
    if (!assigningSlot?.departmentId) return activeClubMembers;
    const deptUserIds = new Set((deptMembersForSlot.data?.items ?? []).map((dm) => dm.userId));
    return activeClubMembers.filter((m) => deptUserIds.has(m.userId));
  })();

  const assignPosition = useMutation({
    mutationFn: () =>
      apiModel.assignClubPosition(clubId, {
        userId: candidateUserId,
        roleId: assigningSlot!.roleId,
        departmentId: assigningSlot!.departmentId || undefined,
        replaceHolder,
        reason: assignReason.trim() || undefined,
      }),
    onSuccess: () => {
      setCandidateUserId("");
      setAssignReason("");
      onAssigned();
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <ModalShell
      open={!!assigningSlot}
      onClose={onClose}
      title={
        assigningSlot
          ? `Bổ nhiệm ${assigningSlot.roleName}${assigningSlot.departmentName ? ` — ${assigningSlot.departmentName}` : ""}`
          : "Bổ nhiệm chức danh"
      }
      icon={<ShieldCheck />}
      onSubmit={() => assignPosition.mutate()}
      submitLabel={
        assigningSlot && assigningSlot.holders.length >= assigningSlot.maxHolders && replaceHolder
          ? "Thay thế & Bổ nhiệm"
          : "Xác nhận bổ nhiệm"
      }
      submitLoading={assignPosition.isPending}
      submitDisabled={!candidateUserId}
    >
      {assigningSlot && (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-5">
            <p className="font-bold text-primary">
              Quy tắc chức danh: tối đa {assigningSlot.maxHolders} người giữ ({assigningSlot.holders.length}/
              {assigningSlot.maxHolders} hiện tại)
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {assigningSlot.departmentId
                ? `Chỉ các thành viên đang hoạt động trong "${assigningSlot.departmentName}" mới đủ điều kiện làm Trưởng ban (PB-14.2).`
                : "Chỉ thành viên đang hoạt động (ACTIVE) của CLB mới đủ điều kiện giữ chức danh Ban Chủ nhiệm (PB-14.1)."}
            </p>
          </div>

          <FormField
            label={
              assigningSlot.departmentId
                ? `Thành viên thuộc ${assigningSlot.departmentName}`
                : "Thành viên đang hoạt động trong CLB"
            }
            required
          >
            <Select value={candidateUserId} onChange={(e) => setCandidateUserId(e.target.value)}>
              <option value="">-- Chọn thành viên để bổ nhiệm --</option>
              {eligibleCandidates.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.userFullName || m.userId} {m.userStudentCode ? `(${m.userStudentCode})` : ""}
                </option>
              ))}
            </Select>
          </FormField>

          {assigningSlot.departmentId && eligibleCandidates.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Ban này hiện chưa có thành viên nào. Hãy mở mục &quot;Thành viên ban&quot; để thêm thành viên trước khi bổ nhiệm Trưởng ban.
            </p>
          )}

          {assigningSlot.holders.length >= assigningSlot.maxHolders && (
            <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-xs">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-primary"
                checked={replaceHolder}
                onChange={(e) => setReplaceHolder(e.target.checked)}
              />
              <span>
                <b>Tự động thay thế người đương nhiệm</b> (thu hồi chức danh của{" "}
                <b>{assigningSlot.holders[0]?.fullName || assigningSlot.holders[0]?.email}</b> và ghi nhật ký Audit).
              </span>
            </label>
          )}

          <FormField label="Lý do bổ nhiệm / Quyết định (ghi vào Audit Log)">
            <Input
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value)}
              placeholder="VD: Quyết định bổ nhiệm Ban Chủ nhiệm nhiệm kỳ 2026"
            />
          </FormField>

          {assignPosition.error && (
            <p className="text-xs text-destructive">{describeError(assignPosition.error)}</p>
          )}
        </div>
      )}
    </ModalShell>
  );
}

export function MoveDepartmentMemberModal({
  selectedDept,
  movingMember,
  moveTargets,
  onClose,
  onMoved,
  onError,
}: {
  selectedDept: Department | null;
  movingMember: { dm: DepartmentMember; memberLabel: string } | null;
  moveTargets: Department[];
  onClose: () => void;
  onMoved: (targetDeptId: string) => void;
  onError: (msg: string) => void;
}) {
  const [targetDeptId, setTargetDeptId] = useState(moveTargets[0]?.id ?? "");

  const moveDeptMember = useMutation({
    mutationFn: () => apiModel.moveDepartmentMember(selectedDept!.id, movingMember!.dm.membershipId, targetDeptId),
    onSuccess: () => {
      onMoved(targetDeptId);
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <ModalShell
      open={!!movingMember}
      onClose={onClose}
      title="Chuyển thành viên sang ban khác"
      icon={<ArrowRightLeft />}
      size="sm"
      onSubmit={() => moveDeptMember.mutate()}
      submitLabel="Xác nhận chuyển ban"
      submitLoading={moveDeptMember.isPending}
      submitDisabled={!targetDeptId}
    >
      {movingMember && selectedDept && (
        <div className="space-y-3 text-sm">
          <p>
            Chuyển <b>{movingMember.memberLabel}</b> từ <b>{selectedDept.name}</b> sang ban chuyên môn khác trong cùng CLB:
          </p>
          <FormField label="Ban đích (ACTIVE)" required>
            <Select value={targetDeptId} onChange={(e) => setTargetDeptId(e.target.value)}>
              <option value="">-- Chọn ban đích --</option>
              {moveTargets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FormField>
          <p className="text-xs text-muted-foreground">
            Các chức danh hoặc quyền phạm vi ban tại <b>{selectedDept.name}</b> sẽ được tự động thu hồi và ghi nhận vào nhật ký Audit.
          </p>
          {moveDeptMember.error && <p className="text-xs text-destructive">{describeError(moveDeptMember.error)}</p>}
        </div>
      )}
    </ModalShell>
  );
}

export function RemoveDepartmentMemberModal({
  selectedDept,
  removingMember,
  onClose,
  onRemoved,
  onError,
}: {
  selectedDept: Department | null;
  removingMember: { dm: DepartmentMember; memberLabel: string } | null;
  onClose: () => void;
  onRemoved: () => void;
  onError: (msg: string) => void;
}) {
  const removeDeptMember = useMutation({
    mutationFn: () => apiModel.removeDepartmentMember(selectedDept!.id, removingMember!.dm.membershipId),
    onSuccess: () => {
      onRemoved();
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <ModalShell
      open={!!removingMember}
      onClose={onClose}
      title="Xác nhận gỡ thành viên khỏi ban"
      icon={<UserMinus />}
      size="sm"
      onSubmit={() => removeDeptMember.mutate()}
      submitLabel="Gỡ khỏi ban"
      submitDanger
      submitLoading={removeDeptMember.isPending}
    >
      {removingMember && selectedDept && (
        <div className="space-y-2 text-sm">
          <p>
            Xác nhận gỡ <b>{removingMember.memberLabel}</b> khỏi <b>{selectedDept.name}</b>?
          </p>
          <p className="text-xs text-muted-foreground">
            Thành viên vẫn giữ nguyên tư cách thành viên của CLB; chỉ các quyền và chức danh gắn riêng với <b>{selectedDept.name}</b> được thu hồi.
          </p>
          {removeDeptMember.error && <p className="text-xs text-destructive">{describeError(removeDeptMember.error)}</p>}
        </div>
      )}
    </ModalShell>
  );
}
