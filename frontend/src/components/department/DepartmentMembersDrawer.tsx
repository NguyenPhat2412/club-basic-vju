"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, UserMinus, UserPlus, UsersRound } from "lucide-react";
import { apiModel, Department, DepartmentMember, Membership } from "@/lib/api";
import { EntityDrawer, Section } from "@/components/shared/Overlays";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { formatDay } from "@/lib/utils";

export function DepartmentMembersDrawer({
  selectedDept,
  onClose,
  canViewMembers,
  canAddMember,
  canRemoveMember,
  canViewClubMembers,
  activeClubMembers,
  moveTargets,
  onMemberAdded,
  onRequestMove,
  onRequestRemove,
  onError,
}: {
  selectedDept: Department | null;
  onClose: () => void;
  canViewMembers: boolean;
  canAddMember: boolean;
  canRemoveMember: boolean;
  canViewClubMembers: boolean;
  activeClubMembers: Membership[];
  moveTargets: Department[];
  onMemberAdded: () => void;
  onRequestMove: (item: { dm: DepartmentMember; memberLabel: string }) => void;
  onRequestRemove: (item: { dm: DepartmentMember; memberLabel: string }) => void;
  onError: (msg: string) => void;
}) {
  const [newDeptMembershipId, setNewDeptMembershipId] = useState("");

  const selectedDeptMembers = useQuery({
    queryKey: ["department-members", selectedDept?.id],
    queryFn: () => apiModel.departmentMembers(selectedDept!.id),
    enabled: !!selectedDept && canViewMembers,
  });

  const membershipById = useMemo(() => {
    const map = new Map<string, { fullName?: string; studentCode?: string; userId: string }>();
    for (const m of activeClubMembers) {
      map.set(m.id, { fullName: m.userFullName, studentCode: m.userStudentCode, userId: m.userId });
    }
    return map;
  }, [activeClubMembers]);

  const availableMembersToAdd = useMemo(() => {
    const existingIds = new Set((selectedDeptMembers.data?.items ?? []).map((dm) => dm.membershipId));
    return activeClubMembers.filter((m) => !existingIds.has(m.id));
  }, [activeClubMembers, selectedDeptMembers.data]);

  const labelForDeptMember = (dm: DepartmentMember) => {
    const known = membershipById.get(dm.membershipId);
    if (known?.fullName) {
      return known.studentCode ? `${known.fullName} (${known.studentCode})` : known.fullName;
    }
    return `Thành viên #${dm.userId.slice(0, 8)}`;
  };

  const addDeptMember = useMutation({
    mutationFn: () => apiModel.addDepartmentMember(selectedDept!.id, newDeptMembershipId),
    onSuccess: () => {
      setNewDeptMembershipId("");
      onMemberAdded();
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <EntityDrawer
      open={!!selectedDept}
      onClose={onClose}
      title={selectedDept ? `Thành viên — ${selectedDept.name}` : "Thành viên ban"}
      subtitle={selectedDept?.description || "Quản lý phân công, chuyển ban và gỡ thành viên khỏi ban chuyên môn"}
      icon={<UsersRound />}
    >
      {selectedDept && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3.5 py-2.5 text-xs">
            <span>Trạng thái ban:</span>
            <StatusBadge status={selectedDept.status} />
          </div>

          {canAddMember && (
            <Section title="Thêm thành viên CLB vào ban" icon={<UserPlus />} className="mt-2 border-t-0 pt-0">
              {canViewClubMembers ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-52 flex-1">
                    <FormField label="Chọn thành viên đang hoạt động (ACTIVE)">
                      <Select
                        value={newDeptMembershipId}
                        onChange={(e) => setNewDeptMembershipId(e.target.value)}
                      >
                        <option value="">-- Chọn thành viên CLB --</option>
                        {availableMembersToAdd.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.userFullName || m.userId} {m.userStudentCode ? `(${m.userStudentCode})` : ""}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  </div>
                  <Button
                    size="sm"
                    disabled={!newDeptMembershipId || addDeptMember.isPending}
                    onClick={() => addDeptMember.mutate()}
                  >
                    <UserPlus size={14} /> {addDeptMember.isPending ? "Đang thêm…" : "Thêm vào ban"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-52 flex-1">
                    <FormField label="Mã Membership (UUID)">
                      <Input
                        value={newDeptMembershipId}
                        onChange={(e) => setNewDeptMembershipId(e.target.value)}
                        placeholder="Nhập UUID membership trong CLB…"
                      />
                    </FormField>
                  </div>
                  <Button
                    size="sm"
                    disabled={!newDeptMembershipId.trim() || addDeptMember.isPending}
                    onClick={() => addDeptMember.mutate()}
                  >
                    <UserPlus size={14} /> Thêm vào ban
                  </Button>
                </div>
              )}
            </Section>
          )}

          <Section title={`Danh sách thành viên (${selectedDeptMembers.data?.total ?? 0})`} icon={<UsersRound />}>
            {selectedDeptMembers.isPending ? (
              <LoadingRows rows={3} />
            ) : selectedDeptMembers.isError ? (
              <ErrorState
                message={describeError(selectedDeptMembers.error)}
                onRetry={() => selectedDeptMembers.refetch()}
              />
            ) : !selectedDeptMembers.data?.items.length ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Ban chuyên môn này hiện chưa có thành viên nào.
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedDeptMembers.data.items.map((dm) => {
                  const memberLabel = labelForDeptMember(dm);
                  return (
                    <li
                      key={dm.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">{memberLabel}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          Tham gia ban: {formatDay(dm.joinedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {canRemoveMember && moveTargets.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRequestMove({ dm, memberLabel })}
                          >
                            <ArrowRightLeft size={13} /> Chuyển ban
                          </Button>
                        )}
                        {canRemoveMember && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onRequestRemove({ dm, memberLabel })}
                          >
                            <UserMinus size={13} /> Gỡ khỏi ban
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
      )}
    </EntityDrawer>
  );
}
