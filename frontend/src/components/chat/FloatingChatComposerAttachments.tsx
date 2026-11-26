"use client";

import { FileText, Reply, Sparkles, X } from "lucide-react";
import { formatSize } from "@/lib/utils";
import type { ChatMessage, StagedChatMedia } from "@/types/chat/chat.types";
import type { DocumentItem } from "@/types/document/document.types";

export function FloatingChatComposerAttachments({
  showAiHint,
  onTriggerAi,
  replyTo,
  onClearReply,
  attachedDoc,
  onClearAttachedDoc,
  stagedMedia,
  onRemoveStagedMedia,
}: {
  showAiHint: boolean;
  onTriggerAi: () => void;
  replyTo: ChatMessage | null;
  onClearReply: () => void;
  attachedDoc: DocumentItem | null;
  onClearAttachedDoc?: () => void;
  stagedMedia: StagedChatMedia[];
  onRemoveStagedMedia: (localId: string) => void;
}) {
  return (
    <>
      {showAiHint && (
        <button
          type="button"
          onClick={onTriggerAi}
          className="mb-1.5 flex w-full items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/8 px-2.5 py-1.5 text-left text-xs font-bold text-primary hover:bg-primary/12"
        >
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={13} /> Mở Trợ lý AI tóm tắt kênh này
          </span>
          <span className="text-[10px] font-semibold opacity-75">Enter</span>
        </button>
      )}

      {replyTo && (
        <div className="mb-1.5 flex items-center justify-between gap-2 rounded-lg border-l-2 border-primary bg-slate-50 px-2.5 py-1 text-[11px]">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 font-bold text-primary">
              <Reply size={11} />
              <span>Đang trả lời</span>
              <span data-no-i18n="true" className="truncate text-slate-800">
                {replyTo.senderType === "AI_BOT" ? "Trợ lý AI CLB" : replyTo.senderFullName || "Thành viên"}
              </span>
            </p>
            <p data-no-i18n={replyTo.content?.trim() ? "true" : undefined} className="truncate text-slate-500">
              {replyTo.content?.trim() || "[Đính kèm đa phương tiện]"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Huỷ trả lời"
            onClick={onClearReply}
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {attachedDoc && (
        <div className="mb-1.5 flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px]">
          <div className="flex min-w-0 items-center gap-1.5">
            <FileText size={13} className="shrink-0 text-primary" />
            <span data-no-i18n="true" className="truncate font-semibold text-slate-800">
              {attachedDoc.name}
            </span>
            <span data-no-i18n="true" className="shrink-0 font-mono text-[10px] text-slate-500">
              v{attachedDoc.version} · {formatSize(attachedDoc.sizeBytes)}
            </span>
          </div>
          <button
            type="button"
            title="Bỏ đính kèm tài liệu"
            aria-label="Bỏ đính kèm tài liệu"
            onClick={onClearAttachedDoc}
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {stagedMedia.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {stagedMedia.map((item) => (
            <div key={item.localId} className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {item.mediaKind === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt={item.file.name} className="size-12 object-cover" />
              ) : (
                <span className="flex h-8 max-w-28 items-center gap-1 px-2 text-[10.5px] text-slate-700">
                  <FileText size={12} className="shrink-0 text-primary" />
                  <span data-no-i18n="true" className="truncate">{item.file.name}</span>
                </span>
              )}
              <button
                type="button"
                aria-label="Xoá tệp"
                onClick={() => onRemoveStagedMedia(item.localId)}
                className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-slate-900/75 text-white hover:bg-destructive"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
