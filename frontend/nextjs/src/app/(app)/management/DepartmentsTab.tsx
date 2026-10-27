"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Crown, Lock, LockOpen, Pencil, Plus, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import { apiModel, ClubPositionSlot, Department } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DataTable } from "@/components/shared/DataTable";
import { ModalShell } from "@/components/shared/Overlays";
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

  const canCreate = session.canInClub("department.create", clubId);
  const canAssignPosition = session.canInClub("permission.assign", clubId);
  const canRevokePosition = session.canInClub("permission.revoke", clubId);

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
    enabled: !!clubId && !!assigningSlot,
  });

  const deptMembersForSlot = useQuery({
    queryKey: ["dept-members", assigningSlot?.departmentId],
    queryFn: () => apiModel.departmentMembers(assigningSlot!.departmentId!),
    enabled: !!assigningSlot?.departmentId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["departments", clubId] });
    queryClient.invalidateQueries({ queryKey: ["club-positions", clubId] });
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
      refresh();
    },
    onError: (e) => onError(describeError(e)),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) => apiModel.updateDepartmentStatus(id, status),
    onSuccess: (dept) => {
      onNotice(dept.status === "ACTIVE" ? `Đã kích hoạt ban "${dept.name}".` : `Đã ngừng hoạt động ban "${dept.name}".`);
      onError("");
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

  const deptHeadSlotFor = (departmentId: string): ClubPositionSlot | undefined =>
    (structure.data?.departmentPositions ?? []).find((s) => s.departmentId === departmentId);

  const actionsFor = (dept: Department): RowAction[] => {
    const canEdit = session.canInDepartment("department.update", clubId, dept.id);
    const canActivate = dept.status !== "ACTIVE" && session.canInDepartment("department.activate", clubId, dept.id);
    const canDeactivate = dept.status === "ACTIVE" && session.canInDepartment("department.inactive", clubId, dept.id);
    const headSlot = deptHeadSlotFor(dept.id);
    return [
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
          onRowClick={(d) => session.canInDepartment("department.update", clubId, d.id) && openEdit(d)}
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
                Ban này hiện chưa có thành viên nào. Hãy phân công thành viên vào ban tại tab &quot;Phân ban&quot; trước khi bổ nhiệm Trưởng ban.
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
