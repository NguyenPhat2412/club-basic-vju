"use client";

import { FileText, Image as ImageIcon, Pencil } from "lucide-react";
import type { ApplicationForm } from "@/lib/api";
import { ApplicationFilesList } from "@/components/shared/ApplicationFileView";
import { EntityDrawer } from "@/components/shared/Overlays";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OptionalMark, RequiredMark } from "@/components/ui/input";

export function FormInspectDrawer({
  form,
  canManageForm,
  deletingFile,
  onClose,
  onEdit,
  onUploadFiles,
  onDeleteFile,
}: {
  form: ApplicationForm | null;
  canManageForm: boolean;
  deletingFile: boolean;
  onClose: () => void;
  onEdit: (form: ApplicationForm) => void;
  onUploadFiles: (formId: string, files: File[], category: string) => void;
  onDeleteFile: (formId: string, fileId: string) => void;
}) {
  return (
    <EntityDrawer
      open={Boolean(form)}
      onClose={onClose}
      title={form?.title ?? "Chi tiết biểu mẫu"}
      subtitle="Danh sách câu hỏi tuỳ chỉnh & tệp đơn mẫu / poster đính kèm"
      icon={<FileText />}
      footer={
        form && canManageForm ? (
          <Button size="sm" onClick={() => onEdit(form)}>
            <Pencil size={13} /> Chỉnh sửa cấu hình & câu hỏi
          </Button>
        ) : undefined
      }
    >
      {form && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Câu hỏi tuỳ chỉnh ({form.fields?.length ?? 0})
            </p>
            {!form.fields?.length ? (
              <p className="text-xs text-muted-foreground">
                Sử dụng bộ thông tin chuẩn (Ban nguyện vọng, SĐT, Ngành, Khóa, GPA, Kỹ năng, Lý do).
              </p>
            ) : (
              <ul className="space-y-2">
                {form.fields.map((f, idx) => (
                  <li key={f.key || idx} className="rounded-md border border-border/60 bg-card px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">
                        {idx + 1}. {f.label}
                        {f.required ? <RequiredMark /> : <OptionalMark />}
                      </span>
                      <Badge tone="neutral" dot={false}>{f.type}</Badge>
                    </div>
                    {f.options && f.options.length > 0 && (
                      <p className="mt-1 text-[11px] text-muted-foreground">Lựa chọn: {f.options.join(" · ")}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tệp đơn mẫu & Poster ({form.templateFiles?.length ?? 0})
              </p>
              {form.id && canManageForm && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/15">
                    <FileText size={12} /> + Đơn mẫu
                    <input
                      type="file"
                      multiple
                      accept=".doc,.docx,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length) onUploadFiles(form.id!, files, "FORM_TEMPLATE_DOC");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-bold hover:bg-muted">
                    <ImageIcon size={12} /> + Poster
                    <input
                      type="file"
                      multiple
                      accept=".png,.jpg,.jpeg,.gif,.webp"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length) onUploadFiles(form.id!, files, "FORM_POSTER_IMAGE");
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
            <ApplicationFilesList
              files={form.templateFiles}
              deleting={deletingFile}
              onDelete={
                form.id && canManageForm ? (f) => onDeleteFile(form.id!, f.id) : undefined
              }
            />
          </div>
        </div>
      )}
    </EntityDrawer>
  );
}
