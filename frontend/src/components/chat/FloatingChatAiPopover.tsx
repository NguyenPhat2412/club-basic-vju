"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Calendar, CheckSquare, Loader2, Sparkles, X } from "lucide-react";
import { apiModel } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { describeError } from "@/components/shared/ListPage";
import { toast } from "@/components/ui/toast";
import { cn, formatDateTime } from "@/lib/utils";

const LIMIT_OPTIONS = [20, 50, 100] as const;

export function FloatingChatAiPopover({
  channelId,
  canSummarize,
  hasUserMessages,
  open,
  onOpenChange,
}: {
  channelId: string;
  canSummarize: boolean;
  hasUserMessages: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [messageLimit, setMessageLimit] = useState<number>(50);
  const [postToChannel, setPostToChannel] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);

  const summariesQuery = useQuery({
    queryKey: qk.channelSummaries(channelId),
    queryFn: () => apiModel.channelSummaries(channelId),
    enabled: Boolean(channelId && open),
    staleTime: 30_000,
  });

  const summarize = useMutation({
    mutationFn: () =>
      apiModel.summarizeChannel(channelId, {
        messageLimit,
        postToChannel,
      }),
    onSuccess: () => {
      toast.success("Trợ lý AI đã tóm tắt nội dung thảo luận của kênh.");
      void queryClient.invalidateQueries({ queryKey: qk.channelSummaries(channelId) });
      void queryClient.invalidateQueries({ queryKey: qk.channelMessages(channelId) });
      void queryClient.invalidateQueries({ queryKey: qk.myChatChannels() });
    },
    onError: (err) => toast.error(describeError(err)),
  });

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const latest = summariesQuery.data?.[0];

  return (
    <div ref={wrapRef} className="static">
      <button
        type="button"
        title="Trợ lý AI CLB"
        aria-label="Trợ lý AI CLB"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "flex size-7 items-center justify-center rounded-lg transition-colors",
          open || summarize.isPending
            ? "bg-primary/10 text-primary"
            : "text-slate-500 hover:bg-slate-100 hover:text-primary",
        )}
      >
        {summarize.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Trợ lý AI CLB"
          className="tg-pop-in absolute inset-x-2 top-full z-50 mt-1.5 flex max-h-[370px] w-auto flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-xs shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 font-extrabold text-primary">
              <Bot size={14} /> Trợ lý AI CLB
            </span>
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => onOpenChange(false)}
              className="flex size-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={13} />
            </button>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
            {canSummarize ? (
              <div className="space-y-2 rounded-xl border border-primary/15 bg-primary/5 p-2.5">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-bold text-slate-700">Phạm vi phân tích</span>
                  <div className="flex items-center gap-1">
                    {LIMIT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setMessageLimit(opt)}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10.5px] font-bold transition-colors",
                          messageLimit === opt
                            ? "bg-primary text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-primary/40",
                        )}
                      >
                        {`${opt} tin`}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={postToChannel}
                    onChange={(e) => setPostToChannel(e.target.checked)}
                    className="size-3.5 accent-primary"
                  />
                  <span>Đăng kết quả vào kênh chat</span>
                </label>
                <button
                  type="button"
                  disabled={summarize.isPending || !hasUserMessages}
                  onClick={() => summarize.mutate()}
                  className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-45"
                >
                  {summarize.isPending ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Đang phân tích…
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} /> Gọi AI tóm tắt kênh
                    </>
                  )}
                </button>
                {!hasUserMessages && (
                  <p className="text-[10.5px] text-slate-500">Cần có ít nhất 1 tin nhắn thành viên để AI tóm tắt.</p>
                )}
              </div>
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
                Bạn có thể xem lại bản tóm tắt AI gần nhất của kênh bên dưới.
              </p>
            )}

            {summariesQuery.isPending ? (
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ) : !latest ? (
              <p className="py-3 text-center text-[11px] text-slate-500">
                Kênh này chưa có bản tóm tắt AI nào.
              </p>
            ) : (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                <div className="flex items-center justify-between gap-1 text-[10.5px] font-semibold text-slate-500">
                  <span>Bản tóm tắt gần nhất</span>
                  <span>{formatDateTime(latest.createdAt)}</span>
                </div>
                <p data-no-i18n="true" className="whitespace-pre-line text-[11.5px] leading-relaxed text-slate-800">
                  {latest.summary}
                </p>
                {latest.decisions.length > 0 && (
                  <div className="space-y-1 border-t border-slate-200/70 pt-1.5">
                    <p className="text-[10.5px] font-bold text-primary">Quyết định chính</p>
                    <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-slate-700">
                      {latest.decisions.slice(0, 4).map((d, i) => (
                        <li key={i} data-no-i18n="true">{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {latest.suggestedTasks.length > 0 && (
                  <div className="space-y-1 border-t border-slate-200/70 pt-1.5">
                    <p className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-800">
                      <CheckSquare size={11} className="text-primary" /> Công việc đề xuất
                    </p>
                    <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-slate-700">
                      {latest.suggestedTasks.slice(0, 4).map((t, i) => (
                        <li key={i} data-no-i18n="true">{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {latest.suggestedEvents.length > 0 && (
                  <div className="space-y-1 border-t border-slate-200/70 pt-1.5">
                    <p className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-800">
                      <Calendar size={11} className="text-primary" /> Sự kiện đề xuất
                    </p>
                    <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-slate-700">
                      {latest.suggestedEvents.slice(0, 3).map((ev, i) => (
                        <li key={i} data-no-i18n="true">{ev}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
