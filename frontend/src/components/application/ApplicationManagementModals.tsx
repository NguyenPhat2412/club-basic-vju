"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ClipboardList, X } from "lucide-react";
import { apiModel, Application, ApplicationForm, Department } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useUserNames } from "@/hooks/user/useUsers";
import { ApplicationFilesList, CustomFieldsInputs } from "@/components/shared/ApplicationFileView";
import {
  ApplicationAttachmentPicker,
  ApplicationDraftFormFields,
  PendingApplicationAttachment,
} from "@/components/shared/ApplicationFormFields";
import { ModalShell } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { StatusBadge } from "@/components/ui/badge";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import {
  AppManageDraft,
  inferApplicantCategory,
  toCreateApplicationPayload,
  toUpdateApplicationPayload,
} from "@/forms/application/application-form";

export function ReviewApplicationModal({
  clubId,
  review,
  onClose,
  activeDepartments,
  onSuccess,
  onError,
}: {
  clubId: string;
  review: { app: Application; approve: boolean } | null;
  onClose: () => void;
  activeDepartments: Department[];
  onSuccess: (approve: boolean, reviewDeptId: string) => void;
  onError: (msg: string) => void;
}) {
  const session = useSession();
  const nameOf = useUserNames(session.can("user.view"));
  const [reviewDeptId, setReviewDeptId] = useState(review?.app.preferredDepartmentId || "");
  const [note, setNote] = useState(review?.app.reviewNote || "");
  const [internalNote, setInternalNote] = useState(review?.app.internalNote || "");

  const reviewMutation = useMutation({
    mutationFn: ({ app, approve }: { app: Application; approve: boolean }) =>
      approve
        ? apiModel.approve(clubId, app.id, {
            reviewNote: note.trim() || undefined,
            internalNote: internalNote.trim() || undefined,
            departmentId: reviewDeptId || undefined,
            skipDepartmentAssignment: !reviewDeptId,
          })
        : apiModel.reject(clubId, app.id, {
            reviewNote: note.trim() || undefined,
            internalNote: internalNote.trim() || undefined,
          }),
    onSuccess: (_, { approve }) => {
      onSuccess(approve, reviewDeptId);
      setNote("");
      setInternalNote("");
      setReviewDeptId("");
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <ModalShell
      open={!!review}
      onClose={onClose}
      title={review?.approve ? "Duyệt đơn đăng ký" : "Từ chối đơn đăng ký"}
      icon={review?.approve ? <Check /> : <X />}
      size="md"
      onSubmit={() => review && reviewMutation.mutate(review)}
      submitLabel={review?.approve ? "Duyệt & Thêm thành viên" : "Xác nhận từ chối"}
      submitDanger={!review?.approve}
      submitLoading={reviewMutation.isPending}
    >
      {review && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs leading-5">
          <p className="font-bold text-foreground">
            {review.app.applicantName ?? nameOf(review.app.applicantId)?.fullName ?? "Người nộp"}
          </p>
          <p className="mt-0.5 line-clamp-3 text-muted-foreground">{review.app.message}</p>
        </div>
      )}
      {review?.approve && activeDepartments.length > 0 && (
        <FormField label="Phân vào Ban ngay khi duyệt (tuỳ chọn)">
          <Select value={reviewDeptId} onChange={(e) => setReviewDeptId(e.target.value)}>
            <option value="">— Chưa phân ban (chỉ thêm làm thành viên CLB) —</option>
            {activeDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.id === review.app.preferredDepartmentId
                  ? " (Nguyện vọng 1)"
                  : d.id === review.app.secondaryDepartmentId
                    ? " (Nguyện vọng 2)"
                    : ""}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      <FormField
        label="Phản hồi gửi ứng viên (tuỳ chọn)"
        hint="Hiển thị trực tiếp cho sinh viên trong chi tiết đơn đăng ký."
      >
        <Textarea
          rows={2}
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            review?.approve
              ? "Lời chào mừng hoặc hướng dẫn bước tiếp theo cho thành viên mới…"
              : "Lý do từ chối hoặc góp ý thân thiện gửi tới ứng viên…"
          }
        />
      </FormField>
      <FormField
        label="Ghi chú nội bộ Ban Chủ nhiệm (ẩn với ứng viên)"
        hint="Chỉ người có quyền xem/duyệt đơn tại CLB mới thấy ghi chú này."
      >
        <Textarea
          rows={2}
          value={internalNote}
          maxLength={1000}
          onChange={(e) => setInternalNote(e.target.value)}
          placeholder="Đánh giá nội bộ của BCN về hồ sơ ứng viên…"
        />
      </FormField>
      {reviewMutation.error && <p className="text-xs text-destructive">{describeError(reviewMutation.error)}</p>}
    </ModalShell>
  );
}

export function UpsertApplicationModal({
  clubId,
  modalMode,
  editingApp,
  draft,
  setDraft,
  activeDepartments,
  activeForm,
  canViewDetail,
  onClose,
  onSaved,
  onFileDeleted,
  onError,
}: {
  clubId: string;
  modalMode: "create" | "edit" | null;
  editingApp: Application | null;
  draft: AppManageDraft;
  setDraft: React.Dispatch<React.SetStateAction<AppManageDraft>>;
  activeDepartments: Department[];
  activeForm?: ApplicationForm | null;
  canViewDetail: boolean;
  onClose: () => void;
  onSaved: (mode: "create" | "edit") => void;
  onFileDeleted: (updated: Application) => void;
  onError: (msg: string) => void;
}) {
  const session = useSession();
  const canViewUsers = session.can("user.view");
  const [pendingAttachments, setPendingAttachments] = useState<PendingApplicationAttachment[]>([]);

  const usersListQuery = useQuery({
    queryKey: ["users", "for-application-create"],
    queryFn: () => apiModel.users("", 0, 100),
    enabled: session.ready && canViewUsers && modalMode === "create",
  });

  const saveAppMutation = useMutation({
    mutationFn: async () => {
      let saved: Application;
      if (modalMode === "edit" && editingApp) {
        saved = await apiModel.updateClubApplication(
          clubId,
          editingApp.id,
          toUpdateApplicationPayload(draft, editingApp.status === "APPROVED")
        );
      } else {
        saved = await apiModel.apply(
          clubId,
          toCreateApplicationPayload(draft, activeForm?.id, draft.applicantId.trim() || undefined)
        );
      }
      for (const item of pendingAttachments) {
        await apiModel.uploadApplicationFile(saved.id, item.file, item.category);
      }
      return canViewDetail ? apiModel.clubApplicationDetail(clubId, saved.id) : saved;
    },
    onSuccess: () => {
      setPendingAttachments([]);
      if (modalMode) onSaved(modalMode);
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  const deleteFileMutation = useMutation({
    mutationFn: async ({ appId, fileId }: { appId: string; fileId: string }) => {
      await apiModel.deleteApplicationFile(appId, fileId);
      return apiModel.clubApplicationDetail(clubId, appId);
    },
    onSuccess: (updated) => onFileDeleted(updated),
    onError: (e) => onError(describeError(e)),
  });

  return (
    <ModalShell
      open={modalMode !== null}
      onClose={() => {
        setPendingAttachments([]);
        onClose();
      }}
      title={modalMode === "edit" ? "Chỉnh sửa hồ sơ đơn & Ghi chú BCN" : "Tạo hồ sơ đơn đăng ký mới"}
      icon={<ClipboardList />}
      size="lg"
      onSubmit={() => saveAppMutation.mutate()}
      submitLabel={modalMode === "edit" ? "Lưu thay đổi" : "Tạo hồ sơ đơn"}
      submitLoading={saveAppMutation.isPending}
      submitDisabled={!draft.message.trim()}
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {modalMode === "create" && (
          <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-3.5">
            <FormField label="Chọn người nộp đơn (Ứng viên)" required>
              {usersListQuery.data?.items && usersListQuery.data.items.length > 0 ? (
                <Select
                  value={draft.applicantId}
                  onChange={(e) => setDraft({ ...draft, applicantId: e.target.value })}
                >
                  {usersListQuery.data.items.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.email} ({u.email}
                      {u.studentCode ? ` · ${u.studentCode}` : ""})
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={draft.applicantId}
                  onChange={(e) => setDraft({ ...draft, applicantId: e.target.value })}
                  placeholder="Nhập UUID người nộp đơn (hoặc để trống để nộp bằng tài khoản hiện tại)"
                />
              )}
            </FormField>
          </div>
        )}

        {modalMode === "edit" && editingApp && (
          <div className="grid gap-3 rounded-lg border border-primary/25 bg-primary/[0.04] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Ghi chú xét duyệt & Phân ban (không đổi trạng thái đơn tại đây)
              </p>
              <StatusBadge status={editingApp.status} />
            </div>
            {editingApp.status === "APPROVED" && activeDepartments.length > 0 && (
              <FormField label="Bổ sung phân vào Ban (cho thành viên đang hoạt động)">
                <Select
                  value={draft.assignDepartmentId}
                  onChange={(e) => setDraft({ ...draft, assignDepartmentId: e.target.value })}
                >
                  <option value="">— Không thay đổi / Giữ nguyên —</option>
                  {activeDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField label="Phản hồi gửi ứng viên (hiển thị cho sinh viên)">
              <Textarea
                rows={2}
                maxLength={1000}
                value={draft.reviewNote}
                onChange={(e) => setDraft({ ...draft, reviewNote: e.target.value })}
                placeholder="Phản hồi hiển thị cho người nộp đơn…"
              />
            </FormField>
            <FormField label="Ghi chú nội bộ BCN (ẩn với ứng viên)">
              <Textarea
                rows={2}
                maxLength={1000}
                value={draft.internalNote}
                onChange={(e) => setDraft({ ...draft, internalNote: e.target.value })}
                placeholder="Ghi chú nội bộ chỉ BCN nhìn thấy…"
              />
            </FormField>
          </div>
        )}

        <ApplicationDraftFormFields
          values={draft}
          onChange={(key, value) => setDraft((prev) => ({ ...prev, [key]: value }))}
          departments={activeDepartments}
        />

        {activeForm?.fields && activeForm.fields.length > 0 && (
          <CustomFieldsInputs
            fields={activeForm.fields}
            values={draft.customAnswers}
            onChange={(key, val) =>
              setDraft({
                ...draft,
                customAnswers: { ...draft.customAnswers, [key]: val },
              })
            }
          />
        )}

        {modalMode === "edit" && editingApp && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tệp đính kèm hiện có ({editingApp.attachments?.length ?? 0})
            </p>
            <ApplicationFilesList
              files={editingApp.attachments}
              deleting={deleteFileMutation.isPending}
              onDelete={(f) => deleteFileMutation.mutate({ appId: editingApp.id, fileId: f.id })}
            />
          </div>
        )}

        <ApplicationAttachmentPicker
          attachments={pendingAttachments}
          setAttachments={setPendingAttachments}
          onSelectFiles={(e) => {
            const selected = Array.from(e.target.files ?? []);
            if (selected.length > 0) {
              setPendingAttachments((prev) => [
                ...prev,
                ...selected.map((file) => ({ file, category: inferApplicantCategory(file.name) })),
              ]);
            }
            e.target.value = "";
          }}
        />

        {saveAppMutation.error && <p className="text-xs text-destructive">{describeError(saveAppMutation.error)}</p>}
      </div>
    </ModalShell>
  );
}
