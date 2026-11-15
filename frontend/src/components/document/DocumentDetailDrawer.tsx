"use client";

import { Download, Eye, FileText, History, Pencil, RotateCcw, Trash2, Upload } from "lucide-react";
import type { DocumentItem, DocumentVersion, DocumentVisibility } from "@/lib/api";
import type { PreviewTarget } from "@/components/document/DocumentPreviewModal";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import { LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { Badge, Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { fileExtension, formatDateTime, formatSize, validateVaultFile } from "@/lib/utils";

const APP_KEY_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;

export function visibilityMeta(doc: Pick<DocumentItem, "visibility" | "departmentName">): {
  label: string;
  tone: Tone;
} {
  switch (doc.visibility) {
    case "PUBLIC_INTERNAL":
      return { label: "Toàn trường", tone: "primary" };
    case "OFFICERS":
      return { label: "Ban chủ nhiệm", tone: "pending" };
    case "DEPARTMENT_ONLY":
      return { label: doc.departmentName ? `Ban: ${doc.departmentName}` : "Nội bộ Ban", tone: "primary" };
    case "MEMBERS":
    default:
      return { label: "Thành viên CLB", tone: "neutral" };
  }
}

export function DocumentDetailDrawer({
  open,
  busy = false,
  subtitle,
  loading,
  doc,
  versions,
  canUpdate,
  canChangeVisibility = true,
  canUploadVersion,
  canDelete,
  canRestore,
  editName,
  onEditName,
  editKey,
  onEditKey,
  editVisibility,
  onEditVisibility,
  versionFile,
  versionInputKey,
  onVersionFile,
  onClose,
  onPreview,
  onDownload,
  onSoftDelete,
  onRestore,
  onSaveEdit,
  onUploadVersion,
}: {
  open: boolean;
  busy?: boolean;
  subtitle?: string;
  loading: boolean;
  doc?: DocumentItem;
  versions: DocumentVersion[];
  canUpdate: boolean;
  canChangeVisibility?: boolean;
  canUploadVersion: boolean;
  canDelete: boolean;
  canRestore: boolean;
  editName: string;
  onEditName: (v: string) => void;
  editKey: string;
  onEditKey: (v: string) => void;
  editVisibility: DocumentVisibility;
  onEditVisibility: (v: DocumentVisibility) => void;
  versionFile: File | null;
  versionInputKey: number;
  onVersionFile: (f: File | null) => void;
  onClose: () => void;
  onPreview: (target: PreviewTarget) => void;
  onDownload: (doc: DocumentItem, version?: number) => void;
  onSoftDelete: (doc: DocumentItem) => void;
  onRestore: (doc: DocumentItem) => void;
  onSaveEdit: (doc: DocumentItem) => void;
  onUploadVersion: (doc: DocumentItem) => void;
}) {
  const vis = doc ? visibilityMeta(doc) : null;
  const currentExt = doc ? fileExtension(doc.name, doc.contentType) : "";
  const versionError = versionFile && currentExt ? validateVaultFile(versionFile, currentExt) : null;
  const trimmedKey = editKey.trim();
  const editKeyError =
    trimmedKey && (trimmedKey.length > 100 || !APP_KEY_RE.test(trimmedKey))
      ? "Chỉ gồm chữ thường, số, dấu gạch dưới và dấu chấm."
      : null;

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={doc?.name ?? "Chi tiết tài liệu"}
      subtitle={subtitle}
      icon={<FileText />}
      footer={
        doc &&
        (doc.deleted ? (
          canRestore ? (
            <Button size="sm" disabled={busy} onClick={() => onRestore(doc)}>
              <RotateCcw size={14} /> {busy ? "Đang xử lý…" : "Khôi phục"}
            </Button>
          ) : undefined
        ) : (
          <>
            {doc.previewable !== false && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPreview({ id: doc.id, name: doc.name, contentType: doc.contentType })}
              >
                <Eye size={14} /> Xem trước
              </Button>
            )}
            <Button variant="outline" size="sm" disabled={busy} onClick={() => onDownload(doc)}>
              <Download size={14} /> Tải xuống
            </Button>
            {canDelete && (
              <Button variant="destructive" size="sm" disabled={busy} onClick={() => onSoftDelete(doc)}>
                <Trash2 size={14} /> Xoá mềm
              </Button>
            )}
          </>
        ))
      }
    >
      {loading ? (
        <LoadingRows rows={4} />
      ) : (
        doc && (
          <>
            <DetailList
              rows={[
                [
                  "Trạng thái",
                  doc.deleted ? (
                    <Badge key="s" tone="danger">
                      Đã xoá {formatDateTime(doc.deletedAt)}
                    </Badge>
                  ) : (
                    <Badge key="s" tone="primary">
                      Đang dùng (Kho tập trung)
                    </Badge>
                  ),
                ],
                [
                  "Phạm vi & Quyền xem",
                  vis ? (
                    <Badge key="vis" tone={vis.tone}>
                      {vis.label}
                    </Badge>
                  ) : (
                    "—"
                  ),
                ],
                [
                  "Phiên bản",
                  <span key="v" className="font-mono font-bold text-primary">
                    v{doc.version}
                  </span>,
                ],
                ["Loại file", doc.contentType.split(";")[0]],
                [
                  "Kích thước",
                  <span key="z" className="font-mono">
                    {formatSize(doc.sizeBytes)}
                  </span>,
                ],
                ["appDetailKey", doc.appDetailKey || "—"],
                [
                  "SHA-256",
                  <span key="h" className="break-all font-mono text-[11px]">
                    {doc.checksumSha256}
                  </span>,
                ],
                ["Tạo lúc", formatDateTime(doc.createdAt)],
                ["Cập nhật", formatDateTime(doc.updatedAt)],
              ]}
            />
            {!doc.deleted && (
              <>
                {canUpdate && (
                  <Section title="Sửa thông tin & Phân quyền hiển thị" icon={<Pencil />}>
                    <FormField label="Tên tài liệu" required>
                      <Input value={editName} maxLength={200} onChange={(e) => onEditName(e.target.value)} />
                    </FormField>
                    <FormField label="appDetailKey" hint="Bỏ trống để xoá" error={editKeyError ?? undefined}>
                      <Input value={editKey} maxLength={100} onChange={(e) => onEditKey(e.target.value)} />
                    </FormField>
                    {doc.scope !== "DEPARTMENT" && canChangeVisibility && (
                      <FormField label="Mức hiển thị" required>
                        <Select
                          value={editVisibility}
                          onChange={(e) => onEditVisibility(e.target.value as DocumentVisibility)}
                        >
                          {doc.scope === "SYSTEM" ? (
                            <>
                              <option value="PUBLIC_INTERNAL">Toàn trường (Mọi tài khoản nội bộ)</option>
                              <option value="OFFICERS">Chỉ Ban chủ nhiệm các CLB & Quản trị</option>
                            </>
                          ) : (
                            <>
                              <option value="MEMBERS">Toàn bộ Thành viên CLB</option>
                              <option value="OFFICERS">Chỉ Ban chủ nhiệm CLB</option>
                            </>
                          )}
                        </Select>
                      </FormField>
                    )}
                    <Button
                      size="sm"
                      className="justify-self-end"
                      disabled={busy || !editName.trim() || Boolean(editKeyError)}
                      onClick={() => onSaveEdit(doc)}
                    >
                      {busy ? "Đang lưu…" : "Lưu thay đổi"}
                    </Button>
                  </Section>
                )}

                <Section title="Lịch sử phiên bản bất biến" icon={<History />}>
                  <div className="divide-y divide-border/60 rounded-lg border border-border">
                    {versions.map((v) => (
                      <div key={v.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
                        <div className="min-w-0">
                          <p className="truncate">
                            <b className="font-mono text-primary">v{v.version}</b> · {v.originalName}
                          </p>
                          <p className="font-mono text-[10.5px] text-muted-foreground">
                            {formatDateTime(v.createdAt)} · {formatSize(v.sizeBytes)}
                          </p>
                        </div>
                        <TableRowActions
                          actions={[
                            ...(doc.previewable !== false
                              ? [
                                  {
                                    icon: <Eye />,
                                    label: `Xem v${v.version}`,
                                    onClick: () =>
                                      onPreview({
                                        id: doc.id,
                                        name: `${doc.name} (v${v.version})`,
                                        contentType: v.contentType,
                                        version: v.version,
                                      }),
                                  },
                                ]
                              : []),
                            { icon: <Download />, label: `Tải v${v.version}`, onClick: () => onDownload(doc, v.version) },
                          ]}
                        />
                      </div>
                    ))}
                  </div>
                  {canUploadVersion && (
                    <div className="grid gap-1.5">
                      <FormField
                        label={currentExt ? `Tệp phiên bản mới (.${currentExt})` : "Tệp phiên bản mới"}
                        required
                        error={versionError ?? undefined}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            key={versionInputKey}
                            type="file"
                            accept={currentExt ? `.${currentExt}` : undefined}
                            aria-label={`Chọn tệp phiên bản mới (.${currentExt})`}
                            className="min-w-0 max-w-full text-xs font-normal"
                            onChange={(e) => onVersionFile(e.target.files?.[0] ?? null)}
                          />
                          <Button
                            size="sm"
                            disabled={busy || !versionFile || Boolean(versionError)}
                            onClick={() => onUploadVersion(doc)}
                          >
                            <Upload size={14} /> {busy ? "Đang tải…" : `Tải lên v${doc.version + 1}`}
                          </Button>
                        </div>
                      </FormField>
                    </div>
                  )}
                </Section>
              </>
            )}
          </>
        )
      )}
    </EntityDrawer>
  );
}
