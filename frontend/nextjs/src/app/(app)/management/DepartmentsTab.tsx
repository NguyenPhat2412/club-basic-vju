"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Building2, Crown, Lock, LockOpen, Pencil, Plus, ShieldCheck, Trash2, UserCheck, UserMinus, UserPlus, UsersRound } from "lucide-react";
import { apiModel, ClubPositionSlot, Department, DepartmentMember } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DataTable } from "@/components/shared/DataTable";
import { EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { RowAction, TableRowActions } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { formatDay } from "@/lib/utils";

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
  const [candidateUserId, setCandidateUserId] = useState("");
  const [replaceHolder, setReplaceHolder] = useState(true);
  const [assignReason, setAssignReason] = useState("");

  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [newDeptMembershipId, setNewDeptMembershipId] = useState("");
  const [movingMember, setMovingMember] = useState<{ dm: DepartmentMember; memberLabel: string } | null>(null);
  const [targetDeptId, setTargetDeptId] = useState("");
  const [removingMember, setRemovingMember] = useState<{ dm: DepartmentMember; memberLabel: string } | null>(null);

  const canCreate = session.canInClub("department.create", clubId);
  const canAssignPosition = session.canInClub("permission.assign", clubId);
  const canRevokePosition = session.canInClub("permission.revoke", clubId);
  const canViewClubMembers = session.canInClub("member.view", clubId);

  const departments = useQuery({
    queryKey: ["departments", clubId],
    queryFn: () => apiModel.departments(clubId),
    enabled: !!clubId,
  });

  const structure = useQuery({
    queryKey: ["club-positions", clubId],
    queryFn: () => apiModel.clubPositions(clubId),
    enabled: !!clubId,
  });

  const activeMembers = useQuery({
    queryKey: ["memberships", clubId, "ACTIVE"],
    queryFn: () => apiModel.clubMemberships(clubId, "ACTIVE"),
    enabled: !!clubId && (!!assigningSlot || (!!selectedDept && canViewClubMembers)),
  });

  const deptMembersForSlot = useQuery({
    queryKey: ["dept-members", assigningSlot?.departmentId],
    queryFn: () => apiModel.departmentMembers(assigningSlot!.departmentId!),
    enabled: !!assigningSlot?.departmentId,
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

  const selectedDeptMembers = useQuery({
    queryKey: ["department-members", selectedDept?.id],
    queryFn: () => apiModel.departmentMembers(selectedDept!.id),
    enabled: !!selectedDept && canViewSelectedDeptMembers,
  });

  const membershipById = useMemo(() => {
    const map = new Map<string, { fullName?: string; studentCode?: string; userId: string }>();
    for (const m of activeMembers.data?.items ?? []) {
      map.set(m.id, { fullName: m.userFullName, studentCode: m.userStudentCode, userId: m.userId });
    }
    return map;
  }, [activeMembers.data]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["departments", clubId] });
    queryClient.invalidateQueries({ queryKey: ["club-positions", clubId] });
    queryClient.invalidateQueries({ queryKey: ["department-members"] });
    queryClient.invalidateQueries({ queryKey: ["club-members", clubId] });
  };

  const create = useMutation({
    mutationFn: () => apiModel.createDepartment(clubId, { name: name.trim(), description: description.trim() || undefined }),
    onSuccess: (dept) => {
      onNotice(`Đã tạo ban "${dept.name}".`);
      onError("");
      setCreating(false);
      setName("");
      setDescription("");
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const update = useMutation({
    mutationFn: () => apiModel.updateDepartment(editing!.id, { name: name.trim(), description: description.trim() || undefined }),
    onSuccess: (dept) => {
      onNotice(`Đã cập nhật thông tin ban "${dept.name}".`);
      onError("");
      setEditing(null);
      if (selectedDept?.id === dept.id) setSelectedDept(dept);
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) => apiModel.updateDepartmentStatus(id, status),
    onSuccess: (dept) => {
      onNotice(dept.status === "ACTIVE" ? `Đã kích hoạt ban "${dept.name}".` : `Đã ngừng hoạt động ban "${dept.name}".`);
      onError("");
      if (selectedDept?.id === dept.id) setSelectedDept(dept);
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

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
      onNotice(
        `Đã bổ nhiệm chức danh "${assigningSlot?.roleName}"${
          assigningSlot?.departmentName ? ` cho ${assigningSlot.departmentName}` : ""
        }.`
      );
      onError("");
      setAssigningSlot(null);
      setCandidateUserId("");
      setAssignReason("");
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

  const addDeptMember = useMutation({
    mutationFn: () => apiModel.addDepartmentMember(selectedDept!.id, newDeptMembershipId),
    onSuccess: () => {
      onNotice(`Đã thêm thành viên vào "${selectedDept?.name}".`);
      onError("");
      setNewDeptMembershipId("");
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const moveDeptMember = useMutation({
    mutationFn: () => apiModel.moveDepartmentMember(selectedDept!.id, movingMember!.dm.membershipId, targetDeptId),
    onSuccess: () => {
      const targetName = (departments.data?.items ?? []).find((d) => d.id === targetDeptId)?.name ?? "ban mới";
      onNotice(`Đã chuyển ${movingMember?.memberLabel} từ "${selectedDept?.name}" sang "${targetName}".`);
      onError("");
      setMovingMember(null);
      setTargetDeptId("");
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const removeDeptMember = useMutation({
    mutationFn: () => apiModel.removeDepartmentMember(selectedDept!.id, removingMember!.dm.membershipId),
    onSuccess: () => {
      onNotice(`Đã gỡ ${removingMember?.memberLabel} khỏi "${selectedDept?.name}" (giữ nguyên tư cách thành viên CLB).`);
      onError("");
      setRemovingMember(null);
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setName(dept.name);
    setDescription(dept.description ?? "");
    update.reset();
  };

  const openAssignModal = (slot: ClubPositionSlot) => {
    setAssigningSlot(slot);
    setCandidateUserId("");
    setReplaceHolder(true);
    setAssignReason("");
    assignPosition.reset();
  };

  const openDeptDrawer = (dept: Department) => {
    setSelectedDept(dept);
    setNewDeptMembershipId("");
    addDeptMember.reset();
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
        ? [{ icon: <UsersRound />, label: "Thành viên ban", onClick: () => openDeptDrawer(dept) }]
        : []),
      ...(canAssignPosition && headSlot && dept.status === "ACTIVE"
        ? [
            {
              icon: <UserCheck />,
              label: headSlot.holders.length ? "Thay thế Trưởng ban (PB-14.2)" : "Bổ nhiệm Trưởng ban (PB-14.2)",
              onClick: () => openAssignModal(headSlot),
            },
          ]
        : []),
      ...(canEdit ? [{ icon: <Pencil />, label: "Sửa thông tin", onClick: () => openEdit(dept) }] : []),
      ...(canActivate
        ? [{ icon: <LockOpen />, label: "Kích hoạt ban", onClick: () => toggleStatus.mutate({ id: dept.id, status: "ACTIVE" }) }]
        : []),
      ...(canDeactivate
        ? [{ icon: <Lock />, label: "Ngừng hoạt động", danger: true, onClick: () => toggleStatus.mutate({ id: dept.id, status: "INACTIVE" }) }]
        : []),
    ];
  };

  const eligibleCandidates = (() => {
    const allClubMembers = activeMembers.data?.items ?? [];
    if (!assigningSlot?.departmentId) return allClubMembers;
    const deptUserIds = new Set((deptMembersForSlot.data?.items ?? []).map((dm) => dm.userId));
    return allClubMembers.filter((m) => deptUserIds.has(m.userId));
  })();

  const availableMembersToAdd = useMemo(() => {
    const existingIds = new Set((selectedDeptMembers.data?.items ?? []).map((dm) => dm.membershipId));
    return (activeMembers.data?.items ?? []).filter((m) => !existingIds.has(m.id));
  }, [activeMembers.data, selectedDeptMembers.data]);

  const labelForDeptMember = (dm: DepartmentMember) => {
    const known = membershipById.get(dm.membershipId);
    if (known?.fullName) {
      return known.studentCode ? `${known.fullName} (${known.studentCode})` : known.fullName;
    }
    return `Thành viên #${dm.userId.slice(0, 8)}`;
  };

  return (
    <div className="space-y-4">
      {/* Cơ cấu Ban điều hành CLB (PB-14.1) */}
      <section className="mx-4 mt-3 rounded-xl border border-border bg-card p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Crown size={16} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Cơ cấu Ban Chủ nhiệm CLB & Chức danh tổ chức (PB-14.1, PB-14.2)
              </h3>
              <p className="text-xs text-muted-foreground">
                Người giữ chức danh phải là thành viên đang hoạt động của CLB/Ban. Tự động kiểm tra số lượng tối đa và thay thế người đương nhiệm.
              </p>
            </div>
          </div>
        </div>

        {structure.isPending ? (
          <LoadingRows rows={2} />
        ) : structure.isError ? (
          <p className="mt-3 text-xs text-destructive">{describeError(structure.error)}</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(structure.data?.clubPositions ?? []).map((slot) => (
              <div
                key={slot.roleId}
                className="flex flex-col justify-between rounded-lg border border-border/70 bg-muted/20 p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                        {slot.roleName}
                      </span>
                      <Badge tone="neutral">
                        {slot.holders.length}/{slot.maxHolders} vị trí
                      </Badge>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{slot.roleCode}</p>
                  </div>
                  {canAssignPosition && (
                    <Button size="sm" variant="outline" onClick={() => openAssignModal(slot)}>
                      <UserCheck size={13} />
                      {slot.holders.length >= slot.maxHolders ? "Thay thế" : "Bổ nhiệm"}
                    </Button>
                  )}
                </div>

                {slot.holders.length === 0 ? (
                  <p className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                    Chưa có thành viên nào giữ chức danh này.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {slot.holders.map((holder) => (
                      <li
                        key={holder.assignmentId}
                        className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-foreground">
                            {holder.fullName || holder.email}
                            {holder.studentCode ? ` (${holder.studentCode})` : ""}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {holder.email} · bổ nhiệm {formatDay(holder.grantedAt)}
                          </p>
                        </div>
                        {canRevokePosition && (
                          <button
                            type="button"
                            aria-label={`Miễn nhiệm ${holder.fullName || holder.email}`}
                            title="Miễn nhiệm chức danh"
                            onClick={() => {
                              if (confirm(`Miễn nhiệm ${holder.fullName || holder.email} khỏi chức danh ${slot.roleName}?`)) {
                                revokePosition.mutate(holder.assignmentId);
                              }
                            }}
                            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {canCreate && (
        <div className="flex justify-end px-4">
          <Button size="sm" onClick={() => { setCreating(true); setName(""); setDescription(""); create.reset(); }}>
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
          onAction={canCreate ? () => { setCreating(true); setName(""); setDescription(""); } : undefined}
        />
      ) : (
        <DataTable
          ariaLabel="Ban chuyên môn"
          rows={departments.data.items}
          rowKey={(d) => d.id}
          onRowClick={(d) =>
            session.canInDepartment("department.member.view", clubId, d.id)
              ? openDeptDrawer(d)
              : session.canInDepartment("department.update", clubId, d.id)
              ? openEdit(d)
              : undefined
          }
          columns={[
            { key: "name", header: "Tên ban chuyên môn", render: (d) => <span className="font-bold text-foreground">{d.name}</span> },
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
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {holder.fullName || holder.email}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{holder.email}</p>
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
            { key: "desc", header: "Mô tả nhiệm vụ", className: "max-w-[340px]", render: (d) => <p className="truncate text-muted-foreground">{d.description || "—"}</p> },
            { key: "status", header: "Trạng thái", render: (d) => <StatusBadge status={d.status} /> },
            {
              key: "actions",
              header: "Thao tác",
              className: "text-right",
              render: (d) => {
                const acts = actionsFor(d);
                return acts.length ? <TableRowActions actions={acts} /> : <span className="text-xs text-muted-foreground">—</span>;
              },
            },
          ]}
        />
      )}

      {/* Drawer Quản lý thành viên thuộc Ban (PB-17.1, PB-17.2, PB-17.3) */}
      <EntityDrawer
        open={!!selectedDept}
        onClose={() => setSelectedDept(null)}
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

            {canAddSelectedDeptMember && (
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
                <ErrorState message={describeError(selectedDeptMembers.error)} onRetry={() => selectedDeptMembers.refetch()} />
              ) : !(selectedDeptMembers.data?.items.length) ? (
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
                          {canRemoveSelectedDeptMember && moveTargetsForSelected.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                moveDeptMember.reset();
                                setMovingMember({ dm, memberLabel });
                                setTargetDeptId(moveTargetsForSelected[0]?.id ?? "");
                              }}
                            >
                              <ArrowRightLeft size={13} /> Chuyển ban
                            </Button>
                          )}
                          {canRemoveSelectedDeptMember && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                removeDeptMember.reset();
                                setRemovingMember({ dm, memberLabel });
                              }}
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

      {/* Modal Chuyển thành viên sang ban khác (PB-17.2) */}
      <ModalShell
        open={!!movingMember}
        onClose={() => setMovingMember(null)}
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
                {moveTargetsForSelected.map((d) => (
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

      {/* Modal Xác nhận gỡ thành viên khỏi ban (PB-17.3) */}
      <ModalShell
        open={!!removingMember}
        onClose={() => setRemovingMember(null)}
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

      <ModalShell
        open={creating}
        onClose={() => setCreating(false)}
        title="Tạo ban chuyên môn"
        icon={<Building2 />}
        onSubmit={() => create.mutate()}
        submitLabel="Tạo ban"
        submitLoading={create.isPending}
        submitDisabled={!name.trim()}
      >
        <FormField label="Tên ban chuyên môn" required>
          <Input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Ban Truyền thông, Ban Chuyên môn, Ban Sự kiện…" />
        </FormField>
        <FormField label="Mô tả chức năng">
          <Textarea value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả ngắn gọn nhiệm vụ của ban…" />
        </FormField>
      </ModalShell>

      <ModalShell
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Cập nhật ban chuyên môn"
        icon={<Pencil />}
        onSubmit={() => update.mutate()}
        submitLabel="Lưu thay đổi"
        submitLoading={update.isPending}
        submitDisabled={!name.trim()}
      >
        <FormField label="Tên ban chuyên môn" required>
          <Input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Mô tả chức năng">
          <Textarea value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
      </ModalShell>

      <ModalShell
        open={!!assigningSlot}
        onClose={() => setAssigningSlot(null)}
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
                Quy tắc chức danh: tối đa {assigningSlot.maxHolders} người giữ ({assigningSlot.holders.length}/{assigningSlot.maxHolders} hiện tại)
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
    </div>
  );
}
