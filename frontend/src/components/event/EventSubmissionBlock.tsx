"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, FileText, Lock, Upload } from "lucide-react";
import { apiModel } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { Section } from "@/components/shared/Overlays";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { isEventSubmissionLocked } from "@/forms/event/event-form";

const MAX_SUBMISSION_BYTES = 10 * 1024 * 1024;
const ACCEPTED_SUBMISSION_EXT = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip";

export function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "ho-so-su-kien";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function EventSubmissionBlock({
  eventId,
  registrationId,
  eventStatus,
  registrationDeadline,
  requiresSubmission,
  submissionFileName,
  submissionUploadedAt,
  onUploaded,
  onNotice,
  onError,
}: {
  eventId: string;
  registrationId: string;
  eventStatus: string;
  registrationDeadline?: string;
  requiresSubmission?: boolean;
  submissionFileName?: string;
  submissionUploadedAt?: string;
  onUploaded: () => void;
  onNotice?: (msg: string) => void;
  onError?: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localError, setLocalError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const locked = isEventSubmissionLocked(eventStatus, registrationDeadline);

  const upload = useMutation({
    mutationFn: (file: File) => apiModel.uploadEventSubmission(eventId, file),
    onSuccess: (updated) => {
      setLocalError("");
      onError?.("");
      onNotice?.(`Đã nộp tệp hồ sơ "${updated.submissionFileName ?? ""}" thành công.`);
      onUploaded();
    },
    onError: (err) => {
      const msg = describeError(err);
      setLocalError(msg);
      onError?.(msg);
    },
  });

  if (!requiresSubmission && !submissionFileName) return null;

  const handleFileSelected = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_SUBMISSION_BYTES) {
      const msg = "Kích thước tệp hồ sơ vượt quá giới hạn tối đa 10MB.";
      setLocalError(msg);
      onError?.(msg);
      return;
    }
    setLocalError("");
    upload.mutate(file);
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setLocalError("");
      const blob = await apiModel.downloadEventSubmission(eventId, registrationId);
      triggerBlobDownload(blob, submissionFileName || "ho-so-su-kien");
    } catch (err) {
      const msg = describeError(err);
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Section title="Hồ sơ xét tuyển / Minh chứng sự kiện" icon={<FileText />}>
      <div className="space-y-2.5 text-xs">
        {submissionFileName ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground" title={submissionFileName}>
                {submissionFileName}
              </p>
              {submissionUploadedAt && (
                <p className="text-[11px] text-muted-foreground">
                  Đã nộp lúc {formatDateTime(submissionUploadedAt)}
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" disabled={downloading} onClick={handleDownload}>
              <Download size={13} /> {downloading ? "Đang tải…" : "Tải tệp"}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Sự kiện này yêu cầu nộp tệp hồ sơ (PDF, DOC/DOCX, PNG/JPG, ZIP — tối đa 10MB) trước hạn đăng ký.
          </p>
        )}

        {locked ? (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-muted-foreground">
            <Lock size={14} className="mt-0.5 shrink-0" />
            <span>
              Đã tự động khoá nộp và cập nhật hồ sơ do sự kiện đã quá hạn đăng ký
              {registrationDeadline ? ` (${formatDateTime(registrationDeadline)})` : ""} hoặc đã đóng đăng ký.
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_SUBMISSION_EXT}
              className="hidden"
              onChange={(e) => {
                handleFileSelected(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              variant={submissionFileName ? "outline" : "default"}
              disabled={upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={13} />{" "}
              {upload.isPending
                ? "Đang tải lên…"
                : submissionFileName
                  ? "Nộp lại tệp hồ sơ"
                  : "Chọn & Nộp tệp hồ sơ"}
            </Button>
            {registrationDeadline && (
              <span className="text-[11px] text-muted-foreground">
                Tự khoá sau {formatDateTime(registrationDeadline)}
              </span>
            )}
          </div>
        )}

        {localError && <p className="text-destructive">{localError}</p>}
      </div>
    </Section>
  );
}

export function EventSubmissionDownloadButton({
  eventId,
  registrationId,
  fileName,
  onError,
}: {
  eventId: string;
  registrationId: string;
  fileName?: string;
  onError?: (msg: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);

  if (!fileName) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const blob = await apiModel.downloadEventSubmission(eventId, registrationId);
      triggerBlobDownload(blob, fileName);
    } catch (err) {
      onError?.(describeError(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={downloading}
      onClick={handleDownload}
      title={`Tải hồ sơ: ${fileName}`}
    >
      <Download size={12} />
      <span className="max-w-[120px] truncate">{downloading ? "Đang tải…" : fileName}</span>
    </Button>
  );
}

export function RequiresSubmissionBadge() {
  return <Badge tone="neutral">Nộp hồ sơ</Badge>;
}
