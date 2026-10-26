"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, FileText, Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import {
  apiModel,
  ApplicationFieldType,
  ApplicationForm,
  UpsertApplicationFormInput,
} from "@/lib/api";
import { ApplicationFilesList } from "@/components/shared/ApplicationFileView";
import { ModalShell } from "@/components/shared/Overlays";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";

const EMPTY_FORM_DRAFT: UpsertApplicationFormInput = {
  title: "",
  description: "",
  status: "OPEN",
  fields: [],
  allowAttachments: true,
  requireAttachment: false,
  maxAttachments: 5,
  isDefault: true,
};

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
  const queryClient = useQueryClient();
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

  const saveFormMutation = useMutation({
    mutationFn: () =>
      editingFormId
        ? apiModel.updateClubApplicationForm(clubId, editingFormId, formDraft)
        : apiModel.createClubApplicationForm(clubId, formDraft),
    onSuccess: (saved) => {
      onNotice(editingFormId ? `Đã cập nhật biểu mẫu "${saved.title}".` : `Đã tạo biểu mẫu "${saved.title}".`);
      onError("");
      setFormModalOpen(false);
      setEditingFormId(null);
      refreshForms();
    },
    onError: (e) => onError(describeError(e)),
  });

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
    saveFormMutation.reset();
    setFormModalOpen(true);
  };

  const openEditForm = (form: ApplicationForm) => {
    setEditingFormId(form.id || null);
    setFormDraft({
      title: form.title,
      description: form.description || "",
      status: form.status,
      fields: form.fields ? form.fields.map((f) => ({ ...f, options: [...(f.options ?? [])] })) : [],
      allowAttachments: form.allowAttachments,
      requireAttachment: form.requireAttachment,
      maxAttachments: form.maxAttachments,
      isDefault: form.isDefault,
    });
    saveFormMutation.reset();
    setFormModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Thiết kế biểu mẫu đơn đăng ký cho CLB, cấu hình câu hỏi tuỳ chỉnh và đính kèm file đơn mẫu (`.doc`, `.docx`, `.pdf`) hoặc ảnh poster tuyển thành viên.
        </p>
        <Button size="sm" onClick={openCreateForm}>
          <Plus size={14} /> Tạo biểu mẫu đơn
        </Button>
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
          actionLabel="Tạo biểu mẫu đầu tiên"
          onAction={openCreateForm}
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
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Câu hỏi tuỳ chỉnh ({form.fields?.length ?? 0})
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => openEditForm(form)}>
                      <Plus size={12} /> Thêm / Sửa câu hỏi
                    </Button>
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
                    {form.id && (
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
                      form.id
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

      <ModalShell
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingFormId ? "Chỉnh sửa biểu mẫu đơn đăng ký" : "Tạo biểu mẫu đơn đăng ký CLB"}
        icon={<FilePlus2 />}
        size="lg"
        onSubmit={() => saveFormMutation.mutate()}
        submitLabel={editingFormId ? "Lưu biểu mẫu" : "Tạo biểu mẫu"}
        submitLoading={saveFormMutation.isPending}
        submitDisabled={!formDraft.title.trim()}
      >
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <FormField label="Tiêu đề biểu mẫu / Đợt tuyển thành viên" required>
                <Input
                  value={formDraft.title}
                  onChange={(e) => setFormDraft({ ...formDraft, title: e.target.value })}
                  placeholder="VD: Đơn đăng ký tuyển thành viên Gen 5"
                />
              </FormField>
            </div>
            <FormField label="Trạng thái mở đơn">
              <Select
                value={formDraft.status}
                onChange={(e) =>
                  setFormDraft({ ...formDraft, status: e.target.value as UpsertApplicationFormInput["status"] })
                }
              >
                <option value="OPEN">OPEN (Đang mở nhận đơn)</option>
                <option value="CLOSED">CLOSED (Đã đóng đơn)</option>
                <option value="DRAFT">DRAFT (Bản nháp)</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Hướng dẫn & Mô tả biểu mẫu">
            <Textarea
              rows={3}
              value={formDraft.description || ""}
              onChange={(e) => setFormDraft({ ...formDraft, description: e.target.value })}
              placeholder="Hướng dẫn ứng viên tải file đơn mẫu (.docx/.pdf), điền thông tin và đính kèm minh chứng..."
            />
          </FormField>

          <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={!!formDraft.isDefault}
                onChange={(e) => setFormDraft({ ...formDraft, isDefault: e.target.checked })}
              />
              <span>Đặt làm biểu mẫu mặc định của CLB</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={!!formDraft.allowAttachments}
                onChange={(e) => setFormDraft({ ...formDraft, allowAttachments: e.target.checked })}
              />
              <span>Cho phép đính kèm file (.docx/.pdf/ảnh)</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={!!formDraft.requireAttachment}
                onChange={(e) => setFormDraft({ ...formDraft, requireAttachment: e.target.checked })}
              />
              <span>Bắt buộc ứng viên đính kèm file</span>
            </label>
          </div>

          <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/[0.02] p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Thiết kế câu hỏi tuỳ chỉnh ({formDraft.fields.length})
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setFormDraft({
                    ...formDraft,
                    fields: [
                      ...formDraft.fields,
                      {
                        key: `question_${formDraft.fields.length + 1}`,
                        label: "",
                        type: "TEXT",
                        required: false,
                        placeholder: "",
                        options: [],
                      },
                    ],
                  })
                }
              >
                <Plus size={13} /> Thêm câu hỏi
              </Button>
            </div>

            {formDraft.fields.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nhấn &ldquo;Thêm câu hỏi&rdquo; để tạo thêm các trường riêng cho CLB (VD: Ca phỏng vấn, Link sản phẩm cá nhân, Câu hỏi tình huống...).
              </p>
            )}

            {formDraft.fields.map((field, idx) => (
              <div key={idx} className="space-y-2.5 rounded-lg border border-border bg-card p-3">
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <FormField label={`Câu hỏi #${idx + 1}`} required>
                      <Input
                        value={field.label}
                        placeholder="VD: Bạn có thể tham gia phỏng vấn vào khung giờ nào?"
                        onChange={(e) => {
                          const next = [...formDraft.fields];
                          next[idx] = {
                            ...field,
                            label: e.target.value,
                            key: field.key || `q_${idx + 1}`,
                          };
                          setFormDraft({ ...formDraft, fields: next });
                        }}
                      />
                    </FormField>
                  </div>
                  <FormField label="Loại ô nhập">
                    <Select
                      value={field.type}
                      onChange={(e) => {
                        const next = [...formDraft.fields];
                        next[idx] = { ...field, type: e.target.value as ApplicationFieldType };
                        setFormDraft({ ...formDraft, fields: next });
                      }}
                    >
                      <option value="TEXT">Văn bản ngắn (TEXT)</option>
                      <option value="TEXTAREA">Đoạn văn dài (TEXTAREA)</option>
                      <option value="SELECT">Danh sách chọn (SELECT)</option>
                      <option value="RADIO">Chọn 1 phương án (RADIO)</option>
                      <option value="CHECKBOX">Hộp kiểm xác nhận (CHECKBOX)</option>
                      <option value="DATE">Ngày tháng (DATE)</option>
                      <option value="URL">Đường dẫn (URL)</option>
                    </Select>
                  </FormField>
                </div>

                {(field.type === "SELECT" || field.type === "RADIO") && (
                  <FormField label="Các lựa chọn (phân tách bằng dấu phẩy)">
                    <Input
                      value={(field.options ?? []).join(", ")}
                      placeholder="VD: Sáng Thứ 7, Chiều Thứ 7, Sáng Chủ Nhật"
                      onChange={(e) => {
                        const next = [...formDraft.fields];
                        next[idx] = {
                          ...field,
                          options: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        };
                        setFormDraft({ ...formDraft, fields: next });
                      }}
                    />
                  </FormField>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={field.required}
                      onChange={(e) => {
                        const next = [...formDraft.fields];
                        next[idx] = { ...field, required: e.target.checked };
                        setFormDraft({ ...formDraft, fields: next });
                      }}
                    />
                    <span>Bắt buộc trả lời</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormDraft({
                        ...formDraft,
                        fields: formDraft.fields.filter((_, i) => i !== idx),
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
                  >
                    <Trash2 size={12} /> Xoá câu hỏi này
                  </button>
                </div>
              </div>
            ))}
          </div>

          {saveFormMutation.error && <p className="text-xs text-destructive">{describeError(saveFormMutation.error)}</p>}
        </div>
      </ModalShell>
    </div>
  );
}
