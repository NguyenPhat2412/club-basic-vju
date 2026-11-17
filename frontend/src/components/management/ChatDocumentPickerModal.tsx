"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { FileText } from "lucide-react";
import { apiModel, DocumentItem } from "@/lib/api";
import { SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { ModalShell } from "@/components/shared/Overlays";
import { LoadingRows } from "@/components/shared/States";
import { Input } from "@/components/ui/input";
import { formatSize } from "@/lib/utils";

export function ChatDocumentPickerModal({
  open,
  clubId,
  canViewClubDocs,
  onClose,
  onSelect,
}: {
  open: boolean;
  clubId: string;
  canViewClubDocs: boolean;
  onClose: () => void;
  onSelect: (doc: DocumentItem) => void;
}) {
  const [docTab, setDocTab] = useState<"club" | "system">(canViewClubDocs ? "club" : "system");
  const [docSearch, setDocSearch] = useState("");
  const effectiveTab = docTab === "club" && !canViewClubDocs ? "system" : docTab;

  const vaultDocs = useQuery({
    queryKey: qk.chatVaultPicker(clubId, effectiveTab, docSearch),
    queryFn: () =>
      effectiveTab === "system"
        ? apiModel.systemDocuments({ name: docSearch, limit: 20 })
        : apiModel.documents(clubId, { name: docSearch, limit: 20 }),
    enabled: open && (effectiveTab === "system" || canViewClubDocs),
  });

  return (
    <ModalShell open={open} onClose={onClose} title="Đính kèm tài liệu từ Kho tập trung" icon={<FileText />}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedTabs
          value={effectiveTab}
          onChange={(v) => setDocTab(v as "club" | "system")}
          options={[
            ...(canViewClubDocs ? [{ value: "club", label: "Kho CLB" }] : []),
            { value: "system", label: "Văn bản Hệ thống" },
          ]}
        />
        <Input
          value={docSearch}
          aria-label="Tìm tên tài liệu"
          onChange={(e) => setDocSearch(e.target.value)}
          placeholder="Tìm tên tài liệu…"
          className="h-9 sm:w-52"
        />
      </div>
      {vaultDocs.isPending ? (
        <LoadingRows rows={3} />
      ) : !vaultDocs.data?.items.length ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Không tìm thấy tài liệu phù hợp.</p>
      ) : (
        <div className="max-h-72 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border">
          {vaultDocs.data.items.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => {
                onSelect(doc);
                onClose();
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs hover:bg-muted"
            >
              <span className="min-w-0 truncate font-semibold">{doc.name}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                v{doc.version} · {formatSize(doc.sizeBytes)}
              </span>
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  );
}
