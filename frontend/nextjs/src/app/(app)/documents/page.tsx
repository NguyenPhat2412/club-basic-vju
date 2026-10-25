"use client";
import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileText, History, Link2, Pencil, RotateCcw, Trash2, Upload } from "lucide-react";
import { apiModel, DocumentItem } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { BreadcrumbToolbar, SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { formatDateTime, formatDay, formatSize, formatTime } from "@/lib/utils";

const LIMIT = 20;
const ext = (name: string) => name.slice(name.lastIndexOf(".") + 1).toUpperCase();

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = fileName; link.click();
  URL.revokeObjectURL(url);
}

export default function DocumentsPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [clubId, setClubId] = useState("");
  const [trash, setTrash] = useState(false);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [appKey, setAppKey] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKey, setEditKey] = useState("");
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionInput, setVersionInput] = useState(0);

  const clubs = useQuery({ queryKey: ["clubs", "documents"], queryFn: () => apiModel.clubs("", "", 0, 100), enabled: session.ready });
  const scope = session.clubsWith(["document.view"]);
  const allowed = (clubs.data?.items ?? []).filter((c) => scope.global || scope.ids.has(c.id));
  const club = allowed.find((c) => c.id === clubId) ?? allowed[0];
  const activeClubId = club?.id ?? "";
  const canRestore = session.canInClub("document.restore", activeClubId);
  const canUpload = session.canInClub("document.upload", activeClubId);

  const documents = useQuery({
    queryKey: ["documents", activeClubId, search, trash, offset],
    queryFn: () => apiModel.documents(activeClubId, { name: search, deleted: trash, offset, limit: LIMIT }),
    enabled: !!activeClubId, placeholderData: keepPreviousData,
  });
  const counts = useQuery({
    queryKey: ["documents", activeClubId, "counts", canRestore],
    queryFn: async () => ({ live: (await apiModel.documentCount(activeClubId)).count, deleted: canRestore ? (await apiModel.documentCount(activeClubId, true)).count : 0 }),
    enabled: !!activeClubId,
  });
  const detail = useQuery({ queryKey: ["document", detailId], queryFn: () => apiModel.documentDetail(detailId!), enabled: !!detailId });
  const versions = useQuery({ queryKey: ["document", detailId, "versions"], queryFn: () => apiModel.documentVersions(detailId!), enabled: !!detailId && !detail.data?.deleted });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["documents", activeClubId] });
  const run = async (action: () => Promise<unknown>, success: string) => {
    setError(""); setNotice("");
    try { await action(); setNotice(success); refresh(); if (detailId) queryClient.invalidateQueries({ queryKey: ["document", detailId] }); return true; }
    catch (e) { setError(describeError(e)); return false; }
  };

  const upload = async () => {
    if (!file) return;
    if (await run(() => apiModel.uploadDocument(activeClubId, file, uploadName.trim(), appKey.trim()), `Đã tải lên ${uploadName.trim() || file.name}`)) {
      setUploading(false); setFile(null); setUploadName(""); setAppKey("");
    }
  };
  const openDetail = (doc: DocumentItem) => { setDetailId(doc.id); setEditName(doc.name); setEditKey(doc.appDetailKey ?? ""); setVersionFile(null); };
  const download = (doc: DocumentItem, version?: number) => run(async () => saveBlob(await apiModel.downloadDocument(doc.id, version), doc.name), `Đã tải ${doc.name}${version ? ` (v${version})` : ""}`);
  const openLink = (doc: DocumentItem) => run(async () => {
    const link = await apiModel.documentDownloadUrl(doc.id);
    if (link.expiresAt) window.open(link.url, "_blank", "noopener"); else saveBlob(await apiModel.downloadDocument(doc.id), doc.name);
  }, `Đã mở link tải ${doc.name}`);
  const softDelete = (doc: DocumentItem) => {
    if (!confirm(`Chuyển "${doc.name}" vào thùng rác? Có thể khôi phục sau.`)) return;
    run(() => apiModel.deleteDocument(doc.id), `Đã chuyển ${doc.name} vào thùng rác`).then((ok) => ok && setDetailId(null));
  };
  const restore = (doc: DocumentItem) => run(() => apiModel.restoreDocument(doc.id), `Đã khôi phục ${doc.name}`).then((ok) => ok && setDetailId(null));
  const saveEdit = (doc: DocumentItem) => run(() => apiModel.updateDocument(doc.id, { name: editName, appDetailKey: editKey }), "Đã lưu thay đổi");
  const uploadVersion = async (doc: DocumentItem) => {
    if (!versionFile) return;
    if (await run(() => apiModel.uploadDocumentVersion(doc.id, versionFile, doc.version), `Đã thêm phiên bản ${doc.version + 1}`)) {
      setVersionFile(null); setVersionInput((k) => k + 1);
    }
  };
  const d = detail.data;

  return (
    <ListPage title="Kho tài liệu">
      <BreadcrumbToolbar crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Quản lý CLB" }, { label: "Kho tài liệu" }]}
        titleBadge={<CountBadge>{documents.data?.total ?? 0}</CountBadge>}
        search={{ value: search, onChange: (v) => { setSearch(v); setOffset(0); }, placeholder: "Tìm theo tên tài liệu…" }}
        extraActions={<>
          <Select aria-label="Chọn CLB" value={activeClubId} onChange={(e) => { setClubId(e.target.value); setOffset(0); }} className="h-10 w-full text-xs sm:w-44">
            {allowed.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
          </Select>
          {canRestore && <SegmentedTabs value={trash ? "trash" : "live"} onChange={(v) => { setTrash(v === "trash"); setOffset(0); }}
            options={[{ value: "live", label: "Đang dùng" }, { value: "trash", label: `Thùng rác (${counts.data?.deleted ?? 0})` }]} />}
        </>}
        onRefresh={() => { documents.refetch(); counts.refetch(); }}
        addLabel="Tải lên" onAdd={canUpload && !trash ? () => setUploading(true) : undefined} />
      {notice && <Notice tone="success">{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {!session.ready || clubs.isPending ? <LoadingRows /> : !allowed.length ? <EmptyState icon={<FileText />} title="Bạn chưa có quyền xem tài liệu của CLB nào" />
        : documents.isPending ? <LoadingRows /> : documents.isError ? <ErrorState message={describeError(documents.error)} onRetry={() => documents.refetch()} />
          : !documents.data.items.length ? <EmptyState icon={<FileText />} title={trash ? "Thùng rác trống" : "Chưa có tài liệu"}
            description={trash ? undefined : "Tài liệu được lưu trên Cloudflare R2 theo thư mục năm / tháng / ngày."}
            actionLabel={!trash && canUpload ? "Tải lên tài liệu" : undefined} onAction={() => setUploading(true)} />
            : <DataTable ariaLabel="Tài liệu" minWidth="min-w-[1080px]" rows={documents.data.items} rowKey={(x) => x.id} onRowClick={openDetail} columns={[
              { key: "date", header: "Ngày tải lên", render: (x) => <span className="font-mono font-bold text-primary">{formatDay(x.createdAt)}</span> },
              { key: "name", header: "Tên tài liệu", className: "max-w-[300px]", render: (x) => <div className="min-w-0"><p className="truncate font-bold">{x.name}</p><p className="truncate font-mono text-[10.5px] text-muted-foreground">{x.path}</p></div> },
              { key: "type", header: "Loại", render: (x) => <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[10.5px] font-bold">{ext(x.name)}</span> },
              { key: "version", header: "Phiên bản", render: (x) => <span className="font-mono font-bold text-primary">v{x.version}</span> },
              { key: "size", header: "Kích thước", render: (x) => <span className="font-mono">{formatSize(x.sizeBytes)}</span> },
              { key: "key", header: "Ứng dụng", render: (x) => x.appDetailKey ? <Badge tone="primary" dot={false}>{x.appDetailKey}</Badge> : <span className="text-muted-foreground">—</span> },
              { key: "updated", header: trash ? "Ngày xoá" : "Cập nhật", render: (x) => { const t = trash ? x.deletedAt : x.updatedAt; return <span className="font-mono">{formatDay(t)} <span className="text-muted-foreground">{formatTime(t)}</span></span>; } },
              { key: "status", header: "Trạng thái", render: (x) => x.deleted ? <Badge tone="danger">Đã xoá</Badge> : <Badge tone="primary">Đang dùng</Badge> },
              { key: "actions", header: "Thao tác", className: "text-right", render: (x) => <TableRowActions actions={x.deleted
                ? [{ icon: <Eye />, label: "Xem chi tiết", onClick: () => openDetail(x) }, { icon: <RotateCcw />, label: "Khôi phục", onClick: () => restore(x) }]
                : [
                  { icon: <Eye />, label: "Xem chi tiết", onClick: () => openDetail(x) },
                  { icon: <Download />, label: "Tải xuống", onClick: () => download(x) },
                  { icon: <Link2 />, label: "Mở link R2", onClick: () => openLink(x) },
                  { icon: <Pencil />, label: "Sửa", onClick: () => openDetail(x) },
                  { icon: <Trash2 />, label: "Xoá mềm", danger: true, onClick: () => softDelete(x) },
                ]} /> },
            ]} />}
      {documents.data && documents.data.total > 0 && <Pagination offset={offset} limit={LIMIT} total={documents.data.total} onOffset={setOffset} />}

      <ModalShell open={uploading} onClose={() => setUploading(false)} title="Tải lên tài liệu" icon={<Upload />} onSubmit={upload} submitLabel="Tải lên" submitDisabled={!file}>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/25 bg-primary/5 px-4 py-6 text-center text-sm text-primary">
          <Upload size={22} />
          <span className="font-semibold">{file ? `${file.name} · ${formatSize(file.size)}` : "Chọn file để tải lên"}</span>
          <input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <FormField label="Tên hiển thị" hint="Bỏ trống để dùng tên file"><Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} /></FormField>
        <FormField label="appDetailKey" hint="Ví dụ: club.rules"><Input value={appKey} onChange={(e) => setAppKey(e.target.value)} /></FormField>
        <p className="text-xs text-muted-foreground">pdf, doc(x), xls(x), ppt(x), txt, csv, md, png, jpg, gif, webp, zip · tối đa 20 MB · lưu vào {club?.code}</p>
      </ModalShell>

      <EntityDrawer open={!!detailId} onClose={() => setDetailId(null)} title={d?.name ?? "Chi tiết tài liệu"} subtitle={club?.name} icon={<FileText />}
        footer={d && (d.deleted
          ? (canRestore ? <Button size="sm" onClick={() => restore(d)}><RotateCcw size={14} /> Khôi phục</Button> : undefined)
          : <>
            <Button variant="outline" size="sm" onClick={() => download(d)}><Download size={14} /> Tải xuống</Button>
            <Button variant="outline" size="sm" onClick={() => openLink(d)}><Link2 size={14} /> Link R2</Button>
            <Button variant="destructive" size="sm" onClick={() => softDelete(d)}><Trash2 size={14} /> Xoá mềm</Button>
          </>)}>
        {detail.isPending ? <LoadingRows rows={4} /> : d && <>
          <DetailList rows={[
            ["Trạng thái", d.deleted ? <Badge key="s" tone="danger">Đã xoá {formatDateTime(d.deletedAt)}</Badge> : <Badge key="s" tone="primary">Đang dùng</Badge>],
            ["Đường dẫn R2", <span key="p" className="font-mono text-xs">{d.path}</span>],
            ["Phiên bản", <span key="v" className="font-mono font-bold text-primary">v{d.version}</span>],
            ["Loại", d.contentType.split(";")[0]],
            ["Kích thước", <span key="z" className="font-mono">{formatSize(d.sizeBytes)}</span>],
            ["appDetailKey", d.appDetailKey || "—"],
            ["SHA-256", <span key="h" className="break-all font-mono text-[11px]">{d.checksumSha256}</span>],
            ["Tạo lúc", formatDateTime(d.createdAt)],
            ["Cập nhật", formatDateTime(d.updatedAt)],
          ]} />
          {!d.deleted && <>
            <Section title="Sửa thông tin" icon={<Pencil />}>
              <FormField label="Tên tài liệu"><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></FormField>
              <FormField label="appDetailKey" hint="Bỏ trống để xoá"><Input value={editKey} onChange={(e) => setEditKey(e.target.value)} /></FormField>
              <Button size="sm" className="justify-self-end" onClick={() => saveEdit(d)}>Lưu thay đổi</Button>
            </Section>
            <Section title="Lịch sử phiên bản" icon={<History />}>
              <div className="divide-y divide-border/60 rounded-lg border border-border">
                {(versions.data ?? []).map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
                    <div className="min-w-0"><p className="truncate"><b className="font-mono text-primary">v{v.version}</b> · {v.originalName}</p><p className="font-mono text-[10.5px] text-muted-foreground">{formatDateTime(v.createdAt)} · {formatSize(v.sizeBytes)}</p></div>
                    <TableRowActions actions={[{ icon: <Download />, label: `Tải v${v.version}`, onClick: () => download(d, v.version) }]} />
                  </div>
                ))}
              </div>
              {canUpload && <div className="flex flex-wrap items-center gap-2">
                <input key={versionInput} type="file" className="min-w-0 max-w-full text-xs" onChange={(e) => setVersionFile(e.target.files?.[0] ?? null)} />
                <Button size="sm" disabled={!versionFile} onClick={() => uploadVersion(d)}><Upload size={14} /> Tải lên v{d.version + 1}</Button>
              </div>}
            </Section>
          </>}
        </>}
      </EntityDrawer>
    </ListPage>
  );
}
