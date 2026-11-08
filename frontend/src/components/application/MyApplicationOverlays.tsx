"use client";

import { ClipboardList, Paperclip, Pencil, Upload, XCircle } from "lucide-react";
import { ApplicationFilesList, CustomFieldsInputs } from "@/components/shared/ApplicationFileView";
import {
  ApplicationDetailInfoList,
  ApplicationDraftFormFields,
} from "@/components/shared/ApplicationFormFields";
import { DetailList, EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Button } from "@/components/ui/button";
import {
  Application,
  ApplicationFileItem,
  ApplicationSummary,
  ClubApplicationForm,
} from "@/types";

interface MyApplicationOverlaysProps {
  selectedId: string | null;
  closeDrawer: () => void;
  detailData?: Application;
  detailPending: boolean;
  detailError: unknown;
  onRetryDetail: () => void;
  clubForm?: ClubApplicationForm;
  openEdit: (app: Application) => void;
  confirmingCancel: ApplicationSummary | null;
  setConfirmingCancel: (app: ApplicationSummary | null) => void;
  cancelPending: boolean;
  cancelError: unknown;
  onConfirmCancel: (id: string) => void;
  onResetCancel: () => void;
  uploadPending: boolean;
  onUploadFiles: (appId: string, files: File[]) => void;
  deletePending: boolean;
  onDeleteFile: (appId: string, file: ApplicationFileItem) => void;
  editing: Application | null;
  setEditing: React.Dispatch<React.SetStateAction<Application | null>>;
  updatePending: boolean;
  updateError: unknown;
  onSaveEdit: (app: Application) => void;
}

export function MyApplicationOverlays({
  selectedId,
  closeDrawer,
  detailData,
  detailPending,
  detailError,
  onRetryDetail,
  clubForm,
  openEdit,
  confirmingCancel,
  setConfirmingCancel,
  cancelPending,
  cancelError,
  onConfirmCancel,
  onResetCancel,
  uploadPending,
  onUploadFiles,
  deletePending,
  onDeleteFile,
  editing,
  setEditing,
  updatePending,
  updateError,
  onSaveEdit,
}: MyApplicationOverlaysProps) {
  const departments = clubForm?.departments ?? [];

  return (
    <>
      <EntityDrawer
        open={!!selectedId}
        onClose={closeDrawer}
        title={detailData?.clubName ?? "Đơn đăng ký"}
        subtitle={detailData?.clubCode}
        icon={<ClipboardList />}
        footer={
          detailData?.status === "PENDING" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(detailData)}>
                <Pencil size={14} /> Chỉnh sửa đơn
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onResetCancel();
                  setConfirmingCancel(detailData);
                }}
              >
                <XCircle size={14} /> Huỷ đơn
              </Button>
            </div>
          ) : undefined
        }
      >
        {detailPending ? (
          <LoadingRows rows={4} />
        ) : detailError ? (
          <ErrorState message={describeError(detailError)} onRetry={onRetryDetail} />
        ) : (
          detailData && (
            <>
              <ApplicationDetailInfoList application={detailData} />

              {detailData.customAnswers && Object.keys(detailData.customAnswers).length > 0 && (
                <Section title="Câu trả lời riêng của CLB" icon={<ClipboardList />}>
                  <DetailList
                    rows={Object.entries(detailData.customAnswers).map(([k, v]) => {
                      const label = clubForm?.fields.find((f) => f.key === k)?.label || k;
                      return [label, String(v ?? "—")];
                    })}
                  />
                </Section>
              )}

              <Section title={`Tệp đính kèm (${detailData.attachments?.length ?? 0})`} icon={<Paperclip />}>
                {detailData.status === "PENDING" && (
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] px-3 py-2">
                    <span className="text-xs text-muted-foreground">Bổ sung file .doc, .docx, .pdf hoặc ảnh minh chứng:</span>
                    <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:opacity-95">
                      <Upload size={13} /> {uploadPending ? "Đang tải..." : "Thêm tệp"}
                      <input
                        type="file"
                        multiple
                        accept=".doc,.docx,.pdf,.png,.jpg,.jpeg,.gif,.webp"
                        className="hidden"
                        disabled={uploadPending}
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (files.length && detailData) {
                            onUploadFiles(detailData.id, files);
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                )}
                <ApplicationFilesList
                  files={detailData.attachments}
                  deleting={deletePending}
                  onDelete={
                    detailData.status === "PENDING"
                      ? (file) => onDeleteFile(detailData.id, file)
                      : undefined
                  }
                />
              </Section>
            </>
          )
        )}
      </EntityDrawer>

      <ModalShell
        open={!!confirmingCancel}
        onClose={() => setConfirmingCancel(null)}
        title="Xác nhận rút đơn đăng ký"
        icon={<XCircle />}
        size="sm"
        onSubmit={() => confirmingCancel && onConfirmCancel(confirmingCancel.id)}
        submitLabel="Xác nhận huỷ đơn"
        submitDanger
        submitLoading={cancelPending}
      >
        {confirmingCancel && (
          <div className="space-y-2 text-sm">
            <p>
              Bạn có chắc chắn muốn huỷ đơn đăng ký vào <b>{confirmingCancel.clubName}</b>?
            </p>
            <p className="text-xs text-muted-foreground">
              Đơn sẽ chuyển sang trạng thái <b>Đã rút (CANCELLED)</b> và được giữ lại trong lịch sử hồ sơ. Bạn có thể nộp đơn mới nếu CLB còn mở tuyển.
            </p>
            {Boolean(cancelError) && <p className="text-xs text-destructive">{describeError(cancelError)}</p>}
          </div>
        )}
      </ModalShell>

      <ModalShell
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Chỉnh sửa đơn — ${editing?.clubName ?? ""}`}
        icon={<Pencil />}
        size="lg"
        onSubmit={() => editing && onSaveEdit(editing)}
        submitLabel="Lưu thay đổi"
        submitLoading={updatePending}
        submitDisabled={!editing?.message?.trim()}
      >
        {editing && (
          <div className="grid gap-3">
            <ApplicationDraftFormFields
              values={{
                preferredDepartmentId: editing.preferredDepartmentId ?? "",
                secondaryDepartmentId: editing.secondaryDepartmentId ?? "",
                applicantPhone: editing.applicantPhone ?? "",
                facultyMajor: editing.facultyMajor ?? "",
                academicYear: editing.academicYear ?? "",
                gpa: editing.gpa ?? "",
                socialPortfolioUrl: editing.socialPortfolioUrl ?? "",
                selfIntroduction: editing.selfIntroduction ?? "",
                skillsExperience: editing.skillsExperience ?? "",
                availability: editing.availability ?? "",
                message: editing.message,
              }}
              onChange={(key, value) => setEditing({ ...editing, [key]: value })}
              departments={departments}
            />
            {clubForm?.fields && clubForm.fields.length > 0 && (
              <CustomFieldsInputs
                fields={clubForm.fields}
                values={editing.customAnswers ?? {}}
                onChange={(k, v) =>
                  setEditing({
                    ...editing,
                    customAnswers: { ...(editing.customAnswers ?? {}), [k]: v },
                  })
                }
              />
            )}
            {Boolean(updateError) && <p className="text-xs text-destructive">{describeError(updateError)}</p>}
          </div>
        )}
      </ModalShell>
    </>
  );
}
