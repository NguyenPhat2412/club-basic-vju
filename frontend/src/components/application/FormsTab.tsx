"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, FileText, Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import {
  apiModel,
  ApplicationForm,
  UpsertApplicationFormInput,
} from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { ApplicationFilesList } from "@/components/shared/ApplicationFileView";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EMPTY_FORM_DRAFT } from "@/forms/application/application-form";
import { FormBuilderModal } from "@/components/application/FormBuilderModal";

export function FormsTab({
  clubId,
  clubName,
  onNotice,
  onError,
}: {
  clubId: string;
  clubName?: string;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const canManageForm =
    session.canInClub("application.manage_form", clubId) ||
    session.canInClub("application.review", clubId);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formDraft, setFormDraft] = useState<UpsertApplicationFormInput>(EMPTY_FORM_DRAFT);

  const forms = useQuery({
    queryKey: ["club-application-forms", clubId],
    queryFn: () => apiModel.clubApplicationForms(clubId),
    enabled: !!clubId,
  });

  const refreshForms = () => {
    queryClient.invalidateQueries({ queryKey: ["club-application-forms", clubId] });
    queryClient.invalidateQueries({ queryKey: ["club-application-form", clubId] });
  };

  const deleteFormMutation = useMutation({
    mutationFn: (formId: string) => apiModel.deleteClubApplicationForm(clubId, formId),
    onSuccess: () => {
      onNotice("Đã xoá biểu mẫu đơn đăng ký.");
      onError("");
      refreshForms();
    },
    onError: (e) => onError(describeError(e)),
  });

  const uploadFormFileMutation = useMutation({
    mutationFn: async ({ formId, files, category }: { formId: string; files: File[]; category: string }) => {
      for (const file of files) {
        await apiModel.uploadFormFile(clubId, formId, file, category);
      }
    },
    onSuccess: () => {
      onNotice("Đã tải lên tệp biểu mẫu / poster của CLB.");
      onError("");
      refreshForms();
    },
    onError: (e) => onError(describeError(e)),
  });

  const deleteFormFileMutation = useMutation({
    mutationFn: ({ formId, fileId }: { formId: string; fileId: string }) =>
      apiModel.deleteFormFile(clubId, formId, fileId),
    onSuccess: () => {
      onNotice("Đã xoá tệp khỏi biểu mẫu.");
      onError("");
      refreshForms();
    },
    onError: (e) => onError(describeError(e)),
  });

  const openCreateForm = () => {
    setEditingFormId(null);
    setFormDraft({
      ...EMPTY_FORM_DRAFT,
      title: `Đơn đăng ký tuyển thành viên ${clubName ?? ""}`.trim(),
      description:
        "Vui lòng điền đầy đủ thông tin cá nhân, chọn Ban nguyện vọng và đính kèm Đơn đăng ký (.doc/.docx), CV (.pdf) hoặc hình ảnh minh chứng.",
      fields: [
        {
          key: "interview_slot",
          label: "Khung giờ bạn có thể tham gia phỏng vấn",
          type: "SELECT",
          required: false,
          placeholder: "Chọn khung giờ phù hợp",
          options: [
            "Sáng Thứ 7 (08:30 - 11:30)",
            "Chiều Thứ 7 (14:00 - 17:00)",
            "Sáng Chủ Nhật (08:30 - 11:30)",
            "Buổi tối trong tuần (Online)",
          ],
        },
      ],
    });
    setFormModalOpen(true);
  };

  const openEditForm = (form: ApplicationForm) => {
    setEditingFormId(form.id || null);
    setFormDraft({
      title: form.title,
      description: form.description || "",
      status: form.status,
      openAt: form.openAt,
      closeAt: form.closeAt,
      fields: form.fields ? form.fields.map((f) => ({ ...f, options: [...(f.options ?? [])] })) : [],
      allowAttachments: form.allowAttachments,
      requireAttachment: form.requireAttachment,
      maxAttachments: form.maxAttachments,
      isDefault: form.isDefault,
    });
    setFormModalOpen(true);
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Thiết kế biểu mẫu đơn đăng ký cho CLB, cấu hình câu hỏi tuỳ chỉnh và đính kèm file đơn mẫu (`.doc`, `.docx`, `.pdf`) hoặc ảnh poster tuyển thành viên.
        </p>
        {canManageForm && (
          <Button size="sm" onClick={openCreateForm}>
            <Plus size={14} /> Tạo biểu mẫu đơn
          </Button>
        )}
      </div>

      {forms.isPending ? (
        <LoadingRows />
      ) : forms.isError ? (
        <ErrorState message={describeError(forms.error)} onRetry={() => forms.refetch()} />
      ) : !forms.data || forms.data.length === 0 ? (
        <EmptyState
          icon={<FilePlus2 />}
          title="CLB chưa có biểu mẫu đơn đăng ký riêng"
          description="Tạo biểu mẫu đơn để cấu hình câu hỏi tuỳ chỉnh và tải lên file đơn mẫu (.docx, .pdf) hoặc ảnh poster tuyển thành viên."
          actionLabel={canManageForm ? "Tạo biểu mẫu đầu tiên" : undefined}
          onAction={canManageForm ? openCreateForm : undefined}
        />
      ) : (
        <div className="grid gap-4">
          {forms.data.map((form) => (
            <div key={form.id || form.title} className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black">{form.title}</h3>
                    <StatusBadge status={form.status} />
                    {form.isDefault && <Badge tone="primary" dot={false}>Mặc định</Badge>}
                    {form.requireAttachment && <Badge tone="danger" dot={false}>Bắt buộc đính kèm file</Badge>}
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    {form.description || "Không có mô tả hướng dẫn."}
                  </p>
                </div>
                {canManageForm && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditForm(form)}>
                      <Pencil size={13} /> Chỉnh sửa cấu hình & câu hỏi
                    </Button>
                    {form.id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleteFormMutation.isPending}
                        onClick={() => confirm(`Xoá biểu mẫu "${form.title}"?`) && deleteFormMutation.mutate(form.id!)}
                      >
                        <Trash2 size={13} /> Xoá
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Câu hỏi tuỳ chỉnh ({form.fields?.length ?? 0})
                    </p>
                    {canManageForm && (
                      <Button variant="ghost" size="sm" onClick={() => openEditForm(form)}>
                        <Plus size={12} /> Thêm / Sửa câu hỏi
                      </Button>
                    )}
                  </div>
                  {!form.fields || form.fields.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Chưa có câu hỏi tuỳ chỉnh (chỉ sử dụng bộ thông tin chuẩn: Ban nguyện vọng, SĐT, Ngành, Khóa, GPA, Kỹ năng, Lý do).
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {form.fields.map((f, idx) => (
                        <li key={f.key || idx} className="rounded-md border border-border/60 bg-card px-3 py-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold">
                              {idx + 1}. {f.label}
                              {f.required && <span className="ml-1 text-destructive">*</span>}
                            </span>
                            <Badge tone="neutral" dot={false}>{f.type}</Badge>
                          </div>
                          {f.options && f.options.length > 0 && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Lựa chọn: {f.options.join(" · ")}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      File đơn mẫu (.docx, .pdf) & Poster ({form.templateFiles?.length ?? 0})
                    </p>
                    {form.id && canManageForm && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/15">
                          <FileText size={12} /> + Đơn mẫu (.doc/.docx/.pdf)
                          <input
                            type="file"
                            multiple
                            accept=".doc,.docx,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files ?? []);
                              if (files.length > 0) {
                                uploadFormFileMutation.mutate({
                                  formId: form.id!,
                                  files,
                                  category: "FORM_TEMPLATE_DOC",
                                });
                              }
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-bold hover:bg-muted">
                          <ImageIcon size={12} /> + Ảnh Poster / Banner
                          <input
                            type="file"
                            multiple
                            accept=".png,.jpg,.jpeg,.gif,.webp"
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files ?? []);
                              if (files.length > 0) {
                                uploadFormFileMutation.mutate({
                                  formId: form.id!,
                                  files,
                                  category: "FORM_POSTER_IMAGE",
                                });
                              }
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  <ApplicationFilesList
                    files={form.templateFiles}
                    deleting={deleteFormFileMutation.isPending}
                    onDelete={
                      form.id && canManageForm
                        ? (f) => deleteFormFileMutation.mutate({ formId: form.id!, fileId: f.id })
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormBuilderModal
        clubId={clubId}
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingFormId(null);
        }}
        editingFormId={editingFormId}
        formDraft={formDraft}
        setFormDraft={setFormDraft}
        onSaved={(saved, isEdit) => {
          onNotice(isEdit ? `Đã cập nhật biểu mẫu "${saved.title}".` : `Đã tạo biểu mẫu "${saved.title}".`);
          onError("");
          refreshForms();
        }}
        onError={onError}
      />
    </div>
  );
}
