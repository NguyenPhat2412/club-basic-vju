"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { apiModel } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import { describeError } from "@/components/shared/ListPage";
import { Button } from "@/components/ui/button";

export function EventCertificateTemplateBox({
  eventId,
  initialTemplateUrl,
  onChanged,
  onNotice,
  onError,
}: {
  eventId: string;
  initialTemplateUrl?: string | null;
  onChanged: () => void;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | null | undefined>(undefined);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => apiModel.uploadEventCertificateTemplate(eventId, file),
    onSuccess: (res) => {
      onError("");
      setTemplatePreviewUrl(res.certificateTemplateUrl ?? null);
      onNotice("Đã tải lên phôi ảnh chứng nhận riêng cho sự kiện.");
      onChanged();
    },
    onError: (err) => {
      onError(describeError(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiModel.deleteEventCertificateTemplate(eventId),
    onSuccess: () => {
      onError("");
      setTemplatePreviewUrl(null);
      onNotice("Đã gỡ phôi ảnh riêng, quay về mẫu chứng nhận chuẩn VJU.");
      onChanged();
    },
    onError: (err) => {
      onError(describeError(err));
    },
  });

  const activeUrl = templatePreviewUrl !== undefined ? templatePreviewUrl : initialTemplateUrl;
  const resolved = resolveMediaUrl(activeUrl);

  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ImageIcon size={14} className="shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">Phôi ảnh chứng nhận riêng (CLB / Đoàn trường)</p>
            <p className="text-[11px] text-muted-foreground">
              Tải ảnh PNG/JPG thiết kế riêng (tuỳ chọn); hệ thống tự ghép tên, MSSV, mã &amp; QR xác thực.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) uploadMutation.mutate(file);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[11px]"
            disabled={uploadMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={12} />
            {uploadMutation.isPending ? "Đang tải…" : resolved ? "Đổi phôi ảnh" : "Tải phôi ảnh"}
          </Button>
          {resolved && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 size={12} />
              Gỡ phôi
            </Button>
          )}
        </div>
      </div>
      {resolved && (
        <div className="mt-2.5 flex items-center gap-2.5 rounded-md border border-border bg-card p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolved}
            alt="Phôi chứng nhận sự kiện"
            className="h-12 w-20 shrink-0 rounded border border-border object-cover"
          />
          <span className="text-[11px] text-muted-foreground">
            Đang áp dụng phôi ảnh riêng cho bản in PDF &amp; trang xác thực công khai của sự kiện này.
          </span>
        </div>
      )}
    </div>
  );
}
