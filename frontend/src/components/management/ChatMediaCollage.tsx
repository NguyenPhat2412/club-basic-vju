"use client";

import { useState } from "react";
import { Download, Image as ImageIcon, Play } from "lucide-react";
import { chatApi } from "@/api/chat/chat.api";
import { chunkAlbumRows } from "@/lib/chat-message-cache";
import { ChatMediaLightbox, useChatAttachmentSrc } from "@/components/management/ChatMediaLightbox";
import { cn, fileExtension, formatSize, saveBlob } from "@/lib/utils";
import type { ChatAttachment } from "@/types/chat/chat.types";

const ALBUM_MAX_TILES = 8;

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
  const src = useChatAttachmentSrc(attachment, !isVideo || attachment.sizeBytes <= 25 * 1024 * 1024);
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
          className="block h-full w-full object-cover transition-transform duration-200 group-hover/tile:scale-[1.02]"
        />
      ) : (
        <div className="flex h-24 w-full items-center justify-center text-muted-foreground">
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
  const cached = useChatAttachmentSrc(attachment, attachment.sizeBytes <= 25 * 1024 * 1024);
  const videoSrc = cached || chatApi.chatAttachmentStreamUrl(attachment.id);

  return (
    <div className="w-[min(336px,100%)] max-w-full overflow-hidden rounded-lg border border-border/60 bg-black">
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
  galleryMedia,
  flushTop = false,
  onError,
}: {
  attachments?: ChatAttachment[];
  galleryMedia?: ChatAttachment[];
  flushTop?: boolean;
  onError?: (msg: string) => void;
}) {
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);

  const items = attachments ?? [];
  const media = items.filter((a) => a.mediaKind === "IMAGE" || a.mediaKind === "VIDEO");
  const files = items.filter((a) => a.mediaKind === "FILE");
  const visibleMedia = media.slice(0, ALBUM_MAX_TILES);
  const singleMedia = media.length === 1 ? media[0] : null;
  const lightboxMedia = galleryMedia && galleryMedia.length > 0 ? galleryMedia : media;

  if (!items.length) return null;

  const openViewerFor = (att: ChatAttachment, fallbackIdx: number) => {
    const idx = lightboxMedia.findIndex((x) => x.id === att.id);
    setViewerIdx(idx >= 0 ? idx : fallbackIdx);
  };

  const handleDownload = async (att: ChatAttachment) => {
    try {
      const blob = await chatApi.streamChatAttachment(att.id, true);
      saveBlob(blob, att.fileName);
    } catch {
      onError?.("Không tải được tệp đính kèm. Vui lòng thử lại.");
    }
  };

  return (
    <div className={cn("flex w-full min-w-0 max-w-full flex-col gap-1.5 text-left", flushTop ? "mt-0" : "mt-1.5")}>
      {singleMedia?.mediaKind === "IMAGE" ? (
        <MediaThumb
          attachment={singleMedia}
          className="max-h-64 w-[min(264px,100%)] max-w-full rounded-lg border border-border/50"
          onClick={() => openViewerFor(singleMedia, 0)}
        />
      ) : singleMedia?.mediaKind === "VIDEO" ? (
        <SingleVideoPlayer attachment={singleMedia} />
      ) : media.length > 1 ? (
        <div className="grid w-[min(300px,100%)] max-w-full gap-0.5 overflow-hidden rounded-lg border border-border/50">
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
                  onClick={() => openViewerFor(item, index)}
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
          className="flex w-[min(288px,100%)] max-w-full items-center gap-2.5 rounded-lg border border-border/70 bg-card px-2.5 py-2 text-left transition-colors hover:bg-muted/60"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 font-mono text-[9.5px] font-bold uppercase text-primary">
            {fileExtension(file.fileName, file.contentType)}
          </span>
          <span className="min-w-0 flex-1">
            <span data-no-i18n="true" className="block truncate text-xs font-semibold text-foreground" title={file.fileName}>
              {file.fileName}
            </span>
            <span className="block font-mono text-[10px] text-muted-foreground">
              {formatSize(file.sizeBytes)}
            </span>
          </span>
          <Download size={14} className="shrink-0 text-muted-foreground" />
        </button>
      ))}

      <ChatMediaLightbox
        media={lightboxMedia}
        activeIndex={viewerIdx}
        onIndexChange={setViewerIdx}
        onDownload={(att) => void handleDownload(att)}
      />
    </div>
  );
}
