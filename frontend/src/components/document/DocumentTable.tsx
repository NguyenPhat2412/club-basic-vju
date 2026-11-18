"use client";

import { Download, Eye, FileText, Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { DocumentItem } from "@/lib/api";
import { formatDocumentCategoryLabel } from "@/forms/document/document-filter-meta";
import { visibilityMeta } from "@/components/document/DocumentDetailDrawer";
import type { PreviewTarget } from "@/components/document/DocumentPreviewModal";
import { DataTable } from "@/components/shared/DataTable";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { Badge } from "@/components/ui/badge";
import { fileExtension, formatDay, formatSize } from "@/lib/utils";

export function DocumentTable({
  rows,
  offset,
  currentUserId,
  canUpdate,
  canDelete,
  canRestore,
  onOpenDetail,
  onPreview,
  onDownload,
  onSoftDelete,
  onRestore,
}: {
  rows: DocumentItem[];
  offset: number;
  currentUserId?: string;
  canUpdate: boolean;
  canDelete: boolean;
  canRestore: boolean;
  onOpenDetail: (doc: DocumentItem) => void;
  onPreview: (target: PreviewTarget) => void;
  onDownload: (doc: DocumentItem) => void;
  onSoftDelete: (doc: DocumentItem) => void;
  onRestore: (doc: DocumentItem) => void;
}) {
  return (
    <DataTable
      ariaLabel="Tài liệu"
      alwaysTable
      minWidth="min-w-[720px]"
      rows={rows}
      rowKey={(x) => x.id}
      onRowClick={onOpenDetail}
      columns={[
        {
          key: "index",
          header: "STT",
          className: "w-10 text-center font-mono text-muted-foreground",
          render: (x) => <span>{offset + rows.indexOf(x) + 1}</span>,
        },
        {
          key: "name",
          header: "Tên tài liệu",
          className: "w-[30%] min-w-[190px] max-w-[260px]",
          sortValue: (x) => x.name,
          render: (x) => (
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/8 text-primary">
                <FileText size={15} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground" title={x.name}>
                  {x.name}
                </p>
                {x.departmentName && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    Ban: {x.departmentName}
                  </p>
                )}
              </div>
            </div>
          ),
        },
        {
          key: "key",
          header: "Phân loại",
          className: "whitespace-nowrap",
          sortValue: (x) => formatDocumentCategoryLabel(x.appDetailKey),
          render: (x) =>
            x.appDetailKey ? (
              <Badge tone="primary" dot={false}>
                {formatDocumentCategoryLabel(x.appDetailKey)}
              </Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
        {
          key: "type",
          header: "Định dạng",
          className: "whitespace-nowrap",
          sortValue: (x) => fileExtension(x.name, x.contentType),
          render: (x) => {
            const ext = fileExtension(x.name, x.contentType);
            const displayExt = ext === "file" && x.path ? fileExtension(x.path, x.contentType) : ext;
            return (
              <div className="flex items-center gap-1.5">
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase">
                  {displayExt}
                </span>
                <span className="font-mono text-xs font-bold text-primary">v{x.version}</span>
              </div>
            );
          },
        },
        {
          key: "visibility",
          header: "Phạm vi",
          className: "whitespace-nowrap",
          sortValue: (x) => visibilityMeta(x).label,
          render: (x) => {
            const vis = visibilityMeta(x);
            return <Badge tone={vis.tone}>{vis.label}</Badge>;
          },
        },
        {
          key: "size",
          header: "Kích thước",
          className: "whitespace-nowrap font-mono",
          sortValue: (x) => x.sizeBytes,
          render: (x) => <span>{formatSize(x.sizeBytes)}</span>,
        },
        {
          key: "date",
          header: "Ngày tải lên",
          className: "whitespace-nowrap font-mono text-muted-foreground",
          sortValue: (x) => x.createdAt,
          render: (x) => <span>{formatDay(x.createdAt)}</span>,
        },
        {
          key: "actions",
          header: "Thao tác",
          className: "text-right whitespace-nowrap",
          render: (x) => (
            <TableRowActions
              actions={
                x.deleted
                  ? [
                      { icon: <Eye />, label: "Xem chi tiết", onClick: () => onOpenDetail(x) },
                      ...(canRestore
                        ? [{ icon: <RotateCcw />, label: "Khôi phục", onClick: () => onRestore(x) }]
                        : []),
                    ]
                  : [
                      ...(x.previewable !== false
                        ? [
                            {
                              icon: <Eye />,
                              label: "Xem trực tuyến",
                              onClick: () =>
                                onPreview({
                                  id: x.id,
                                  name: x.name,
                                  contentType: x.contentType,
                                }),
                            },
                          ]
                        : []),
                      { icon: <Download />, label: "Tải xuống", onClick: () => onDownload(x) },
                      {
                        icon: <Pencil />,
                        label: canUpdate ? "Chi tiết & Sửa" : "Chi tiết",
                        onClick: () => onOpenDetail(x),
                      },
                      ...(canDelete || x.ownerId === currentUserId
                        ? [
                            {
                              icon: <Trash2 />,
                              label: "Xoá mềm",
                              danger: true,
                              onClick: () => onSoftDelete(x),
                            },
                          ]
                        : []),
                    ]
              }
            />
          ),
        },
      ]}
    />
  );
}
