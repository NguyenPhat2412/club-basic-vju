"use client";

import { useEffect, useMemo, useRef } from "react";
import { Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { resolveMediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";

export function EventCoverUploadField({
  existingUrl,
  pendingFile,
  cleared,
  busy,
  onPickFile,
  onClear,
}: {
  existingUrl?: string | null;
  pendingFile: File | null;
  cleared: boolean;
  busy?: boolean;
  onPickFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const objectPreviewUrl = useMemo(() => {
    if (!pendingFile || typeof URL === "undefined") return "";
    return URL.createObjectURL(pendingFile);
  }, [pendingFile]);

  useEffect(() => {
    if (!objectPreviewUrl) return;
    return () => URL.revokeObjectURL(objectPreviewUrl);
  }, [objectPreviewUrl]);

  const previewSrc = objectPreviewUrl || (cleared ? "" : resolveMediaUrl(existingUrl) || "");

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ImageIcon size={14} className="shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">Ảnh bìa / Poster sự kiện (tuỳ chọn)</p>
            <p className="text-[11px] text-muted-foreground">
              PNG, JPG hoặc WEBP (tối đa 8MB) — hiển thị nổi bật trên Trang chủ &amp; Cổng sự kiện.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onPickFile(file);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[11px]"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={12} />
            {previewSrc ? "Đổi ảnh poster" : "Tải ảnh poster"}
          </Button>
          {previewSrc && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              disabled={busy}
              onClick={onClear}
            >
              <Trash2 size={12} />
              Xoá
            </Button>
          )}
        </div>
      </div>

      {previewSrc && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="Ảnh bìa sự kiện"
            className="h-36 w-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
