"use client";
import { AvatarField } from "./AvatarField";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save, ShieldCheck, Trash2, Users } from "lucide-react";
import { apiModel, Club, Role, User, UserRole } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import {
  EMPTY_ROLE_DRAFT,
  RoleDraft,
  RolePicker,
  roleLabel,
  scopeLabel,
  toAssignment,
} from "@/components/shared/RolePicker";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";
import { UserPermissionsSections } from "./UserPermissionsSections";

export function UserDetailDrawer({
  detail,
  onClose,
  roles,
  clubs,
  onUserUpdated,
  onRequestDelete,
}: {
  detail: User | null;
  onClose: () => void;
  roles: Role[];
  clubs: Club[];
  onUserUpdated: (updated: User, notice: string) => void;
  onRequestDelete: (user: User) => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const canAssign = session.can("permission.assign");
  const canRevoke = session.can("permission.revoke");
  const canUpdateUser = session.can("user.update");
  const canDeleteUser = session.can("user.delete");

  const [editFullName, setEditFullName] = useState(detail?.fullName ?? "");
  const [editStudentCode, setEditStudentCode] = useState(detail?.studentCode ?? "");
  const [editPhone, setEditPhone] = useState(detail?.phone ?? "");
  const [editAvatarUrl, setEditAvatarUrl] = useState(detail?.avatarUrl ?? "");
  const [assignDraft, setAssignDraft] = useState<RoleDraft>(EMPTY_ROLE_DRAFT);

  const detailRoles = useQuery({
    queryKey: ["user-roles", detail?.id],
    queryFn: () => apiModel.userRoles(detail!.id),
    enabled: !!detail && session.can("permission.view"),
  });

  const clubName = (id?: string) => clubs.find((c) => c.id === id)?.name ?? id;

  const assignmentTarget = (a: { scope: string; clubId?: string; departmentId?: string }) =>
    a.scope === "GLOBAL"
      ? scopeLabel("GLOBAL")
      : a.scope === "CLUB"
        ? `CLB ${clubName(a.clubId)}`
        : "Theo ban chuyên môn";

  const updateProfile = useMutation({
    mutationFn: () =>
      apiModel.updateUser(detail!.id, {
        fullName: editFullName.trim() || undefined,
        studentCode: editStudentCode.trim() || undefined,
        phone: editPhone.trim() || undefined,
        // "" clears the avatar on the backend; undefined would leave it unchanged
        avatarUrl: editAvatarUrl.trim(),
      }),
    onSuccess: (updated) => {
      onUserUpdated(updated, `Đã cập nhật thông tin tài khoản ${updated.email}.`);
    },
  });

  const assign = useMutation({
    mutationFn: () => apiModel.assignRole(detail!.id, toAssignment(assignDraft, roles)!),
    onSuccess: () => {
      setAssignDraft(EMPTY_ROLE_DRAFT);
      detailRoles.refetch();
      queryClient.invalidateQueries({ queryKey: ["user-effective-permissions", detail?.id] });
    },
  });

  const revoke = useMutation({
    mutationFn: (assignment: UserRole) => apiModel.revokeRole(assignment.userId, assignment.id),
    onSuccess: () => {
      detailRoles.refetch();
      queryClient.invalidateQueries({ queryKey: ["user-effective-permissions", detail?.id] });
    },
  });

  const removeRole = (assignment: UserRole) => {
    if (confirm(`Thu hồi vai trò ${roleLabel(assignment)} của ${detail?.email}?`)) revoke.mutate(assignment);
  };

  return (
    <EntityDrawer
      open={!!detail}
      onClose={() => {
        setAssignDraft(EMPTY_ROLE_DRAFT);
        assign.reset();
        revoke.reset();
        updateProfile.reset();
        onClose();
      }}
      title={detail?.fullName ?? ""}
      subtitle={detail?.email}
      icon={<Users />}
      footer={
        detail && detail.id !== session.user?.id && canDeleteUser ? (
          <Button variant="destructive" size="sm" onClick={() => onRequestDelete(detail)}>
            <Trash2 size={14} /> Xoá tài khoản
          </Button>
        ) : undefined
      }
    >
      {detail && (
        <DetailList
          rows={[
            ["Email", <span key="e" className="font-mono">{detail.email}</span>],
            ["Họ và tên", detail.fullName || "—"],
            ["Mã sinh viên", detail.studentCode || "—"],
            ["Điện thoại", detail.phone || "—"],
            ["Trạng thái", <StatusBadge key="s" status={detail.status} />],
            [
              "Mật khẩu",
              detail.requiresPasswordChange ? (
                <Badge key="p" tone="pending">
                  Chờ người dùng đổi mật khẩu
                </Badge>
              ) : (
                "Đã tự đặt"
              ),
            ],
            ["Ngày tạo", formatDateTime(detail.createdAt)],
            ["Cập nhật", formatDateTime(detail.updatedAt)],
          ]}
        />
      )}
      {detail && canUpdateUser && (
        <Section title="Cập nhật thông tin tài khoản" icon={<Pencil />}>
          <FormField label="Họ và tên" required>
            <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Mã sinh viên">
              <Input value={editStudentCode} onChange={(e) => setEditStudentCode(e.target.value)} />
            </FormField>
            <FormField label="Điện thoại">
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </FormField>
          </div>
          <AvatarField
            value={editAvatarUrl}
            onChange={setEditAvatarUrl}
            fallbackName={editFullName || detail.email}
            upload={(file) => apiModel.uploadUserAvatar(detail.id, file)}
            onUploaded={(updated) => onUserUpdated(updated, `Đã cập nhật ảnh đại diện cho ${updated.email}.`)}
          />
          {updateProfile.error && <p className="text-xs text-destructive">{describeError(updateProfile.error)}</p>}
          <Button
            size="sm"
            className="justify-self-end"
            disabled={!editFullName.trim() || updateProfile.isPending}
            onClick={() => updateProfile.mutate()}
          >
            <Save size={14} /> {updateProfile.isPending ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </Section>
      )}
      {detail && session.can("permission.view") && (
        <>
          <Section title="Vai trò được bổ nhiệm" icon={<ShieldCheck />}>
            {detailRoles.isPending ? (
              <LoadingRows rows={2} />
            ) : detailRoles.isError ? (
              <ErrorState message={describeError(detailRoles.error)} />
            ) : !detailRoles.data.length ? (
              <p className="text-sm text-muted-foreground">Chưa có vai trò nào được gán.</p>
            ) : (
              <ul className="grid gap-2">
                {detailRoles.data.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{roleLabel(a)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {assignmentTarget(a)} · từ {formatDay(a.grantedAt)}
                      </p>
                    </div>
                    {canRevoke && (
                      <button
                        type="button"
                        aria-label="Thu hồi vai trò"
                        onClick={() => removeRole(a)}
                        disabled={revoke.isPending}
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {revoke.error && <p className="mt-2 text-xs text-destructive">{describeError(revoke.error)}</p>}
            {canAssign && (
              <div className="mt-3 space-y-2">
                <RolePicker value={assignDraft} onChange={setAssignDraft} roles={roles} clubs={clubs} />
                <Button
                  size="sm"
                  disabled={!toAssignment(assignDraft, roles) || assign.isPending}
                  onClick={() => assign.mutate()}
                >
                  <Plus size={14} /> Gán vai trò
                </Button>
                {assign.error && <p className="text-xs text-destructive">{describeError(assign.error)}</p>}
              </div>
            )}
          </Section>

          <UserPermissionsSections
            user={detail}
            clubs={clubs}
            canAssign={canAssign}
            canRevoke={canRevoke}
            assignmentTarget={assignmentTarget}
          />
        </>
      )}
    </EntityDrawer>
  );
}
