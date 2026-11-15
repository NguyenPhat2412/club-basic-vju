"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileText, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { apiModel, DocumentItem, DocumentVisibility } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DocumentDetailDrawer, visibilityMeta } from "@/components/document/DocumentDetailDrawer";
import { DocumentPreviewModal, PreviewTarget } from "@/components/document/DocumentPreviewModal";
import { DocumentUploadModal } from "@/components/document/DocumentUploadModal";
import { BreadcrumbToolbar, SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { ModalShell } from "@/components/shared/Overlays";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { fileExtension, formatDay, formatSize, saveBlob, validateVaultFile } from "@/lib/utils";

const LIMIT = 20;

export function DocumentsView({ embeddedClubId }: { embeddedClubId?: string } = {}) {
  return (
    <Suspense fallback={<LoadingRows />}>
      <DocumentsViewInner embeddedClubId={embeddedClubId} />
    </Suspense>
  );
}

function DocumentsViewInner({ embeddedClubId }: { embeddedClubId?: string }) {
  const session = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEmbedded = Boolean(embeddedClubId);
  const tier: "club" | "system" = isEmbedded ? "club" : searchParams.get("tier") === "system" ? "system" : "club";
  const [clubId, setClubId] = useState("");
  const [filterDeptId, setFilterDeptId] = useState("");
  const [filterVisibility, setFilterVisibility] = useState<string>("");
  const [trash, setTrash] = useState(false);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [appKey, setAppKey] = useState("");
  const [uploadDeptId, setUploadDeptId] = useState("");
  const [uploadVis, setUploadVis] = useState<DocumentVisibility>("MEMBERS");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<DocumentItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editKey, setEditKey] = useState("");
  const [editVis, setEditVis] = useState<DocumentVisibility>("MEMBERS");
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionInput, setVersionInput] = useState(0);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);

  const clubs = useQuery({
    queryKey: ["clubs", "documents"],
    queryFn: () => apiModel.clubs("", "", 0, 100),
    enabled: session.ready,
  });
  const scope = session.clubsWith(["document.view", "document.upload", "document.update", "document.delete", "document.restore"]);
  const allowed = (clubs.data?.items ?? []).filter((c) => scope.global || scope.ids.has(c.id));
  const effectiveTier = !isEmbedded && tier === "club" && session.ready && !clubs.isPending && !allowed.length ? "system" : tier;
  const isSystemTier = effectiveTier === "system";
  const club = isEmbedded ? (clubs.data?.items ?? []).find((c) => c.id === embeddedClubId) : (allowed.find((c) => c.id === clubId) ?? allowed[0]);
  const activeClubId = isEmbedded ? (embeddedClubId ?? "") : (club?.id ?? "");

  const departmentsQuery = useQuery({
    queryKey: ["departments", "documents", activeClubId],
    queryFn: () => apiModel.departments(activeClubId),
    enabled: !isSystemTier && !!activeClubId && session.canInClub("department.view", activeClubId),
  });
  const deptViewScope = session.departmentsWith(["document.view"], activeClubId);
  const deptUploadScope = session.departmentsWith(["document.upload"], activeClubId);
  const allDepartments = departmentsQuery.data?.items ?? [];
  const viewableDepts = allDepartments.filter((d) => deptViewScope.all || deptViewScope.ids.has(d.id));
  const uploadableDepts = allDepartments.filter((d) => deptUploadScope.all || deptUploadScope.ids.has(d.id));

  const hasGlobal = (key: string) => session.permissions.some((p) => p.permissionKey === key && p.scope === "GLOBAL");
  const canUploadClubWide = session.canClubWide("document.upload", activeClubId);
  const canUpload = isSystemTier ? hasGlobal("document.upload") : canUploadClubWide || uploadableDepts.length > 0;
  const canRestore = isSystemTier ? hasGlobal("document.restore") : session.canInClub("document.restore", activeClubId);
  const canUpdate = isSystemTier ? hasGlobal("document.update") : session.canInClub("document.update", activeClubId);
  const canDelete = isSystemTier ? hasGlobal("document.delete") : session.canInClub("document.delete", activeClubId);
  const effectiveTrash = trash && canRestore;

  const documents = useQuery({
    queryKey: ["documents", effectiveTier, activeClubId, filterDeptId, filterVisibility, search, effectiveTrash, offset],
    queryFn: () =>
      isSystemTier
        ? apiModel.systemDocuments({ name: search, visibility: (filterVisibility || undefined) as DocumentVisibility | undefined, deleted: effectiveTrash, offset, limit: LIMIT })
        : apiModel.documents(activeClubId, { departmentId: filterDeptId || undefined, visibility: (filterVisibility || undefined) as DocumentVisibility | undefined, name: search, deleted: effectiveTrash, offset, limit: LIMIT }),
    enabled: session.ready && (isSystemTier || !!activeClubId),
    placeholderData: keepPreviousData,
  });

  const counts = useQuery({
    queryKey: ["documents", activeClubId, "counts", canRestore],
    queryFn: async () => ({
      live: (await apiModel.documentCount(activeClubId)).count,
      deleted: canRestore ? (await apiModel.documentCount(activeClubId, true)).count : 0,
    }),
    enabled: !isSystemTier && !!activeClubId,
  });

  const detail = useQuery({ queryKey: ["document", detailId], queryFn: () => apiModel.documentDetail(detailId!), enabled: !!detailId });
  const versions = useQuery({ queryKey: ["document", detailId, "versions"], queryFn: () => apiModel.documentVersions(detailId!), enabled: !!detailId && !detail.data?.deleted });

  const resetScopeOverlays = () => {
    setFilterDeptId(""); setFilterVisibility(""); setTrash(false); setOffset(0);
    setDetailId(null); setPreviewTarget(null); setConfirmDeleteDoc(null); setNotice(""); setError("");
  };

  const run = async (action: () => Promise<unknown>, success: string) => {
    if (busy) return false;
    setBusy(true); setError(""); setNotice("");
    try {
      await action();
      setNotice(success);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (detailId) queryClient.invalidateQueries({ queryKey: ["document", detailId] });
      return true;
    } catch (e) {
      setError(describeError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openUploadModal = () => {
    setFile(null); setUploadName(""); setAppKey("");
    const defaultDept = !isSystemTier && !canUploadClubWide && uploadableDepts[0] ? uploadableDepts[0].id : "";
    setUploadDeptId(defaultDept);
    setUploadVis(isSystemTier ? "PUBLIC_INTERNAL" : defaultDept ? "DEPARTMENT_ONLY" : "MEMBERS");
    setUploading(true);
  };

  const submitUpload = async () => {
    if (!file) return;
    const validationErr = validateVaultFile(file);
    if (validationErr) { setError(validationErr); return; }
    const ok = await run(
      () => isSystemTier
        ? apiModel.uploadSystemDocument(file, { name: uploadName.trim() || undefined, appDetailKey: appKey.trim() || undefined, visibility: uploadVis })
        : apiModel.uploadDocument(activeClubId, file, uploadName.trim(), appKey.trim(), { departmentId: uploadDeptId || undefined, visibility: uploadDeptId ? "DEPARTMENT_ONLY" : uploadVis }),
      `Đã lưu "${uploadName.trim() || file.name}" vào Kho lưu trữ tập trung.`
    );
    if (ok) setUploading(false);
  };

  const openDetail = (doc: DocumentItem) => {
    setDetailId(doc.id);
    setEditName(doc.name);
    setEditKey(doc.appDetailKey ?? "");
    setEditVis(doc.visibility ?? (doc.scope === "SYSTEM" ? "PUBLIC_INTERNAL" : "MEMBERS"));
    setVersionFile(null);
  };

  const download = (doc: DocumentItem, version?: number) =>
    run(async () => saveBlob(await apiModel.downloadDocument(doc.id, version), doc.name), `Đã tải ${doc.name}${version ? ` (v${version})` : ""}`);

  const confirmSoftDelete = async () => {
    if (!confirmDeleteDoc) return;
    const target = confirmDeleteDoc;
    const ok = await run(() => apiModel.deleteDocument(target.id), `Đã chuyển "${target.name}" vào thùng rác.`);
    if (ok) {
      setConfirmDeleteDoc(null);
      if (detailId === target.id) setDetailId(null);
    }
  };

  const restore = (doc: DocumentItem) =>
    run(() => apiModel.restoreDocument(doc.id), `Đã khôi phục "${doc.name}".`).then((ok) => ok && setDetailId(null));

  const saveEdit = (doc: DocumentItem) =>
    run(
      () => apiModel.updateDocument(doc.id, { name: editName.trim(), appDetailKey: editKey.trim(), visibility: doc.scope === "DEPARTMENT" || !canUpdate ? undefined : editVis }),
      "Đã lưu thay đổi tài liệu."
    );

  const uploadVersion = async (doc: DocumentItem) => {
    if (!versionFile) return;
    const err = validateVaultFile(versionFile, fileExtension(doc.name, doc.contentType));
    if (err) {
      setError(err);
      return;
    }
    if (await run(() => apiModel.uploadDocumentVersion(doc.id, versionFile, doc.version), `Đã thêm phiên bản v${doc.version + 1}.`)) {
      setVersionFile(null);
      setVersionInput((k) => k + 1);
    }
  };

  const body = (
    <>
      {!isEmbedded && (
        <BreadcrumbToolbar
          crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Tài liệu & Quy chế" }, { label: isSystemTier ? "Quy chế & Biểu mẫu Trường" : "Kho tài liệu CLB & Ban" }]}
          titleBadge={<CountBadge>{documents.data?.total ?? 0}</CountBadge>}
          search={{ value: search, onChange: (v) => { setSearch(v); setOffset(0); }, placeholder: "Tìm theo tên tài liệu…" }}
          extraActions={
            <SegmentedTabs
              value={effectiveTier}
              onChange={(v) => { router.replace(`${pathname}?tier=${v}`, { scroll: false }); resetScopeOverlays(); }}
              options={[...(allowed.length ? [{ value: "club", label: "Kho CLB & Ban" }] : []), { value: "system", label: "Quy chế Trường" }]}
            />
          }
          onRefresh={() => { documents.refetch(); counts.refetch(); }}
          addLabel="Tải lên"
          onAdd={canUpload && !effectiveTrash ? openUploadModal : undefined}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-card px-4 py-1.5 sm:px-6">
        {isEmbedded && (
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder="Tìm theo tên tài liệu…" className="h-8 pl-8 text-xs" />
          </div>
        )}
        {!isSystemTier && (
          <>
            {!isEmbedded && (
              <Select aria-label="Chọn CLB" value={activeClubId} onChange={(e) => { setClubId(e.target.value); resetScopeOverlays(); }} className="h-8 w-full text-xs sm:w-52">
                {allowed.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
              </Select>
            )}
            {viewableDepts.length > 0 && (
              <Select aria-label="Lọc theo Ban" value={filterDeptId} onChange={(e) => { setFilterDeptId(e.target.value); setOffset(0); }} className="h-8 w-full text-xs sm:w-36">
                <option value="">Tất cả phạm vi</option>
                {viewableDepts.map((dep) => <option key={dep.id} value={dep.id}>Ban: {dep.name}</option>)}
              </Select>
            )}
          </>
        )}
        <Select aria-label="Lọc mức hiển thị" value={filterVisibility} onChange={(e) => { setFilterVisibility(e.target.value); setOffset(0); }} className="h-8 w-full text-xs sm:w-36">
          <option value="">Mọi mức hiển thị</option>
          {isSystemTier ? (
            <>
              <option value="PUBLIC_INTERNAL">Toàn trường</option>
              <option value="OFFICERS">Ban chủ nhiệm</option>
            </>
          ) : (
            <>
              <option value="MEMBERS">Thành viên CLB</option>
              <option value="OFFICERS">Ban chủ nhiệm</option>
              <option value="DEPARTMENT_ONLY">Nội bộ Ban</option>
            </>
          )}
        </Select>
        <div className="flex items-center gap-2 sm:ml-auto">
          {canRestore && (
            <SegmentedTabs
              value={effectiveTrash ? "trash" : "live"}
              onChange={(v) => { setTrash(v === "trash"); setOffset(0); }}
              options={[{ value: "live", label: "Đang dùng" }, { value: "trash", label: isSystemTier ? "Thùng rác" : `Thùng rác (${counts.data?.deleted ?? 0})` }]}
            />
          )}
          {isEmbedded && canUpload && !effectiveTrash && (
            <Button size="sm" onClick={openUploadModal} className="h-8"><Plus size={14} /> Tải lên</Button>
          )}
        </div>
      </div>

      {notice && <Notice tone="success">{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {!session.ready || clubs.isPending || documents.isPending ? (
        <LoadingRows />
      ) : documents.isError ? (
        <ErrorState message={describeError(documents.error)} onRetry={() => documents.refetch()} />
      ) : !documents.data.items.length ? (
        <EmptyState
          icon={<FileText />}
          title={effectiveTrash ? "Thùng rác trống" : "Chưa có tài liệu nào"}
          description={effectiveTrash ? undefined : "Mọi tệp tải lên được sở hữu tập trung bởi kho lưu trữ hệ thống, chống thất lạc qua các nhiệm kỳ Ban chủ nhiệm."}
          actionLabel={!effectiveTrash && canUpload ? "Tải lên tài liệu" : undefined}
          onAction={openUploadModal}
        />
      ) : (
        <DataTable
          ariaLabel="Tài liệu"
          minWidth="min-w-[820px]"
          rows={documents.data.items}
          rowKey={(x) => x.id}
          onRowClick={openDetail}
          columns={[
            { key: "date", header: "Ngày tải lên", render: (x) => <span className="font-mono font-bold text-primary">{formatDay(x.createdAt)}</span> },
            { key: "name", header: "Tên tài liệu", className: "max-w-[260px]", render: (x) => <p className="truncate font-bold">{x.name}</p> },
            { key: "visibility", header: "Phạm vi", render: (x) => { const vis = visibilityMeta(x); return <Badge tone={vis.tone}>{vis.label}</Badge>; } },
            {
              key: "type",
              header: "Định dạng",
              render: (x) => (
                <div className="flex items-center gap-1.5">
                  <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase">{fileExtension(x.name, x.contentType)}</span>
                  <span className="font-mono text-xs font-bold text-primary">v{x.version}</span>
                </div>
              ),
            },
            { key: "size", header: "Kích thước", render: (x) => <span className="font-mono">{formatSize(x.sizeBytes)}</span> },
            { key: "key", header: "Phân loại", render: (x) => x.appDetailKey ? <Badge tone="primary" dot={false}>{x.appDetailKey}</Badge> : <span className="text-muted-foreground">—</span> },
            {
              key: "actions",
              header: "Thao tác",
              className: "text-right",
              render: (x) => (
                <TableRowActions
                  actions={
                    x.deleted
                      ? [
                          { icon: <Eye />, label: "Xem chi tiết", onClick: () => openDetail(x) },
                          ...(canRestore ? [{ icon: <RotateCcw />, label: "Khôi phục", onClick: () => restore(x) }] : []),
                        ]
                      : [
                          ...(x.previewable !== false
                            ? [{ icon: <Eye />, label: "Xem trực tuyến", onClick: () => setPreviewTarget({ id: x.id, name: x.name, contentType: x.contentType }) }]
                            : []),
                          { icon: <Download />, label: "Tải xuống", onClick: () => download(x) },
                          { icon: <Pencil />, label: canUpdate ? "Chi tiết & Sửa" : "Chi tiết", onClick: () => openDetail(x) },
                          ...(canDelete || x.ownerId === session.user?.id
                            ? [{ icon: <Trash2 />, label: "Xoá mềm", danger: true, onClick: () => setConfirmDeleteDoc(x) }]
                            : []),
                        ]
                  }
                />
              ),
            },
          ]}
        />
      )}
      {documents.data && documents.data.total > 0 && <Pagination offset={offset} limit={LIMIT} total={documents.data.total} onOffset={setOffset} />}

      <DocumentUploadModal
        open={uploading} submitting={busy} isSystemTier={isSystemTier} clubCode={club?.code}
        canUploadClubWide={canUploadClubWide} uploadableDepts={uploadableDepts} file={file} onFile={setFile}
        uploadDeptId={uploadDeptId} onUploadDeptId={setUploadDeptId} uploadVis={uploadVis} onUploadVis={setUploadVis}
        uploadName={uploadName} onUploadName={setUploadName} appKey={appKey} onAppKey={setAppKey}
        onClose={() => setUploading(false)} onSubmit={submitUpload}
      />

      <DocumentDetailDrawer
        open={!!detailId} busy={busy} subtitle={detail.data?.scope === "SYSTEM" ? "Kho Văn bản Hệ thống VJU" : club?.name}
        loading={detail.isPending} doc={detail.data} versions={versions.data ?? []}
        canUpdate={canUpdate || detail.data?.ownerId === session.user?.id} canChangeVisibility={canUpdate}
        canUploadVersion={canUpload} canDelete={canDelete || detail.data?.ownerId === session.user?.id} canRestore={canRestore}
        editName={editName} onEditName={setEditName} editKey={editKey} onEditKey={setEditKey}
        editVisibility={editVis} onEditVisibility={setEditVis} versionFile={versionFile} versionInputKey={versionInput}
        onVersionFile={setVersionFile} onClose={() => setDetailId(null)} onPreview={setPreviewTarget} onDownload={download}
        onSoftDelete={setConfirmDeleteDoc} onRestore={restore} onSaveEdit={saveEdit} onUploadVersion={uploadVersion}
      />

      <ModalShell
        open={!!confirmDeleteDoc} onClose={() => setConfirmDeleteDoc(null)} title="Chuyển tài liệu vào thùng rác"
        icon={<Trash2 />} size="sm" onSubmit={confirmSoftDelete} submitLabel="Chuyển vào thùng rác" submitDanger submitLoading={busy}
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          Bạn có chắc muốn chuyển tài liệu <b className="text-foreground">{confirmDeleteDoc?.name}</b> vào thùng rác? Tệp vật lý trong Kho lưu trữ tập trung vẫn được bảo toàn nguyên vẹn để Ban chủ nhiệm hoặc Quản trị viên khôi phục bất cứ lúc nào.
        </p>
      </ModalShell>

      <DocumentPreviewModal
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
        onDownload={(t) => run(async () => saveBlob(await apiModel.downloadDocument(t.id, t.version), t.name), `Đã tải ${t.name}`)}
      />
    </>
  );

  return isEmbedded ? <div className="flex flex-col">{body}</div> : <ListPage title="Kho tài liệu tập trung">{body}</ListPage>;
}
