"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, Image as ImageIcon, Play, X } from "lucide-react";
import { chatApi } from "@/api/chat/chat.api";
import { getCachedChatAttachmentUrl, resolveChatAttachmentUrl } from "@/lib/chat-message-cache";
import { cn, formatSize } from "@/lib/utils";
import type { ChatAttachment } from "@/types/chat/chat.types";

export function useChatAttachmentSrc(attachment: ChatAttachment | null | undefined, eager = true) {
  const immediate = attachment
    ? getCachedChatAttachmentUrl(attachment.id) ?? attachment.localPreviewUrl ?? ""
    : "";
  const [resolved, setResolved] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (!attachment || immediate || !eager) return;
    let cancelled = false;
    resolveChatAttachmentUrl(attachment).then((url) => {
      if (!cancelled) setResolved({ id: attachment.id, url });
    });
    return () => {
      cancelled = true;
    };
  }, [attachment, eager, immediate]);

  if (!attachment) return "";
  return immediate || (resolved?.id === attachment.id ? resolved.url : "");
}

function FilmstripThumb({
  item,
  active,
  onClick,
}: {
  item: ChatAttachment;
  active: boolean;
  onClick: () => void;
}) {
  const isVideo = item.mediaKind === "VIDEO";
  const src = useChatAttachmentSrc(item, !isVideo || item.sizeBytes <= 25 * 1024 * 1024);
  const url = src || (isVideo ? chatApi.chatAttachmentStreamUrl(item.id) : "");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Xem ${item.fileName}`}
      aria-current={active ? "true" : undefined}
      className={cn(
        "relative size-14 shrink-0 overflow-hidden rounded-lg border-2 bg-white/10 transition-all",
        active ? "scale-105 border-white opacity-100 shadow-lg" : "border-transparent opacity-60 hover:opacity-95",
      )}
    >
      {isVideo ? (
        <>
          <video src={url} muted playsInline preload="metadata" className="size-full object-cover" />
          <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/35 text-white">
            <Play size={14} className="fill-current" />
          </span>
        </>
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={item.fileName} className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center text-white/60">
          <ImageIcon size={14} />
        </span>
      )}
    </button>
  );
}

export function ChatMediaLightbox({
  media,
  activeIndex,
  onIndexChange,
  onDownload,
}: {
  media: ChatAttachment[];
  activeIndex: number | null;
  onIndexChange: (next: number | null) => void;
  onDownload: (att: ChatAttachment) => void;
}) {
  const safeIndex =
    activeIndex !== null && activeIndex >= 0 && activeIndex < media.length ? activeIndex : null;
  const activeItem = safeIndex !== null ? media[safeIndex] ?? null : null;
  const isVideo = activeItem?.mediaKind === "VIDEO";
  const resolvedSrc = useChatAttachmentSrc(activeItem, Boolean(activeItem));
  const activeUrl = activeItem
    ? resolvedSrc || (isVideo ? chatApi.chatAttachmentStreamUrl(activeItem.id) : "")
    : "";

  useEffect(() => {
    if (safeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onIndexChange(null);
      if (e.key === "ArrowRight" && media.length > 1) {
        onIndexChange((safeIndex + 1) % media.length);
      }
      if (e.key === "ArrowLeft" && media.length > 1) {
        onIndexChange((safeIndex - 1 + media.length) % media.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [media.length, onIndexChange, safeIndex]);

  if (!activeItem || safeIndex === null || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Xem ${activeItem.fileName}`}
      className="fixed inset-0 z-[120] flex flex-col bg-slate-950/95 p-4 text-white backdrop-blur-xs"
      onClick={() => onIndexChange(null)}
    >
      <div
        className="flex items-center justify-between gap-3 pb-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <p data-no-i18n="true" className="truncate text-sm font-semibold">{activeItem.fileName}</p>
          <p data-no-i18n="true" className="font-mono text-xs text-white/70">
            {safeIndex + 1} / {media.length} · {formatSize(activeItem.sizeBytes)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onDownload(activeItem)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
          >
            <Download size={14} /> Tải về
          </button>
          <button
            type="button"
            aria-label="Đóng trình xem"
            title="Đóng trình xem"
            onClick={() => onIndexChange(null)}
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
            title="Tệp trước"
            onClick={() => onIndexChange((safeIndex - 1 + media.length) % media.length)}
            className="absolute left-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/65 text-white shadow-lg hover:bg-black/85"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {isVideo ? (
          <video
            key={activeItem.id}
            src={activeUrl}
            controls
            autoPlay
            playsInline
            className="max-h-[72vh] max-w-[92vw] rounded-xl bg-black object-contain shadow-2xl"
          />
        ) : activeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={activeItem.id}
            src={activeUrl}
            alt={activeItem.fileName}
            className="max-h-[72vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
          />
        ) : (
          <div className="flex size-32 items-center justify-center rounded-xl bg-white/10 text-white/70">
            <ImageIcon size={28} className="animate-pulse" />
          </div>
        )}
        {media.length > 1 && (
          <button
            type="button"
            aria-label="Tệp tiếp theo"
            title="Tệp tiếp theo"
            onClick={() => onIndexChange((safeIndex + 1) % media.length)}
            className="absolute right-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/65 text-white shadow-lg hover:bg-black/85"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {media.length > 1 && (
        <div
          aria-label="Danh sách ảnh trong đoạn chat"
          className="mx-auto mt-3 flex max-w-full items-center gap-2 overflow-x-auto rounded-2xl bg-white/8 px-3 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          {media.map((item, idx) => (
            <FilmstripThumb
              key={item.id}
              item={item}
              active={idx === safeIndex}
              onClick={() => onIndexChange(idx)}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
