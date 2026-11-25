"use client";
import { AvatarField } from "./AvatarField";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { Pencil, Plus, Save, ShieldCheck, Trash2, Users } from "lucide-react";
import { apiModel, Club, PermissionItem, Role, User, UserRole } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useCriticalActionOtp } from "@/hooks/useCriticalActionOtp";
import { Otp2FaChallengeModal } from "@/components/auth/Otp2FaChallengeModal";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import { EMPTY_ROLE_DRAFT, RoleDraft, RolePicker, roleLabel, scopeLabel, toAssignment } from "@/components/shared/RolePicker";
import { ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";
import { analyzeUserDrawerDrafts, DirectPermissionDraft, EMPTY_DIRECT_PERM_DRAFT } from "@/utils/access/user-access-draft";
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
  const roleOtp = useCriticalActionOtp("ROLE_CHANGE");
  const canAssign = session.can("permission.assign");
  const canRevoke = session.can("permission.revoke");
  const canUpdateUser = session.can("user.update");
  const canDeleteUser = session.can("user.delete");

  const [editFullName, setEditFullName] = useState(detail?.fullName ?? "");
  const [editStudentCode, setEditStudentCode] = useState(detail?.studentCode ?? "");
  const [editPhone, setEditPhone] = useState(detail?.phone ?? "");
  const [editAvatarUrl, setEditAvatarUrl] = useState(detail?.avatarUrl ?? "");
  const [assignDraft, setAssignDraft] = useState<RoleDraft>(EMPTY_ROLE_DRAFT);
  const [permDraft, setPermDraft] = useState<DirectPermissionDraft>(EMPTY_DIRECT_PERM_DRAFT);
  const [drawerNotice, setDrawerNotice] = useState("");
  const [drawerToast, setDrawerToast] = useState("");
  const [drawerError, setDrawerError] = useState("");
  const [isSavingAll, setIsSavingAll] = useState(false);

  const detailRoles = useQuery({
    queryKey: qk.userRoles(detail?.id),
    queryFn: () => apiModel.userRoles(detail!.id),
    enabled: !!detail && session.can("permission.view"),
  });
  const permGroups = useQuery({
    queryKey: qk.permissionGroups(),
    queryFn: apiModel.permissionGroups,
    enabled: !!detail && (session.can("permission.view") || canAssign),
    staleTime: 60_000,
  });

  const allPermissions = useMemo<PermissionItem[]>(
    () => (permGroups.data ?? []).flatMap((g) => g.permissions).filter((p) => p.active),
    [permGroups.data]
  );

  const analysis = analyzeUserDrawerDrafts({
    user: detail,
    profile: { fullName: editFullName, studentCode: editStudentCode, phone: editPhone, avatarUrl: editAvatarUrl },
    canUpdateUser,
    canAssign,
    roleDraft: assignDraft,
    roles,
    permDraft,
    permissions: allPermissions,
  });

  const refreshSelfSession = (targetId: string) => {
    if (targetId === session.user?.id) {
      queryClient.invalidateQueries({ queryKey: qk.me() });
      queryClient.invalidateQueries({ queryKey: qk.optionalMe() });
      queryClient.invalidateQueries({ queryKey: qk.me("permissions") });
      queryClient.invalidateQueries({ queryKey: qk.optionalMe("permissions") });
    }
  };

  const clubName = (id?: string) => clubs.find((c) => c.id === id)?.name ?? id;
  const assignmentTarget = (a: { scope: string; clubId?: string; departmentId?: string }) =>
    a.scope === "GLOBAL" ? scopeLabel("GLOBAL") : a.scope === "CLUB" ? `CLB ${clubName(a.clubId)}` : "Theo ban chuyên môn";

  const syncProfileState = (updated: User) => {
    setEditFullName(updated.fullName ?? "");
    setEditStudentCode(updated.studentCode ?? "");
    setEditPhone(updated.phone ?? "");
    setEditAvatarUrl(updated.avatarUrl ?? "");
  };

  const assign = useMutation({
    mutationFn: () => roleOtp.runWithOtp((otp) => apiModel.assignRole(detail!.id, toAssignment(assignDraft, roles)!, otp)),
    onSuccess: () => {
      setAssignDraft(EMPTY_ROLE_DRAFT);
      setDrawerError("");
      const msg = `Đã gán vai trò mới cho tài khoản ${detail!.email}.`;
      setDrawerNotice(msg);
      setDrawerToast(msg);
      queryClient.invalidateQueries({ queryKey: qk.userRoles(detail?.id) });
      queryClient.invalidateQueries({ queryKey: qk.userEffectivePermissions(detail?.id) });
      refreshSelfSession(detail!.id);
    },
  });

  const revoke = useMutation({
    mutationFn: (assignment: UserRole) => roleOtp.runWithOtp((otp) => apiModel.revokeRole(assignment.userId, assignment.id, otp)),
    onSuccess: (_, assignment) => {
      setDrawerError("");
      const msg = `Đã thu hồi vai trò ${roleLabel(assignment)} của ${detail!.email}.`;
      setDrawerNotice(msg);
      setDrawerToast(msg);
      queryClient.invalidateQueries({ queryKey: qk.userRoles(detail?.id) });
      queryClient.invalidateQueries({ queryKey: qk.userEffectivePermissions(detail?.id) });
      refreshSelfSession(detail!.id);
    },
  });

  const removeRole = (assignment: UserRole) => {
    if (confirm(`Thu hồi vai trò ${roleLabel(assignment)} của ${detail?.email}?`)) revoke.mutate(assignment);
  };

  const handleSaveAll = async () => {
    if (!detail) return;
    setDrawerError("");
    setDrawerNotice("");
    setDrawerToast("");

    if (analysis.hasIncompleteProfile) {
      setDrawerError("Vui lòng nhập Họ và tên trước khi lưu.");
      return;
    }
    if (analysis.hasIncompleteRole) {
      setDrawerError("Vui lòng chọn Câu lạc bộ cho vai trò đang chọn trước khi lưu.");
      return;
    }
    if (analysis.hasIncompletePerm) {
      setDrawerError("Vui lòng chọn đầy đủ Câu lạc bộ / Ban chuyên môn cho quyền trực tiếp đang chọn trước khi lưu.");
      return;
    }
    if (!analysis.hasSavableChanges) return;

    setIsSavingAll(true);
    let latestUser = detail;
    const savedParts: string[] = [];

    try {
      if (analysis.profileDirty) {
        latestUser = await apiModel.updateUser(detail.id, {
          fullName: editFullName.trim() || undefined,
          studentCode: editStudentCode.trim() || undefined,
          phone: editPhone.trim() || undefined,
          avatarUrl: editAvatarUrl.trim(),
        });
        syncProfileState(latestUser);
        savedParts.push("hồ sơ");
      }
      if (analysis.rolePayload) {
        await roleOtp.runWithOtp((otp) => apiModel.assignRole(detail.id, analysis.rolePayload!, otp));
        setAssignDraft(EMPTY_ROLE_DRAFT);
        savedParts.push("vai trò");
      }
      if (analysis.permPayload) {
        await roleOtp.runWithOtp((otp) => apiModel.grantPermission(detail.id, analysis.permPayload!, otp));
        setPermDraft(EMPTY_DIRECT_PERM_DRAFT);
        savedParts.push("quyền trực tiếp");
      }

      const msg = `Đã lưu thay đổi (${savedParts.join(", ")}) cho tài khoản ${latestUser.email}.`;
      setDrawerNotice(msg);
      onUserUpdated(latestUser, msg);
    } catch (err) {
      setDrawerError(describeError(err));
    } finally {
      if (savedParts.length > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: qk.userRoles(detail.id) }),
          queryClient.invalidateQueries({ queryKey: qk.userPermissions(detail.id) }),
          queryClient.invalidateQueries({ queryKey: qk.userEffectivePermissions(detail.id) }),
        ]);
        refreshSelfSession(detail.id);
      }
      setIsSavingAll(false);
    }
  };

  const handleRequestClose = () => {
    if (isSavingAll) return;
    if (
      analysis.hasAnyUnsavedInput &&
      !confirm("Bạn đang có thông tin hoặc phân quyền chưa lưu. Đóng cửa sổ và bỏ các lựa chọn chưa lưu?")
    ) {
      return;
    }
    setAssignDraft(EMPTY_ROLE_DRAFT);
    setPermDraft(EMPTY_DIRECT_PERM_DRAFT);
    setDrawerError("");
    setDrawerNotice("");
    setDrawerToast("");
    assign.reset();
    revoke.reset();
    onClose();
  };

  const saveDisabled =
    (!analysis.hasSavableChanges &&
      !analysis.hasIncompleteRole &&
      !analysis.hasIncompletePerm &&
      !analysis.hasIncompleteProfile) ||
    isSavingAll;

  return (
    <>
    <EntityDrawer
      open={!!detail}
      onClose={handleRequestClose}
      title={detail?.fullName ?? ""}
      subtitle={detail?.email}
      icon={<Users />}
      footer={
        detail ? (
          <>
            {drawerError && (
              <p role="alert" className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
                {drawerError}
              </p>
            )}
            {!drawerError && drawerNotice && (
              <p role="status" className="w-full rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-medium text-slate-900">
                {drawerNotice}
              </p>
            )}
            {detail.id !== session.user?.id && canDeleteUser && (
              <Button variant="destructive" size="sm" className="mr-auto" onClick={() => onRequestDelete(detail)}>
                <Trash2 size={14} /> Xoá tài khoản
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleRequestClose}>
              Đóng
            </Button>
            {(canUpdateUser || canAssign) && (
              <Button size="sm" disabled={saveDisabled} onClick={handleSaveAll}>
                <Save size={14} /> {isSavingAll ? "Đang lưu…" : "Lưu thay đổi"}
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {drawerToast && <Notice tone="success">{drawerToast}</Notice>}
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
              detail.requiresPasswordChange ? <Badge key="p" tone="pending">Chờ người dùng đổi mật khẩu</Badge> : "Đã tự đặt",
            ],
            ["Ngày tạo", formatDateTime(detail.createdAt)],
            ["Cập nhật", formatDateTime(detail.updatedAt)],
          ]}
        />
      )}
      {detail && canUpdateUser && (
        <Section title="Cập nhật thông tin tài khoản" icon={<Pencil />}>
          <FormField label="Họ và tên" required>
            <Input maxLength={200} value={editFullName} onChange={(e) => { setDrawerError(""); setEditFullName(e.target.value); }} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Mã sinh viên">
              <Input maxLength={50} value={editStudentCode} onChange={(e) => { setDrawerError(""); setEditStudentCode(e.target.value); }} />
            </FormField>
            <FormField label="Điện thoại">
              <Input type="tel" maxLength={32} value={editPhone} onChange={(e) => { setDrawerError(""); setEditPhone(e.target.value); }} />
            </FormField>
          </div>
          <AvatarField
            value={editAvatarUrl}
            onChange={(next) => { setDrawerError(""); setEditAvatarUrl(next); }}
            fallbackName={editFullName || detail.email}
            upload={(file) => apiModel.uploadUserAvatar(detail.id, file)}
            onUploaded={(updated) => {
              syncProfileState(updated);
              refreshSelfSession(updated.id);
              onUserUpdated(updated, `Đã cập nhật ảnh đại diện cho ${updated.email}.`);
            }}
          />
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
                  <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
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
                <RolePicker
                  value={assignDraft}
                  onChange={(next) => { setDrawerError(""); setAssignDraft(next); }}
                  roles={roles}
                  clubs={clubs}
                />
                <Button size="sm" disabled={!toAssignment(assignDraft, roles) || assign.isPending} onClick={() => assign.mutate()}>
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
            draft={permDraft}
            onDraftChange={(next) => { setDrawerError(""); setPermDraft(next); }}
            onRefreshEffective={() => refreshSelfSession(detail.id)}
          />
        </>
      )}
    </EntityDrawer>
    <Otp2FaChallengeModal {...roleOtp.otpModalProps} />
    </>
  );
}
