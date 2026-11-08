"use client";

import { ReactNode } from "react";
import { Paperclip, Trash2, Upload } from "lucide-react";
import { formatBytes } from "@/components/shared/ApplicationFileView";
import { DetailList } from "@/components/shared/Overlays";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { ClubApplicationDraft } from "@/forms/application/application-form";
import { formatDateTime } from "@/lib/utils";
import { ApplicationDetail } from "@/types";

export interface PendingApplicationAttachment {
  file: File;
  category: string;
}

export interface ApplicationDraftFormFieldsProps {
  values: ClubApplicationDraft;
  onChange: <K extends keyof ClubApplicationDraft>(key: K, value: ClubApplicationDraft[K]) => void;
  departments?: { id: string; name: string }[];
  applicantIdentity?: { fullName?: string; email?: string; studentCode?: string };
  requireAcademic?: boolean;
  boxedSections?: boolean;
}

export function ApplicationDraftFormFields({
  values,
  onChange,
  departments = [],
  applicantIdentity,
  requireAcademic = false,
  boxedSections = false,
}: ApplicationDraftFormFieldsProps) {
  const sectionClass = boxedSections ? "grid gap-3 rounded-lg border border-border/70 p-3.5" : "grid gap-3";

  return (
    <div className="grid gap-3.5">
      <div className={sectionClass}>
        {boxedSections && (
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            1. Thông tin cá nhân & Học vấn
          </p>
        )}
        {applicantIdentity && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Họ và tên">
              <Input value={applicantIdentity.fullName || applicantIdentity.email || ""} disabled />
            </FormField>
            <FormField label="Mã sinh viên">
              <Input value={applicantIdentity.studentCode || "Chưa cập nhật"} disabled />
            </FormField>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Số điện thoại liên hệ" required={requireAcademic}>
            <Input
              value={values.applicantPhone}
              onChange={(e) => onChange("applicantPhone", e.target.value)}
              placeholder="VD: 0912345678"
            />
          </FormField>
          <FormField label="Khoa / Ngành học" required={requireAcademic}>
            <Input
              value={values.facultyMajor}
              onChange={(e) => onChange("facultyMajor", e.target.value)}
              placeholder="VD: CNTT (BCSE), Nhật Bản học (BJS)..."
            />
          </FormField>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Khóa / Năm học" required={requireAcademic}>
            <Input
              value={values.academicYear}
              onChange={(e) => onChange("academicYear", e.target.value)}
              placeholder="VD: K8 - Năm 3"
            />
          </FormField>
          <FormField label="Điểm GPA (tuỳ chọn)">
            <Input
              value={values.gpa}
              onChange={(e) => onChange("gpa", e.target.value)}
              placeholder="VD: 3.5 / 4.0"
            />
          </FormField>
          <FormField label="Link FB / Portfolio">
            <Input
              value={values.socialPortfolioUrl}
              onChange={(e) => onChange("socialPortfolioUrl", e.target.value)}
              placeholder="https://..."
            />
          </FormField>
        </div>
      </div>

      {departments.length > 0 && (
        <div className={sectionClass}>
          {boxedSections && (
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              2. Nguyện vọng Phân ban
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Ban nguyện vọng 1">
              <Select
                value={values.preferredDepartmentId}
                onChange={(e) => onChange("preferredDepartmentId", e.target.value)}
              >
                <option value="">— Chọn Ban nguyện vọng 1 —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Ban nguyện vọng 2 (tuỳ chọn)">
              <Select
                value={values.secondaryDepartmentId}
                onChange={(e) => onChange("secondaryDepartmentId", e.target.value)}
              >
                <option value="">— Chọn Ban nguyện vọng 2 —</option>
                {departments
                  .filter((d) => d.id !== values.preferredDepartmentId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </Select>
            </FormField>
          </div>
        </div>
      )}

      <div className={sectionClass}>
        {boxedSections && (
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            3. Giới thiệu, Kỹ năng & Lý do ứng tuyển
          </p>
        )}
        <FormField label="Giới thiệu bản thân & Tính cách">
          <Textarea
            rows={2}
            maxLength={2000}
            value={values.selfIntroduction}
            onChange={(e) => onChange("selfIntroduction", e.target.value)}
            placeholder="Giới thiệu ngắn gọn về bản thân, sở thích, điểm mạnh/điểm yếu..."
          />
        </FormField>
        <FormField label="Kỹ năng chuyên môn & Kinh nghiệm hoạt động">
          <Textarea
            rows={2}
            maxLength={2000}
            value={values.skillsExperience}
            onChange={(e) => onChange("skillsExperience", e.target.value)}
            placeholder="VD: Thiết kế Canva/Photoshop, tổ chức sự kiện, lập trình, ngoại ngữ..."
          />
        </FormField>
        <FormField label="Thời gian có thể tham gia hoạt động trong tuần">
          <Input
            maxLength={500}
            value={values.availability}
            onChange={(e) => onChange("availability", e.target.value)}
            placeholder="VD: Các buổi tối trong tuần và cuối tuần (8–10h/tuần)"
          />
        </FormField>
        <FormField label="Lý do & Động lực muốn gia nhập CLB" required>
          <Textarea
            rows={3}
            maxLength={2000}
            value={values.message}
            onChange={(e) => onChange("message", e.target.value)}
            placeholder="Chia sẻ lý do bạn muốn gia nhập CLB và mong muốn đóng góp…"
            aria-label="Lời nhắn"
          />
        </FormField>
      </div>
    </div>
  );
}

export interface ApplicationAttachmentPickerProps {
  attachments: PendingApplicationAttachment[];
  setAttachments: React.Dispatch<React.SetStateAction<PendingApplicationAttachment[]>>;
  maxAttachments?: number;
  requireAttachment?: boolean;
  onSelectFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ApplicationAttachmentPicker({
  attachments,
  setAttachments,
  maxAttachments = 5,
  requireAttachment = false,
  onSelectFiles,
}: ApplicationAttachmentPickerProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-dashed border-primary/35 bg-primary/[0.02] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <Paperclip size={13} /> Đính kèm Đơn Word (.doc/.docx), CV (.pdf) & Hình ảnh
            {requireAttachment && (
              <Badge tone="danger" dot={false}>
                Bắt buộc
              </Badge>
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Hỗ trợ: <b>.doc, .docx, .pdf, .png, .jpg, .webp</b> (tối đa {maxAttachments} tệp, mỗi tệp ≤ 20MB).
          </p>
        </div>
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:opacity-95">
          <Upload size={13} /> Chọn tệp ({attachments.length}/{maxAttachments})
          <input
            type="file"
            multiple
            accept=".doc,.docx,.pdf,.png,.jpg,.jpeg,.gif,.webp"
            className="hidden"
            onChange={onSelectFiles}
          />
        </label>
      </div>

      {attachments.length > 0 && (
        <div className="grid gap-2">
          {attachments.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{item.file.name}</p>
                <p className="text-[11px] text-muted-foreground">{formatBytes(item.file.size)}</p>
              </div>
              <Select
                aria-label="Loại tệp đính kèm"
                value={item.category}
                onChange={(e) =>
                  setAttachments((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, category: e.target.value } : x)),
                  )
                }
                className="h-7 w-full text-[11px] sm:w-44"
              >
                <option value="APPLICANT_DOC">Đơn đăng ký (.doc/.docx)</option>
                <option value="APPLICANT_CV_PDF">CV / Hồ sơ (.pdf)</option>
                <option value="APPLICANT_IMAGE">Hình ảnh minh chứng</option>
                <option value="APPLICANT_ATTACHMENT">Tệp đính kèm khác</option>
              </Select>
              <button
                type="button"
                aria-label={`Gỡ tệp ${item.file.name}`}
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ApplicationDetailInfoList({
  application,
  leadingRows = [],
  trailingRows = [],
}: {
  application: ApplicationDetail;
  leadingRows?: [string, ReactNode][];
  trailingRows?: [string, ReactNode][];
}) {
  return (
    <DetailList
      rows={[
        ...leadingRows,
        ["Trạng thái", <StatusBadge key="s" status={application.status} />],
        ["Ngày gửi", formatDateTime(application.createdAt)],
        ...(application.cancelledAt
          ? ([["Ngày rút đơn", formatDateTime(application.cancelledAt)]] as [string, ReactNode][])
          : []),
        ["Ban nguyện vọng 1", application.preferredDepartmentName || "—"],
        ["Ban nguyện vọng 2", application.secondaryDepartmentName || "—"],
        ["Số điện thoại", application.applicantPhone || "—"],
        ["Khoa / Ngành học", application.facultyMajor || "—"],
        ["Khóa / Năm học", application.academicYear || "—"],
        ["Điểm GPA", application.gpa || "—"],
        [
          "Link FB / Portfolio",
          application.socialPortfolioUrl ? (
            <a
              key="url"
              href={application.socialPortfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-primary underline"
            >
              {application.socialPortfolioUrl}
            </a>
          ) : (
            "—"
          ),
        ],
        [
          "Giới thiệu bản thân",
          <p key="intro" className="whitespace-pre-line">
            {application.selfIntroduction || "—"}
          </p>,
        ],
        [
          "Kỹ năng & Kinh nghiệm",
          <p key="skill" className="whitespace-pre-line">
            {application.skillsExperience || "—"}
          </p>,
        ],
        ["Thời gian tham gia", application.availability || "—"],
        [
          "Lý do ứng tuyển",
          <p key="m" className="whitespace-pre-line font-medium">
            {application.message}
          </p>,
        ],
        ["Ngày xét duyệt", formatDateTime(application.reviewedAt)],
        ["Phản hồi từ CLB", application.reviewNote || "—"],
        ...trailingRows,
      ]}
    />
  );
}
