"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, Eye, FileText } from "lucide-react";
import { apiModel } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { ModalShell } from "@/components/shared/Overlays";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { formatSize } from "@/lib/utils";

const TEXT_PREVIEW_LIMIT = 200_000;

export type PreviewTarget = {
  id: string;
  name: string;
  contentType?: string;
  version?: number;
};

type LoadedPreview = {
  key: string;
  blobUrl: string | null;
  textPreview: string | null;
  textTruncated: number | null;
  mime: string;
  error: string;
};

export function DocumentPreviewModal({
  target,
  onClose,
  onDownload,
}: {
  target: PreviewTarget | null;
  onClose: () => void;
  onDownload?: (target: PreviewTarget) => void;
}) {
  const targetKey = target ? `${target.id}:${target.version ?? ""}` : "";
  const [loaded, setLoaded] = useState<LoadedPreview | null>(null);

  useEffect(() => {
    if (!target) return;
    const key = `${target.id}:${target.version ?? ""}`;
    let revoked = false;
    let currentUrl: string | null = null;

    apiModel
      .previewDocument(target.id, target.version)
      .then(async (blob) => {
        if (revoked) return;
        const resolvedType = (blob.type || target.contentType || "").split(";")[0].trim().toLowerCase();
        if (resolvedType.startsWith("text/")) {
          const isLarge = blob.size > TEXT_PREVIEW_LIMIT;
          const text = await (isLarge ? blob.slice(0, TEXT_PREVIEW_LIMIT) : blob).text();
          if (!revoked) {
            setLoaded({
              key,
              blobUrl: null,
              textPreview: text,
              textTruncated: isLarge ? blob.size : null,
              mime: resolvedType,
              error: "",
            });
          }
        } else {
          currentUrl = URL.createObjectURL(blob);
          setLoaded({
            key,
            blobUrl: currentUrl,
            textPreview: null,
            textTruncated: null,
            mime: resolvedType,
            error: "",
          });
        }
      })
      .catch((err) => {
        if (!revoked) {
          setLoaded({
            key,
            blobUrl: null,
            textPreview: null,
            textTruncated: null,
            mime: "",
            error: describeError(err),
          });
        }
      });

    return () => {
      revoked = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [target]);

  const current = loaded?.key === targetKey ? loaded : null;
  const loading = Boolean(target && !current);
  const error = current?.error ?? "";
  const textPreview = current?.textPreview ?? null;
  const textTruncated = current?.textTruncated ?? null;
  const blobUrl = current?.blobUrl ?? null;
  const mime = current?.mime ?? "";

  return (
    <ModalShell
      open={!!target}
      onClose={onClose}
      title={target ? `Xem trước · ${target.name}` : "Xem trước tài liệu"}
      icon={<Eye />}
      size="lg"
    >
      <p className="text-xs text-muted-foreground">
        Phát trực tuyến an toàn qua cổng bảo mật VJU ClubHub (không lộ liên kết lưu trữ gốc).
      </p>
      {loading ? (
        <LoadingRows rows={4} />
      ) : error ? (
        <ErrorState message={error} />
      ) : textPreview !== null ? (
        <div className="grid gap-2">
          {textTruncated !== null && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
              Đang hiển thị {formatSize(TEXT_PREVIEW_LIMIT)} đầu tiên trên tổng {formatSize(textTruncated)}. Bấm <b>Tải bản gốc</b> để xem toàn bộ.
            </p>
          )}
          <pre className="max-h-[65vh] overflow-auto rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">
            {textPreview}
          </pre>
        </div>
      ) : blobUrl && mime.startsWith("image/") ? (
        <div className="flex max-h-[68vh] items-center justify-center overflow-auto rounded-xl border border-border bg-muted/20 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={blobUrl} alt={target?.name ?? "Preview"} className="max-h-[64vh] rounded-lg object-contain" />
        </div>
      ) : blobUrl && mime === "application/pdf" ? (
        <iframe
          src={blobUrl}
          title={target?.name ?? "PDF Preview"}
          className="h-[68vh] w-full rounded-xl border border-border bg-muted/20"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-xs text-muted-foreground">
          <FileText size={28} />
          <p>Định dạng tệp này không hỗ trợ nhúng trực tiếp. Vui lòng tải bản gốc về máy để mở.</p>
        </div>
      )}

      {target && (
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {blobUrl && mime === "application/pdf" && (
            <a
              href={blobUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-semibold hover:bg-muted"
            >
              <ExternalLink size={13} /> Mở trong tab mới
            </a>
          )}
          {onDownload && (
            <Button type="button" variant="outline" size="sm" onClick={() => onDownload(target)}>
              <Download size={14} /> Tải bản gốc về máy
            </Button>
          )}
        </div>
      )}
    </ModalShell>
  );
}
