"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { Edit2, Plus, Search, Send, Trash2, X } from "lucide-react";
import { chatApi } from "@/api/chat/chat.api";
import { describeError } from "@/components/shared/ListPage";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatQuickReply } from "@/types/chat/chat.types";

export type ChatQuickReplyPopoverProps = {
  open: boolean;
  clubId: string;
  currentUserId?: string;
  canManageAll: boolean;
  slashFilter?: string;
  activeIndex?: number;
  quickReplies: ChatQuickReply[];
  loading: boolean;
  onClose: () => void;
  onInsert: (reply: ChatQuickReply, sendImmediately?: boolean) => void;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
};

export function filterQuickReplies(items: ChatQuickReply[], rawQuery: string): ChatQuickReply[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return items;
  const withoutSlash = q.startsWith("/") ? q.slice(1) : q;
  if (!withoutSlash) return items;
  return items.filter(
    (item) =>
      item.shortcut.toLowerCase().includes(q) ||
      item.shortcut.slice(1).toLowerCase().includes(withoutSlash) ||
      item.title.toLowerCase().includes(withoutSlash) ||
      item.content.toLowerCase().includes(withoutSlash)
  );
}

export function ChatQuickReplyPopover({
  open,
  clubId,
  currentUserId,
  canManageAll,
  slashFilter = "",
  activeIndex = 0,
  quickReplies,
  loading,
  onClose,
  onInsert,
  onNotice,
  onError,
}: ChatQuickReplyPopoverProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ChatQuickReply | "new" | null>(null);
  const [shortcut, setShortcut] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const filtered = useMemo(
    () => filterQuickReplies(quickReplies, slashFilter || search),
    [quickReplies, search, slashFilter]
  );

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { shortcut: shortcut.trim(), title: title.trim(), content: body.trim() };
      return editing && editing !== "new"
        ? chatApi.updateQuickReply(clubId, editing.id, payload)
        : chatApi.createQuickReply(clubId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.clubQuickReplies(clubId) });
      onNotice(editing === "new" ? "Đã lưu tin nhắn nhanh mới." : "Đã cập nhật tin nhắn nhanh.");
      setEditing(null);
    },
    onError: (err) => onError(describeError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (replyId: string) => chatApi.deleteQuickReply(clubId, replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.clubQuickReplies(clubId) });
      onNotice("Đã xóa tin nhắn nhanh.");
    },
    onError: (err) => onError(describeError(err)),
  });

  if (!open) return null;

  const startCreate = () => {
    setEditing("new");
    setShortcut("/");
    setTitle("");
    setBody("");
  };

  const startEdit = (item: ChatQuickReply) => {
    setEditing(item);
    setShortcut(item.shortcut);
    setTitle(item.title);
    setBody(item.content);
  };

  const safeIdx = filtered.length ? Math.min(activeIndex, filtered.length - 1) : 0;

  return (
    <>
      {!slashFilter && (
        <button
          type="button"
          aria-label="Đóng tin nhắn nhanh"
          onClick={onClose}
          className="fixed inset-0 z-20 cursor-default"
        />
      )}
      <div
        role="dialog"
        aria-label="Tin nhắn nhanh"
        className="absolute bottom-full left-2 z-30 mb-1.5 w-[min(380px,calc(100%-1rem))] overflow-hidden rounded-lg border border-border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <span className="text-xs font-bold text-foreground">
            Tin nhắn nhanh ({quickReplies.length})
          </span>
          <div className="flex items-center gap-1.5">
            {editing ? (
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Quay lại
              </button>
            ) : (
              <button
                type="button"
                onClick={startCreate}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus size={12} /> Thêm mẫu
              </button>
            )}
            <button
              type="button"
              aria-label="Đóng"
              onClick={onClose}
              className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-2 p-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Phím tắt" required>
                <Input value={shortcut} maxLength={40} placeholder="/diem-danh" onChange={(e) => setShortcut(e.target.value)} />
              </FormField>
              <FormField label="Tiêu đề ngắn" required>
                <Input value={title} maxLength={120} placeholder="Tiêu đề ngắn" onChange={(e) => setTitle(e.target.value)} />
              </FormField>
            </div>
            <FormField label="Nội dung tin nhắn nhanh" required>
              <Textarea rows={2} maxLength={2000} value={body} placeholder="Nội dung tin nhắn nhanh…" onChange={(e) => setBody(e.target.value)} />
            </FormField>
            <div className="flex justify-end gap-1.5">
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>
                Huỷ
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!shortcut.trim() || !title.trim() || !body.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Đang lưu…" : "Lưu"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {!slashFilter && (
              <div className="border-b border-border/50 px-2.5 py-1.5">
                <label className="flex h-7 items-center gap-1.5 rounded-md bg-muted/40 px-2 text-xs">
                  <Search size={12} className="text-muted-foreground" />
                  <input
                    maxLength={120}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm /phím-tắt hoặc nội dung…"
                    className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </label>
              </div>
            )}

            <div className="max-h-56 divide-y divide-border/40 overflow-y-auto">
              {loading && !quickReplies.length ? (
                <p className="p-3 text-center text-xs text-muted-foreground">Đang tải…</p>
              ) : !filtered.length ? (
                <p className="p-3 text-center text-xs text-muted-foreground">
                  Chưa có mẫu phù hợp. Bấm <b>Thêm mẫu</b> để tạo nhanh.
                </p>
              ) : (
                filtered.map((item, idx) => {
                  const canModify = canManageAll || (Boolean(currentUserId) && item.createdBy === currentUserId);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group flex items-start justify-between gap-2 px-3 py-2 transition-colors hover:bg-muted/50",
                        slashFilter && idx === safeIdx && "bg-primary/[0.07]"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onInsert(item, false)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-foreground">
                            {item.shortcut}
                          </span>
                          <span className="truncate text-xs font-semibold text-foreground">{item.title}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[11.5px] text-muted-foreground">{item.content}</p>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          title="Gửi ngay"
                          aria-label={`Gửi ngay ${item.title}`}
                          onClick={() => onInsert(item, true)}
                          className="grid h-6 w-6 place-items-center rounded text-primary hover:bg-primary/10"
                        >
                          <Send size={12} />
                        </button>
                        {canModify && (
                          <>
                            <button
                              type="button"
                              title="Sửa"
                              aria-label={`Sửa ${item.title}`}
                              onClick={() => startEdit(item)}
                              className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              type="button"
                              title="Xóa"
                              aria-label={`Xóa ${item.title}`}
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate(item.id)}
                              className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border/50 bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">
              Gợi ý: nhập <span className="rounded bg-background px-1 font-mono font-semibold text-foreground">/</span> vào ô chat để chọn nhanh bằng phím ↑↓ · Enter.
            </div>
          </>
        )}
      </div>
    </>
  );
}
