"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, PauseCircle, PlayCircle, ShieldCheck, UserMinus, UserPlus, UserRound } from "lucide-react";
import { apiModel, Club, Department, Membership } from "@/lib/api";
import { toApiMediaUrl } from "@/lib/media";
import { ClubMediaPickerField } from "@/components/shared/ClubMedia";
import { DetailList, EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { EMPTY_CREATE_CLUB_FORM, CreateClubFormValues } from "@/forms/club/club-form";

export function AddClubMemberModal({
  clubId,
  open,
  onClose,
  canViewUsers,
  onAdded,
}: {
  clubId: string;
  open: boolean;
  onClose: () => void;
  canViewUsers: boolean;
  onAdded: () => void;
}) {
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const candidateUsers = useQuery({
    queryKey: ["users", "candidate", userSearch],
    queryFn: () => apiModel.users(userSearch, 0, 20),
    enabled: open && canViewUsers,
  });

  const addMember = useMutation({
    mutationFn: () => apiModel.addClubMember(clubId, newMemberUserId.trim()),
    onSuccess: () => {
      setNewMemberUserId("");
      onAdded();
      onClose();
    },
  });

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Thêm thành viên vào câu lạc bộ"
      icon={<UserPlus />}
      size="sm"
      onSubmit={() => addMember.mutate()}
      submitLabel="Thêm thành viên"
      submitLoading={addMember.isPending}
      submitDisabled={!newMemberUserId.trim()}
    >
      {canViewUsers ? (
        <>
          <FormField label="Tìm kiếm tài khoản">
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Tìm theo tên, email, mã sinh viên…"
            />
          </FormField>
          <FormField label="Chọn người dùng" required>
            <Select value={newMemberUserId} onChange={(e) => setNewMemberUserId(e.target.value)}>
              <option value="">Chọn tài khoản…</option>
              {(candidateUsers.data?.items ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || u.email} ({u.studentCode ? `${u.studentCode} · ` : ""}
                  {u.email})
                </option>
              ))}
            </Select>
          </FormField>
        </>
      ) : (
        <FormField label="Mã định danh người dùng (UUID)" required>
          <Input
            value={newMemberUserId}
            onChange={(e) => setNewMemberUserId(e.target.value)}
            placeholder="Nhập UUID tài khoản cần kết nạp…"
          />
        </FormField>
      )}
      {addMember.error && <p className="text-xs text-destructive">{describeError(addMember.error)}</p>}
    </ModalShell>
  );
}

export function CreateClubModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (created: Club) => void;
}) {
  const [clubForm, setClubForm] = useState<CreateClubFormValues>(EMPTY_CREATE_CLUB_FORM);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);

  const createClubMutation = useMutation({
    mutationFn: async () => {
      const created = await apiModel.createClub({
        code: clubForm.code.trim().toUpperCase(),
        name: clubForm.name.trim(),
        activityField: clubForm.activityField.trim() || undefined,
        contactEmail: clubForm.contactEmail.trim() || undefined,
        logoUrl: clubForm.logoUrl.startsWith("blob:") ? undefined : toApiMediaUrl(clubForm.logoUrl) || undefined,
        coverUrl: clubForm.coverUrl.startsWith("blob:") ? undefined : toApiMediaUrl(clubForm.coverUrl) || undefined,
        description: clubForm.description.trim() || undefined,
      });
      if (pendingLogoFile) {
        await apiModel.uploadClubLogo(created.id, pendingLogoFile);
      }
      if (pendingCoverFile) {
        await apiModel.uploadClubCover(created.id, pendingCoverFile);
      }
      return created;
    },
    onSuccess: (created) => {
      setClubForm(EMPTY_CREATE_CLUB_FORM);
      setPendingLogoFile(null);
      setPendingCoverFile(null);
      onCreated(created);
      onClose();
    },
  });

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Thành lập câu lạc bộ mới"
      icon={<Building2 />}
      onSubmit={() => createClubMutation.mutate()}
      submitLabel="Tạo câu lạc bộ"
      submitLoading={createClubMutation.isPending}
      submitDisabled={!clubForm.code.trim() || !clubForm.name.trim()}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Mã câu lạc bộ" required hint="In hoa, chữ số hoặc dấu gạch ngang (VD: VJU-IT)">
          <Input
            value={clubForm.code}
            maxLength={50}
            onChange={(e) => setClubForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="VJU-IT"
          />
        </FormField>
        <FormField label="Tên câu lạc bộ" required>
          <Input
            value={clubForm.name}
            maxLength={200}
            onChange={(e) => setClubForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="CLB Công nghệ thông tin"
          />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Lĩnh vực hoạt động">
          <Input
            value={clubForm.activityField}
            maxLength={200}
            onChange={(e) => setClubForm((f) => ({ ...f, activityField: e.target.value }))}
            placeholder="Học thuật, Văn hóa, Thể thao…"
          />
        </FormField>
        <FormField label="Email liên hệ">
          <Input
            type="email"
            value={clubForm.contactEmail}
            maxLength={320}
            onChange={(e) => setClubForm((f) => ({ ...f, contactEmail: e.target.value }))}
            placeholder="clb@vju.ac.vn"
          />
        </FormField>
      </div>
      <ClubMediaPickerField
        label="Logo câu lạc bộ"
        value={clubForm.logoUrl}
        onChange={(v) => setClubForm((f) => ({ ...f, logoUrl: v }))}
        kind="logo"
        clubCode={clubForm.code}
        onPendingFileChange={setPendingLogoFile}
      />
      <ClubMediaPickerField
        label="Ảnh bìa câu lạc bộ"
        value={clubForm.coverUrl}
        onChange={(v) => setClubForm((f) => ({ ...f, coverUrl: v }))}
        kind="cover"
        clubCode={clubForm.code}
        onPendingFileChange={setPendingCoverFile}
      />
      <FormField label="Giới thiệu câu lạc bộ">
        <Textarea
          value={clubForm.description}
          maxLength={2000}
          onChange={(e) => setClubForm((f) => ({ ...f, description: e.target.value }))}
        />
      </FormField>
      {createClubMutation.error && <p className="text-xs text-destructive">{describeError(createClubMutation.error)}</p>}
    </ModalShell>
  );
}

export function ClubMemberDetailDrawer({
  memberId,
  clubName,
  onClose,
  memberOf,
  departmentsByMember,
  busy,
  canUpdate,
  canRemove,
  onStatus,
  onRequestLeave,
}: {
  memberId: string | null;
  clubName?: string;
  onClose: () => void;
  memberOf: (m: Membership) => React.ReactNode;
  departmentsByMember: Record<string, Department[]>;
  busy: boolean;
  canUpdate: boolean;
  canRemove: boolean;
  onStatus: (id: string, value: string) => void;
  onRequestLeave: (membership: Membership) => void;
}) {
  const memberDetail = useQuery({
    queryKey: ["membership", memberId],
    queryFn: () => apiModel.membership(memberId!),
    enabled: !!memberId,
  });

  const membership = memberDetail.data;
  const departments = membership ? departmentsByMember[membership.id] ?? [] : [];

  return (
    <EntityDrawer
      open={!!memberId}
      onClose={onClose}
      title="Chi tiết thành viên"
      subtitle={clubName}
      icon={<UserRound />}
    >
      {memberDetail.isPending ? (
        <LoadingRows rows={3} />
      ) : memberDetail.isError ? (
        <ErrorState message={describeError(memberDetail.error)} onRetry={() => memberDetail.refetch()} />
      ) : (
        membership && (
          <>
            <DetailList
              rows={[
                ["Thành viên", memberOf(membership)],
                ["Trạng thái", <StatusBadge key="s" status={membership.status} />],
                ["Ngày tham gia", formatDateTime(membership.joinedAt)],
                ["Ngày rời CLB", formatDateTime(membership.leftAt)],
                ["Ban chuyên môn", departments.length ? departments.map((d) => d.name).join(", ") : "—"],
              ]}
            />
            {((canUpdate && membership.status !== "LEFT") || (canRemove && membership.status !== "LEFT")) && (
              <Section title="Quản lý trạng thái thành viên" icon={<ShieldCheck />}>
                <div className="flex flex-wrap gap-2">
                  {canUpdate && membership.status === "SUSPENDED" && (
                    <Button size="sm" disabled={busy} onClick={() => onStatus(membership.id, "ACTIVE")}>
                      <PlayCircle size={14} /> Kích hoạt lại
                    </Button>
                  )}
                  {canUpdate && membership.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onStatus(membership.id, "SUSPENDED")}
                    >
                      <PauseCircle size={14} /> Tạm đình chỉ
                    </Button>
                  )}
                  {canRemove && membership.status !== "LEFT" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => onRequestLeave(membership)}
                    >
                      <UserMinus size={14} /> Cho rời CLB
                    </Button>
                  )}
                </div>
                {membership.status === "SUSPENDED" && (
                  <p className="text-xs text-muted-foreground">
                    Khi đang tạm đình chỉ, mọi quyền thuộc phạm vi CLB và Ban của thành viên này được tạm dừng hiệu lực cho tới khi kích hoạt lại.
                  </p>
                )}
              </Section>
            )}
          </>
        )
      )}
    </EntityDrawer>
  );
}

export function ConfirmLeaveClubModal({
  confirmingLeave,
  onClose,
  onRemoved,
}: {
  confirmingLeave: Membership | null;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const removeMember = useMutation({
    mutationFn: (id: string) => apiModel.removeMembership(id),
    onSuccess: () => {
      onRemoved();
      onClose();
    },
  });

  return (
    <ModalShell
      open={!!confirmingLeave}
      onClose={onClose}
      title="Xác nhận cho thành viên rời CLB"
      icon={<UserMinus />}
      size="sm"
      onSubmit={() => confirmingLeave && removeMember.mutate(confirmingLeave.id)}
      submitLabel="Xác nhận rời CLB"
      submitDanger
      submitLoading={removeMember.isPending}
    >
      {confirmingLeave && (
        <div className="space-y-2 text-sm">
          <p>
            Xác nhận chuyển thành viên <b>{confirmingLeave.userFullName || confirmingLeave.userId}</b> sang trạng thái{" "}
            <b>Đã rời CLB (LEFT)</b>?
          </p>
          <p className="text-xs text-muted-foreground">
            Hệ thống sẽ lưu lại lịch sử tham gia (không xoá cứng dữ liệu), đồng thời tự động gỡ tư cách thành viên các Ban chuyên môn và thu hồi mọi vai trò/quyền thuộc phạm vi CLB này.
          </p>
          {removeMember.error && <p className="text-xs text-destructive">{describeError(removeMember.error)}</p>}
        </div>
      )}
    </ModalShell>
  );
}
