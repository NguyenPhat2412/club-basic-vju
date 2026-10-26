"use client";
import { Download, ExternalLink, FileSpreadsheet, FileText, Image as ImageIcon, Paperclip, Trash2 } from "lucide-react";
import { apiModel, ApplicationFile, FormFieldDefinition } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";

export function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function categoryLabel(category: string) {
  switch (category) {
    case "FORM_TEMPLATE_DOC": return "File mẫu đơn";
    case "FORM_POSTER_IMAGE": return "Poster / Hướng dẫn";
    case "APPLICANT_DOC": return "Đơn Word (.doc/.docx)";
    case "APPLICANT_CV_PDF": return "CV / Hồ sơ (.pdf)";
    case "APPLICANT_IMAGE": return "Hình ảnh minh chứng";
    default: return "Tệp đính kèm";
  }
}

export function isImageType(fileType: string) {
  return ["PNG", "JPG", "GIF", "WEBP"].includes((fileType || "").toUpperCase());
}

export function isPdfType(fileType: string) {
  return (fileType || "").toUpperCase() === "PDF";
}

export function ApplicationFilesList({
  files,
  onDelete,
  deleting,
  showImagePreview = true,
}: {
  files?: ApplicationFile[];
  onDelete?: (file: ApplicationFile) => void;
  deleting?: boolean;
  showImagePreview?: boolean;
}) {
  if (!files || files.length === 0) {
    return <p className="text-xs text-muted-foreground">Chưa có tệp đính kèm nào (Docs / PDF / Hình ảnh).</p>;
  }

  return (
    <div className="grid gap-2.5">
      {files.map((file) => {
        const image = isImageType(file.fileType);
        const pdf = isPdfType(file.fileType);
        const inlineUrl = apiModel.applicationFileUrl(file.id, true);
        const downloadUrl = apiModel.applicationFileUrl(file.id, false);
        return (
          <div key={file.id} className="rounded-lg border border-border/70 bg-background/80 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {image ? <ImageIcon size={15} /> : pdf ? <FileText size={15} /> : <FileSpreadsheet size={15} />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{file.originalName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Badge tone="neutral" dot={false}>{file.fileType}</Badge>
                    <span>{ categoryLabel(file.fileCategory) }</span>
                    <span>·</span>
                    <span className="font-mono">{formatBytes(file.sizeBytes)}</span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {(image || pdf) && (
                  <a
                    href={inlineUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Mở xem trực tiếp"
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-semibold hover:bg-muted"
                  >
                    <ExternalLink size={12} /> Xem
                  </a>
                )}
                <a
                  href={downloadUrl}
                  download={file.originalName}
                  title="Tải xuống"
                  className="inline-flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2 text-[11px] font-semibold text-primary hover:bg-primary/20"
                >
                  <Download size={12} /> Tải
                </a>
                {onDelete && (
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => onDelete(file)}
                    title="Xoá tệp"
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
            {showImagePreview && image && (
              <div className="mt-2.5 overflow-hidden rounded-md border border-border/50 bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={inlineUrl}
                  alt={file.originalName}
                  className="max-h-56 w-full object-contain"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CustomFieldsInputs({
  fields,
  values,
  onChange,
}: {
  fields: FormFieldDefinition[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  if (!fields || fields.length === 0) return null;
  return (
    <div className="grid gap-3 rounded-lg border border-primary/20 bg-primary/[0.03] p-3.5">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
        <Paperclip size={13} /> Câu hỏi riêng của CLB
      </p>
      {fields.map((field) => {
        const val = String(values[field.key] ?? "");
        const options = field.options ?? [];
        return (
          <FormField key={field.key} label={field.label || field.key} required={field.required}>
            {field.type === "TEXTAREA" ? (
              <Textarea
                rows={3}
                value={val}
                placeholder={field.placeholder || "Nhập câu trả lời..."}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            ) : field.type === "SELECT" || field.type === "RADIO" ? (
              <Select value={val} onChange={(e) => onChange(field.key, e.target.value)}>
                <option value="">{field.placeholder || "— Chọn câu trả lời —"}</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </Select>
            ) : field.type === "CHECKBOX" ? (
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={val === "true" || values[field.key] === true}
                  onChange={(e) => onChange(field.key, e.target.checked ? "Có" : "")}
                />
                <span>{field.placeholder || "Đồng ý / Xác nhận"}</span>
              </label>
            ) : (
              <Input
                type={field.type === "DATE" ? "date" : field.type === "URL" ? "url" : "text"}
                value={val}
                placeholder={field.placeholder || "Nhập thông tin..."}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            )}
          </FormField>
        );
      })}
    </div>
  );
}
