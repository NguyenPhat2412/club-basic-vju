"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, FileText, Trash2 } from "lucide-react";
import { apiModel, Club, DocumentItem, DocumentVisibility } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { useSession } from "@/hooks/useSession";
import { useActiveUnit } from "@/hooks/useActiveUnit";
import {
  collectDocumentCategoryOptions,
  type DocumentFormatFilter,
  type DocumentSortOption,
  filterAndSortDocuments,
} from "@/forms/document/document-filter-meta";
import { DocumentDetailDrawer } from "@/components/document/DocumentDetailDrawer";
import { DocumentFilterBar } from "@/components/document/DocumentFilterBar";
import { DocumentPreviewModal, PreviewTarget } from "@/components/document/DocumentPreviewModal";
import { DocumentTable } from "@/components/document/DocumentTable";
import { DocumentUploadModal } from "@/components/document/DocumentUploadModal";
import { VjuAdminFormsCard } from "@/components/document/VjuAdminFormsCard";
import { ClubUsageQuotaCard } from "@/components/management/ClubUsageQuotaCard";
import { SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { ModalShell } from "@/components/shared/Overlays";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { fileExtension, saveBlob, validateVaultFile } from "@/lib/utils";

const LIMIT = 20;

export function DocumentsViewContent({
  isEmbedded,
  effectiveTier,
  isSystemTier,
  clubsPending,
  allClubs,
  allowed,
  club,
  activeClubId,
}: {
  isEmbedded: boolean;
  effectiveTier: "club" | "system";
  isSystemTier: boolean;
  clubsPending: boolean;
  allClubs: Club[];
  allowed: Club[];
  club?: Club;
  activeClubId: string;
}) {
  const session = useSession();
  const unitCtx = useActiveUnit();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const [scopeFilter, setScopeFilter] = useState("");
  const [filterVisibility, setFilterVisibility] = useState<string>("");
  const [formatFilter, setFormatFilter] = useState<DocumentFormatFilter>("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState<DocumentSortOption>("newest");
  const [trash, setTrash] = useState(false);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [pageLimit, setPageLimit] = useState(LIMIT);
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

  const departmentsQuery = useQuery({
    queryKey: qk.departments(activeClubId),
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
  const isClubOfficer = hasGlobal("document.view") || canDelete || canRestore;
  const officerScope = session.clubsWith(["event.create", "event.update", "document.delete", "document.restore", "club.update"]);
  const manageableClubs = allClubs.filter((c) => officerScope.global || officerScope.ids.has(c.id));
  const canManageAnyClub = manageableClubs.length > 0;
  const effectiveTrash = trash && canRestore;

  const effectiveScopeFilter = scopeFilter === "__CLUB_ONLY__" || viewableDepts.some((d) => d.id === scopeFilter) ? scopeFilter : "";
  const hasClientRefine = effectiveScopeFilter === "__CLUB_ONLY__" || Boolean(formatFilter) || sortBy !== "newest";
  const serverDeptId = effectiveScopeFilter && effectiveScopeFilter !== "__CLUB_ONLY__" ? effectiveScopeFilter : undefined;
  const queryOffset = hasClientRefine ? 0 : offset;
  const queryLimit = hasClientRefine ? 100 : pageLimit;

  const documents = useQuery({
    queryKey: qk.documents(effectiveTier, activeClubId, serverDeptId ?? "", filterVisibility, categoryFilter, search, effectiveTrash, queryOffset, queryLimit),
    queryFn: () =>
      isSystemTier
        ? apiModel.systemDocuments({
            name: search || undefined,
            appDetailKey: categoryFilter || undefined,
            visibility: (filterVisibility || undefined) as DocumentVisibility | undefined,
            deleted: effectiveTrash,
            offset: queryOffset,
            limit: queryLimit,
          })
        : apiModel.documents(activeClubId, {
            departmentId: serverDeptId,
            visibility: (filterVisibility || undefined) as DocumentVisibility | undefined,
            name: search || undefined,
            appDetailKey: categoryFilter || undefined,
            deleted: effectiveTrash,
            offset: queryOffset,
            limit: queryLimit,
          }),
    enabled: session.ready && (isSystemTier || !!activeClubId),
    placeholderData: keepPreviousData,
  });

  const counts = useQuery({
    queryKey: qk.documents(activeClubId, "counts", canRestore),
    queryFn: async () => ({
      live: (await apiModel.documentCount(activeClubId)).count,
      deleted: canRestore ? (await apiModel.documentCount(activeClubId, true)).count : 0,
    }),
    enabled: !isSystemTier && !!activeClubId,
  });

  const detail = useQuery({ queryKey: qk.document(detailId), queryFn: () => apiModel.documentDetail(detailId!), enabled: !!detailId });
  const versions = useQuery({ queryKey: qk.document(detailId, "versions"), queryFn: () => apiModel.documentVersions(detailId!), enabled: !!detailId && !detail.data?.deleted });

  const rawItems = useMemo(() => documents.data?.items ?? [], [documents.data?.items]);
  const categoryOptions = useMemo(
    () => collectDocumentCategoryOptions(rawItems, categoryFilter, isSystemTier),
    [rawItems, categoryFilter, isSystemTier]
  );
  const refinedItems = useMemo(
    () => filterAndSortDocuments(rawItems, { scopeFilter: effectiveScopeFilter, formatFilter, sortBy }),
    [rawItems, effectiveScopeFilter, formatFilter, sortBy]
  );
  const visibleRows = hasClientRefine ? refinedItems.slice(offset, offset + pageLimit) : refinedItems;
  const effectiveTotal = hasClientRefine ? refinedItems.length : (documents.data?.total ?? 0);

  const resetFiltersOnly = () => {
    setSearch(""); setScopeFilter(""); setFilterVisibility("");
    setFormatFilter(""); setCategoryFilter(""); setSortBy("newest"); setOffset(0);
  };

  const resetScopeOverlays = () => {
    resetFiltersOnly();
    setTrash(false); setDetailId(null); setPreviewTarget(null);
    setConfirmDeleteDoc(null); setNotice(""); setError("");
  };

  const run = async (action: () => Promise<unknown>, success: string) => {
    if (busy) return false;
    setBusy(true); setError(""); setNotice("");
    try {
      await action();
      setNotice(success);
      queryClient.invalidateQueries({ queryKey: qk.documents() });
      if (activeClubId) queryClient.invalidateQueries({ queryKey: qk.clubUsage(activeClubId) });
      if (detailId) queryClient.invalidateQueries({ queryKey: qk.document(detailId) });
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
    if (err) { setError(err); return; }
    if (await run(() => apiModel.uploadDocumentVersion(doc.id, versionFile, doc.version), `Đã thêm phiên bản v${doc.version + 1}.`)) {
      setVersionFile(null);
      setVersionInput((k) => k + 1);
    }
  };

  const body = (
    <>
      <DocumentFilterBar
        isEmbedded={isEmbedded} isSystemTier={isSystemTier} allowedClubs={allowed} activeClubId={activeClubId}
        onChangeClub={(nextId) => { unitCtx.setActiveUnitId(nextId); resetScopeOverlays(); }} viewableDepts={viewableDepts}
        scopeFilter={effectiveScopeFilter} onChangeScope={(v) => { setScopeFilter(v); setOffset(0); }}
        visibilityFilter={filterVisibility} onChangeVisibility={(v) => { setFilterVisibility(v); setOffset(0); }}
        formatFilter={formatFilter} onChangeFormat={(v) => { setFormatFilter(v); setOffset(0); }}
        categoryFilter={categoryFilter} categoryOptions={categoryOptions} onChangeCategory={(v) => { setCategoryFilter(v); setOffset(0); }}
        sortBy={sortBy} onChangeSort={(v) => { setSortBy(v); setOffset(0); }}
        search={search} onChangeSearch={(v) => { setSearch(v); setOffset(0); }}
        canRestore={canRestore} effectiveTrash={effectiveTrash} deletedCount={counts.data?.deleted ?? 0}
        onChangeTrash={(nextTrash) => { setTrash(nextTrash); setOffset(0); }}
        canUpload={canUpload} onOpenUpload={openUploadModal}
        onResetFilters={resetFiltersOnly}
        tierSlot={
          !isEmbedded ? (
            <SegmentedTabs
              value={effectiveTier}
              onChange={(v) => { router.replace(`${pathname}?tier=${v}`, { scroll: false }); resetScopeOverlays(); }}
              options={[...(allowed.length ? [{ value: "club", label: "Kho CLB & Ban" }] : []), { value: "system", label: "Quy chế Trường" }]}
            />
          ) : (
            <Link
              href="/documents?tier=system"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-white px-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-primary"
              title="Quy chế & Biểu mẫu Trường"
            >
              <BookOpen size={13} className="shrink-0 text-primary" />
              <span className="hidden 2xl:inline">Quy chế</span>
            </Link>
          )
        }
      />

      {!isSystemTier && activeClubId && <ClubUsageQuotaCard clubId={activeClubId} compact />}

      {(isSystemTier || (isEmbedded && canManageAnyClub)) && (
        <VjuAdminFormsCard
          clubs={manageableClubs} defaultClubId={activeClubId} canManageAnyClub={canManageAnyClub}
          requester={session.user ? { fullName: session.user.fullName, studentCode: session.user.studentCode, email: session.user.email } : undefined}
        />
      )}
      {notice && <Notice tone="success">{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {!session.ready || clubsPending || documents.isPending ? (
        <LoadingRows />
      ) : documents.isError ? (
        <ErrorState message={describeError(documents.error)} onRetry={() => documents.refetch()} />
      ) : !visibleRows.length ? (
        <EmptyState
          icon={<FileText />}
          title={effectiveTrash ? "Thùng rác trống" : rawItems.length > 0 ? "Không tìm thấy tài liệu khớp bộ lọc" : "Chưa có tài liệu nào"}
          description={effectiveTrash ? undefined : rawItems.length > 0 ? "Hãy thử xoá bớt điều kiện lọc định dạng hoặc từ khoá tìm kiếm." : "Mọi tệp tải lên được sở hữu tập trung bởi kho lưu trữ hệ thống, chống thất lạc qua các nhiệm kỳ Ban chủ nhiệm."}
          actionLabel={!effectiveTrash && rawItems.length > 0 ? "Xoá bộ lọc" : !effectiveTrash && canUpload ? "Tải lên tài liệu" : undefined}
          onAction={rawItems.length > 0 ? resetFiltersOnly : openUploadModal}
        />
      ) : (
        <DocumentTable
          rows={visibleRows} offset={offset} currentUserId={session.user?.id}
          canUpdate={canUpdate} canDelete={canDelete} canRestore={canRestore}
          onOpenDetail={openDetail} onPreview={setPreviewTarget} onDownload={download}
          onSoftDelete={setConfirmDeleteDoc} onRestore={restore}
        />
      )}
      {effectiveTotal > 0 && <Pagination offset={offset} limit={pageLimit} total={effectiveTotal} onOffset={setOffset} onLimit={setPageLimit} />}

      <DocumentUploadModal
        open={uploading} submitting={busy} isSystemTier={isSystemTier} isClubOfficer={isClubOfficer} clubCode={club?.code}
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

  return isEmbedded ? <div className="flex flex-1 flex-col">{body}</div> : <ListPage title="Kho tài liệu tập trung">{body}</ListPage>;
}
