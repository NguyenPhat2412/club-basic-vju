"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, apiModel, Club, DocumentItem, DocumentVersion, Page } from "@/lib/api";
import { Shell } from "@/components/Shell";
import { CloseIcon, DownloadIcon, EditIcon, EyeIcon, FolderIcon, LayersIcon, LinkIcon, PlusIcon, RefreshIcon, RestoreIcon, SearchIcon, TrashIcon, UploadIcon } from "@/components/Icons";

const PAGE_SIZE = 10;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const formatDay = (value?: string) => value ? new Date(value).toLocaleDateString("sv-SE") : "";
const formatTime = (value?: string) => value ? new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString("vi-VN") : "—";
const extension = (name: string) => name.slice(name.lastIndexOf(".") + 1).toUpperCase();

function describe(error: unknown) {
  if (error instanceof ApiError) return error.code ? `${error.code}: ${error.message}` : error.message;
  return error instanceof Error ? error.message : "Đã có lỗi xảy ra";
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Documents() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubId, setClubId] = useState("");
  const [trash, setTrash] = useState(false);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<Page<DocumentItem> | null>(null);
  const [counts, setCounts] = useState({ live: 0, deleted: 0 });
  const [canRestore, setCanRestore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [appDetailKey, setAppDetailKey] = useState("");
  const [detail, setDetail] = useState<DocumentItem | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionKey, setVersionKey] = useState(0);
  const [editName, setEditName] = useState("");
  const [editKey, setEditKey] = useState("");

  useEffect(() => {
    Promise.all([apiModel.effectivePermissions(), apiModel.clubs()]).then(([permissions, all]) => {
      const view = permissions.filter(p => p.permissionKey === "document.view");
      const allowed = view.some(p => p.scope === "GLOBAL") ? all.items : all.items.filter(c => view.some(p => p.clubId === c.id));
      setClubs(allowed);
      setCanRestore(permissions.some(p => p.permissionKey === "document.restore"));
      if (allowed.length) setClubId(allowed[0].id);
    }).catch(e => setError(describe(e)));
  }, []);

  const fetchPage = useCallback(() => Promise.all([
    apiModel.documents(clubId, { name: search, deleted: trash, offset, limit: PAGE_SIZE }),
    apiModel.documentCount(clubId),
    canRestore ? apiModel.documentCount(clubId, true).catch(() => ({ count: 0 })) : Promise.resolve({ count: 0 }),
  ]), [clubId, search, trash, offset, canRestore]);

  const load = () => fetchPage().then(([list, live, deleted]) => { setPage(list); setCounts({ live: live.count, deleted: deleted.count }); })
    .catch(e => { setPage(null); setError(describe(e)); });

  useEffect(() => {
    if (!clubId) return;
    let active = true;
    fetchPage().then(([list, live, deleted]) => { if (active) { setPage(list); setCounts({ live: live.count, deleted: deleted.count }); } })
      .catch(e => { if (active) { setPage(null); setError(describe(e)); } });
    return () => { active = false; };
  }, [clubId, fetchPage]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(success); await load(); return true; }
    catch (e) { setError(describe(e)); return false; }
    finally { setBusy(false); }
  };

  const openDetail = async (doc: DocumentItem) => {
    setDetail(doc); setEditName(doc.name); setEditKey(doc.appDetailKey || ""); setVersions([]); setVersionFile(null);
    try { setVersions(await apiModel.documentVersions(doc.id)); } catch (e) { setError(describe(e)); }
  };

  const refreshDetail = async (id: string) => {
    const [doc, list] = await Promise.all([apiModel.documentDetail(id), apiModel.documentVersions(id)]);
    setDetail(doc); setEditName(doc.name); setEditKey(doc.appDetailKey || ""); setVersions(list);
  };

  const upload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const ok = await run(() => apiModel.uploadDocument(clubId, file, uploadName.trim(), appDetailKey.trim()), `Đã tải lên ${uploadName.trim() || file.name}`);
    if (ok) { setFile(null); setUploadName(""); setAppDetailKey(""); setUploadOpen(false); }
  };

  const uploadVersion = async () => {
    if (!detail || !versionFile) return;
    const ok = await run(() => apiModel.uploadDocumentVersion(detail.id, versionFile, detail.version), `Đã thêm phiên bản ${detail.version + 1}`);
    if (ok) { setVersionFile(null); setVersionKey(k => k + 1); await refreshDetail(detail.id); }
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    const ok = await run(() => apiModel.updateDocument(detail.id, { name: editName, appDetailKey: editKey }), "Đã lưu thay đổi");
    if (ok) await refreshDetail(detail.id);
  };

  const download = (doc: DocumentItem, version?: number) =>
    run(async () => saveBlob(await apiModel.downloadDocument(doc.id, version), doc.name), `Đã tải ${doc.name}${version ? ` (v${version})` : ""}`);

  const openLink = (doc: DocumentItem) => run(async () => {
    const link = await apiModel.documentDownloadUrl(doc.id);
    if (link.expiresAt) window.open(link.url, "_blank", "noopener");
    else saveBlob(await apiModel.downloadDocument(doc.id), doc.name);
  }, `Đã mở link tải ${doc.name}`);

  const softDelete = (doc: DocumentItem) => {
    if (!confirm(`Chuyển "${doc.name}" vào thùng rác? Có thể khôi phục sau.`)) return;
    run(() => apiModel.deleteDocument(doc.id), `Đã chuyển ${doc.name} vào thùng rác`).then(ok => { if (ok && detail?.id === doc.id) setDetail(null); });
  };

  const restore = (doc: DocumentItem) => run(() => apiModel.restoreDocument(doc.id), `Đã khôi phục ${doc.name}`).then(ok => { if (ok && detail?.id === doc.id) setDetail(null); });

  const club = clubs.find(c => c.id === clubId);
  const total = page?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.floor(offset / PAGE_SIZE) + 1;
  const switchTab = (deleted: boolean) => { setTrash(deleted); setOffset(0); };

  return <Shell><section className="content wide doc-page">
    <div className="doc-topbar">
      <nav className="breadcrumb"><Link href="/clubs">Trang chủ</Link><span>›</span><span>Câu lạc bộ</span><span>›</span><b>Kho tài liệu</b></nav>
      <div className="doc-topbar-actions">
        <label className="doc-search"><SearchIcon /><input placeholder="Tìm theo tên tài liệu…" value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }} /></label>
        <select className="doc-select" value={clubId} onChange={e => { setClubId(e.target.value); setOffset(0); setDetail(null); }} aria-label="Chọn CLB">
          {clubs.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
        </select>
        <button className="icon-button" title="Tải lại" onClick={() => { setNotice(""); setError(""); load(); }}><RefreshIcon /></button>
        <button className="vju-button" disabled={!clubId || trash} onClick={() => setUploadOpen(true)}><PlusIcon /> Tải lên tài liệu</button>
      </div>
    </div>

    {error && <div className="error">{error}</div>}
    {notice && <div className="success">{notice}</div>}

    {!clubs.length && !error ? <div className="panel empty">Bạn chưa có quyền xem tài liệu của CLB nào.</div> :
    <div className="doc-card">
      <div className="doc-card-head">
        <div className="doc-title"><span className="doc-title-icon"><FolderIcon /></span><div><h2>KHO TÀI LIỆU {club ? `· ${club.code}` : ""}</h2><p>Lưu trữ trên Cloudflare R2 theo thư mục năm / tháng / ngày</p></div></div>
        <div className="doc-card-tools">
          {canRestore && <div className="segmented"><button className={!trash ? "active" : ""} onClick={() => switchTab(false)}>Đang dùng</button><button className={trash ? "active" : ""} onClick={() => switchTab(true)}>Thùng rác</button></div>}
          <span className="count-pill">{total} tài liệu</span>
        </div>
      </div>
      <div className="doc-summary">
        <span>Tổng số tài liệu: <b>{counts.live}</b></span>
        {canRestore && <span>Trong thùng rác: <b>{counts.deleted}</b></span>}
        <span>Đang hiển thị: <b>{trash ? "Thùng rác" : "Đang dùng"}</b></span>
        <span>CLB: <b>{club?.name || "—"}</b></span>
      </div>
      <div className="table-wrap">
        <table className="doc-table">
          <thead><tr><th>Ngày tải lên</th><th>Tên tài liệu</th><th>Loại</th><th>Phiên bản</th><th>Kích thước</th><th>Ứng dụng</th><th>{trash ? "Ngày xoá" : "Cập nhật"}</th><th>Trạng thái</th><th className="right">Thao tác</th></tr></thead>
          <tbody>
            {!page ? <tr><td colSpan={9} className="empty">Đang tải…</td></tr> : !page.items.length ? <tr><td colSpan={9} className="empty">{trash ? "Thùng rác trống." : "Chưa có tài liệu nào. Bấm “Tải lên tài liệu” để bắt đầu."}</td></tr> :
            page.items.map(doc => <tr key={doc.id}>
              <td className="mono strong">{formatDay(doc.createdAt)}</td>
              <td className="doc-name-cell"><button className="doc-name" onClick={() => openDetail(doc)}>{doc.name}</button><small className="mono">{doc.path}</small></td>
              <td><span className="type-badge">{extension(doc.name)}</span></td>
              <td className="mono accent">v{doc.version}</td>
              <td className="mono">{formatSize(doc.sizeBytes)}</td>
              <td>{doc.appDetailKey ? <span className="key-badge">{doc.appDetailKey}</span> : <span className="muted">—</span>}</td>
              <td className="mono">{formatDay(trash ? doc.deletedAt : doc.updatedAt)}<small className="muted block">{formatTime(trash ? doc.deletedAt : doc.updatedAt)}</small></td>
              <td>{doc.deleted ? <span className="state-badge deleted">● Đã xoá</span> : <span className="state-badge live">● Đang dùng</span>}</td>
              <td className="right"><div className="row-actions">
                <button title="Xem chi tiết" onClick={() => openDetail(doc)}><EyeIcon /></button>
                {doc.deleted
                  ? <button title="Khôi phục" className="restore" disabled={busy} onClick={() => restore(doc)}><RestoreIcon /></button>
                  : <>
                    <button title="Tải xuống" disabled={busy} onClick={() => download(doc)}><DownloadIcon /></button>
                    <button title="Mở link R2" disabled={busy} onClick={() => openLink(doc)}><LinkIcon /></button>
                    <button title="Sửa" onClick={() => openDetail(doc)}><EditIcon /></button>
                    <button title="Xoá mềm" className="danger" disabled={busy} onClick={() => softDelete(doc)}><TrashIcon /></button>
                  </>}
              </div></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="doc-footer">
        <span className="muted">Hiển thị <b>{total ? offset + 1 : 0}–{Math.min(offset + PAGE_SIZE, total)}</b> trong <b>{total}</b><i>|</i>Trang {current} / {pages}</span>
        <div className="pager">
          <button disabled={current === 1} onClick={() => setOffset(offset - PAGE_SIZE)}>‹</button>
          {Array.from({ length: pages }, (_, i) => i + 1).slice(Math.max(0, current - 3), current + 2).map(n => <button key={n} className={n === current ? "active" : ""} onClick={() => setOffset((n - 1) * PAGE_SIZE)}>{n}</button>)}
          <button disabled={current === pages} onClick={() => setOffset(offset + PAGE_SIZE)}>›</button>
        </div>
      </div>
    </div>}

    {uploadOpen && <div className="overlay" onClick={() => setUploadOpen(false)}>
      <form className="modal" onClick={e => e.stopPropagation()} onSubmit={upload}>
        <div className="modal-head"><h3><UploadIcon /> Tải lên tài liệu</h3><button type="button" className="icon-button" onClick={() => setUploadOpen(false)}><CloseIcon /></button></div>
        <label className="drop"><input type="file" required onChange={e => setFile(e.target.files?.[0] || null)} /><span>{file ? `${file.name} · ${formatSize(file.size)}` : "Chọn file để tải lên"}</span></label>
        <label>Tên hiển thị<input placeholder="Bỏ trống = tên file" value={uploadName} onChange={e => setUploadName(e.target.value)} /></label>
        <label>appDetailKey<input placeholder="Ví dụ: club.rules" value={appDetailKey} onChange={e => setAppDetailKey(e.target.value)} /></label>
        <small className="muted">pdf, doc(x), xls(x), ppt(x), txt, csv, md, png, jpg, gif, webp, zip · tối đa 20 MB · lưu vào {club?.code}</small>
        <div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setUploadOpen(false)}>Huỷ</button><button className="vju-button" disabled={busy || !file}>{busy ? "Đang tải lên…" : "Tải lên"}</button></div>
      </form>
    </div>}

    {detail && <div className="overlay" onClick={() => setDetail(null)}>
      <aside className="drawer" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h3><EyeIcon /> Chi tiết tài liệu</h3><button className="icon-button" onClick={() => setDetail(null)}><CloseIcon /></button></div>
        <dl className="detail-list">
          <dt>Tên</dt><dd><b>{detail.name}</b></dd>
          <dt>Trạng thái</dt><dd>{detail.deleted ? <span className="state-badge deleted">● Đã xoá {formatDateTime(detail.deletedAt)}</span> : <span className="state-badge live">● Đang dùng</span>}</dd>
          <dt>Đường dẫn R2</dt><dd className="mono">{detail.path}</dd>
          <dt>Phiên bản</dt><dd className="mono">v{detail.version}</dd>
          <dt>Loại</dt><dd>{detail.contentType.split(";")[0]}</dd>
          <dt>Kích thước</dt><dd className="mono">{formatSize(detail.sizeBytes)}</dd>
          <dt>appDetailKey</dt><dd>{detail.appDetailKey || "—"}</dd>
          <dt>SHA-256</dt><dd className="mono break">{detail.checksumSha256}</dd>
          <dt>Tạo lúc</dt><dd>{formatDateTime(detail.createdAt)}</dd>
          <dt>Cập nhật</dt><dd>{formatDateTime(detail.updatedAt)}</dd>
        </dl>

        {detail.deleted
          ? canRestore && <button className="vju-button full" disabled={busy} onClick={() => restore(detail)}><RestoreIcon /> Khôi phục tài liệu</button>
          : <>
            <form className="detail-section" onSubmit={saveEdit}>
              <h4><EditIcon /> Sửa thông tin</h4>
              <label>Tên tài liệu<input value={editName} onChange={e => setEditName(e.target.value)} /></label>
              <label>appDetailKey<input value={editKey} placeholder="Bỏ trống để xoá" onChange={e => setEditKey(e.target.value)} /></label>
              <button className="vju-button" disabled={busy}>Lưu thay đổi</button>
            </form>
            <div className="detail-section">
              <h4><LayersIcon /> Lịch sử phiên bản</h4>
              <table className="mini-table"><tbody>{versions.map(v => <tr key={v.id}>
                <td className="mono accent">v{v.version}</td><td>{v.originalName}<small className="muted block">{formatDateTime(v.createdAt)} · {formatSize(v.sizeBytes)}</small></td>
                <td className="right"><button className="icon-button" title={`Tải v${v.version}`} onClick={() => download(detail, v.version)}><DownloadIcon /></button></td>
              </tr>)}</tbody></table>
              <div className="version-upload">
                <input key={versionKey} type="file" onChange={e => setVersionFile(e.target.files?.[0] || null)} />
                <button className="vju-button" disabled={busy || !versionFile} onClick={uploadVersion}><UploadIcon /> Tải lên v{detail.version + 1}</button>
              </div>
            </div>
            <div className="drawer-actions">
              <button className="ghost-button" onClick={() => download(detail)}><DownloadIcon /> Tải xuống</button>
              <button className="ghost-button" onClick={() => openLink(detail)}><LinkIcon /> Link R2</button>
              <button className="danger-button" onClick={() => softDelete(detail)}><TrashIcon /> Xoá mềm</button>
            </div>
          </>}
      </aside>
    </div>}
  </section></Shell>;
}
