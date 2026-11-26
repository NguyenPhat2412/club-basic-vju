"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, FolderOpen, Loader2, Search, X } from "lucide-react";
import { documentsApi } from "@/api/document/documents.api";
import { qk } from "@/lib/api/query-keys";
import { cn, formatSize } from "@/lib/utils";
import type { DocumentItem } from "@/types/document/document.types";

export function FloatingChatDocPicker({
  clubId,
  canViewClubDocs,
  open,
  onOpenChange,
  onSelect,
}: {
  clubId: string;
  canViewClubDocs: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (doc: DocumentItem) => void;
}) {
  const [tab, setTab] = useState<"club" | "system">(canViewClubDocs ? "club" : "system");
  const [search, setSearch] = useState("");
  const effectiveTab = tab === "club" && !canViewClubDocs ? "system" : tab;
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const docsQuery = useQuery({
    queryKey: qk.chatVaultPicker(clubId, effectiveTab, search),
    queryFn: () =>
      effectiveTab === "system"
        ? documentsApi.systemDocuments({ name: search.trim() || undefined, limit: 15 })
        : documentsApi.documents(clubId, { name: search.trim() || undefined, limit: 15 }),
    enabled: open && (effectiveTab === "system" || (canViewClubDocs && Boolean(clubId))),
    staleTime: 20_000,
  });

  const items = docsQuery.data?.items ?? [];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title="Đính kèm từ Kho tài liệu"
        aria-label="Đính kèm từ Kho tài liệu"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
          open
            ? "bg-primary/15 text-primary"
            : "text-primary/85 hover:bg-primary/10 hover:text-primary",
        )}
      >
        <FolderOpen size={15} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Đính kèm từ Kho tài liệu"
          className="fade-in absolute inset-x-2 bottom-full z-40 mb-1.5 flex max-h-64 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-2.5 py-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
              <FolderOpen size={12.5} className="text-primary" /> Kho tài liệu
            </span>
            <button
              type="button"
              aria-label="Đóng kho tài liệu"
              onClick={() => onOpenChange(false)}
              className="flex size-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={12} />
            </button>
          </div>

          <div className="space-y-1.5 border-b border-slate-100 px-2.5 py-1.5">
            {canViewClubDocs && (
              <div className="flex items-center gap-1">
                {(["club", "system"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTab(k)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-colors",
                      effectiveTab === k
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    {k === "club" ? "Kho CLB" : "Văn bản Hệ thống"}
                  </button>
                ))}
              </div>
            )}
            <div className="relative">
              <Search size={11.5} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                maxLength={80}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên tài liệu…"
                aria-label="Tìm tên tài liệu"
                className="h-7 w-full rounded-lg border border-slate-200 bg-slate-50 pl-6.5 pr-6 text-[11.5px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary/45 focus:bg-white"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Xoá từ khoá"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-1">
            {docsQuery.isPending ? (
              <div className="flex items-center justify-center gap-1.5 py-4 text-[11px] text-slate-500">
                <Loader2 size={12} className="animate-spin text-primary" /> Đang tải tài liệu…
              </div>
            ) : !items.length ? (
              <p className="py-4 text-center text-[11px] text-slate-500">
                Không tìm thấy tài liệu phù hợp.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {items.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(doc);
                        onOpenChange(false);
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-slate-100"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <FileText size={13} className="shrink-0 text-primary" />
                        <span data-no-i18n="true" className="truncate font-semibold text-slate-800">
                          {doc.name}
                        </span>
                      </span>
                      <span data-no-i18n="true" className="shrink-0 font-mono text-[10px] text-slate-400">
                        v{doc.version} · {formatSize(doc.sizeBytes)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
