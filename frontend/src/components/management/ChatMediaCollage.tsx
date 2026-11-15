"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Image as ImageIcon, Play, X } from "lucide-react";
import { chatApi } from "@/api/chat/chat.api";
import {
  chunkAlbumRows,
  getCachedChatAttachmentUrl,
  resolveChatAttachmentUrl,
} from "@/lib/chat-message-cache";
import { cn, fileExtension, formatSize, saveBlob } from "@/lib/utils";
import type { ChatAttachment } from "@/types/chat/chat.types";

const ALBUM_MAX_TILES = 8;

function useAttachmentSrc(attachment: ChatAttachment, eager = true) {
  const immediate = getCachedChatAttachmentUrl(attachment.id) ?? attachment.localPreviewUrl ?? "";
  const [resolved, setResolved] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (immediate || !eager) return;
    let cancelled = false;
    resolveChatAttachmentUrl(attachment).then((url) => {
      if (!cancelled) setResolved({ id: attachment.id, url });
    });
    return () => {
      cancelled = true;
    };
  }, [attachment, eager, immediate]);

  return immediate || (resolved?.id === attachment.id ? resolved.url : "");
}

function MediaThumb({
  attachment,
  className,
  moreCount = 0,
  onClick,
}: {
  attachment: ChatAttachment;
  className?: string;
  moreCount?: number;
  onClick: () => void;
}) {
  const isVideo = attachment.mediaKind === "VIDEO";
  const src = useAttachmentSrc(attachment, !isVideo || attachment.sizeBytes <= 25 * 1024 * 1024);
  const mediaUrl = src || (isVideo ? chatApi.chatAttachmentStreamUrl(attachment.id) : "");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Xem ${attachment.fileName}`}
      className={cn(
        "group/tile relative block overflow-hidden bg-slate-900/10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
    >
      {isVideo ? (
        <>
          <video
            src={mediaUrl}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full bg-black object-cover transition-transform duration-200 group-hover/tile:scale-[1.02]"
          />
          <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/20">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white shadow-sm">
              <Play size={14} className="ml-0.5 fill-current" />
            </span>
          </span>
        </>
      ) : mediaUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={mediaUrl}
          alt={attachment.fileName}
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-200 group-hover/tile:scale-[1.02]"
        />
      ) : (
        <div className="flex h-full min-h-[88px] w-full items-center justify-center text-muted-foreground">
          <ImageIcon size={18} className="animate-pulse" />
        </div>
      )}
      {moreCount > 0 && (
        <span className="absolute inset-0 grid place-items-center bg-black/60 text-base font-bold text-white">
          +{moreCount}
        </span>
      )}
    </button>
  );
}

function SingleVideoPlayer({ attachment }: { attachment: ChatAttachment }) {
  const cached = useAttachmentSrc(attachment, attachment.sizeBytes <= 25 * 1024 * 1024);
  const videoSrc = cached || chatApi.chatAttachmentStreamUrl(attachment.id);

  return (
    <div className="w-[min(336px,72vw)] max-w-full overflow-hidden rounded-lg border border-border/60 bg-black">
      <video
        controls
        playsInline
        preload="metadata"
        src={videoSrc}
        aria-label={attachment.fileName}
        className="max-h-64 w-full bg-black object-contain"
      />
    </div>
  );
}

export function ChatMediaCollage({
  attachments,
  flushTop = false,
  onError,
}: {
  attachments?: ChatAttachment[];
  flushTop?: boolean;
  onError?: (msg: string) => void;
}) {
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);

  const items = attachments ?? [];
  const media = items.filter((a) => a.mediaKind === "IMAGE" || a.mediaKind === "VIDEO");
  const files = items.filter((a) => a.mediaKind === "FILE");
  const visibleMedia = media.slice(0, ALBUM_MAX_TILES);
  const singleMedia = media.length === 1 ? media[0] : null;

  useEffect(() => {
    if (viewerIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewerIdx(null);
      if (e.key === "ArrowRight" && media.length > 1) {
        setViewerIdx((i) => (i === null ? null : (i + 1) % media.length));
      }
      if (e.key === "ArrowLeft" && media.length > 1) {
        setViewerIdx((i) => (i === null ? null : (i - 1 + media.length) % media.length));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [media.length, viewerIdx]);

  if (!items.length) return null;

  const handleDownload = async (att: ChatAttachment) => {
    try {
      const blob = await chatApi.streamChatAttachment(att.id, true);
      saveBlob(blob, att.fileName);
    } catch {
      onError?.("Không tải được tệp đính kèm. Vui lòng thử lại.");
    }
  };

  const activeItem = viewerIdx !== null ? media[viewerIdx] : null;
  const activeUrl = activeItem
    ? getCachedChatAttachmentUrl(activeItem.id) ||
      activeItem.localPreviewUrl ||
      chatApi.chatAttachmentStreamUrl(activeItem.id)
    : "";

  return (
    <div className={cn("flex w-fit max-w-full flex-col gap-1.5 text-left", flushTop ? "mt-0" : "mt-1.5")}>
      {singleMedia?.mediaKind === "IMAGE" ? (
        <MediaThumb
          attachment={singleMedia}
          className="max-h-64 min-h-[96px] w-[min(264px,68vw)] rounded-lg border border-border/50"
          onClick={() => setViewerIdx(0)}
        />
      ) : singleMedia?.mediaKind === "VIDEO" ? (
        <SingleVideoPlayer attachment={singleMedia} />
      ) : media.length > 1 ? (
        <div className="grid w-[min(300px,72vw)] max-w-full gap-0.5 overflow-hidden rounded-lg border border-border/50">
          {chunkAlbumRows(visibleMedia).map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-0.5">
              {row.map(({ index, item }) => (
                <MediaThumb
                  key={item.id}
                  attachment={item}
                  className="aspect-square min-w-0 flex-1"
                  moreCount={
                    index === visibleMedia.length - 1 && media.length > visibleMedia.length
                      ? media.length - visibleMedia.length
                      : 0
                  }
                  onClick={() => setViewerIdx(index)}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {files.map((file) => (
        <button
          key={file.id}
          type="button"
          onClick={() => void handleDownload(file)}
          className="flex w-[min(288px,72vw)] max-w-full items-center gap-2.5 rounded-lg border border-border/70 bg-card px-2.5 py-2 text-left transition-colors hover:bg-muted/60"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 font-mono text-[9.5px] font-bold uppercase text-primary">
            {fileExtension(file.fileName, file.contentType)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-foreground" title={file.fileName}>
              {file.fileName}
            </span>
            <span className="block font-mono text-[10px] text-muted-foreground">
              {formatSize(file.sizeBytes)}
            </span>
          </span>
          <Download size={14} className="shrink-0 text-muted-foreground" />
        </button>
      ))}

      {activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Xem ${activeItem.fileName}`}
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 text-white"
          onClick={() => setViewerIdx(null)}
        >
          <div
            className="flex items-center justify-between gap-3 pb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{activeItem.fileName}</p>
              <p className="font-mono text-xs text-white/70">
                {(viewerIdx ?? 0) + 1} / {media.length} · {formatSize(activeItem.sizeBytes)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleDownload(activeItem)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
              >
                <Download size={14} /> Tải về
              </button>
              <button
                type="button"
                aria-label="Đóng trình xem"
                onClick={() => setViewerIdx(null)}
                className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 hover:bg-white/25"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {media.length > 1 && (
              <button
                type="button"
                aria-label="Tệp trước"
                onClick={() => setViewerIdx((i) => ((i ?? 0) - 1 + media.length) % media.length)}
                className="absolute left-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {activeItem.mediaKind === "VIDEO" ? (
              <video
                src={activeUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[80vh] max-w-full rounded-lg bg-black object-contain shadow-2xl"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={activeUrl}
                alt={activeItem.fileName}
                className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
            )}
            {media.length > 1 && (
              <button
                type="button"
                aria-label="Tệp tiếp theo"
                onClick={() => setViewerIdx((i) => ((i ?? 0) + 1) % media.length)}
                className="absolute right-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
