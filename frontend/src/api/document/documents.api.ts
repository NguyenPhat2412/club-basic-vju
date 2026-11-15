import { api, apiBlob, apiForm, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Page } from '@/types/common.types';
import type {
  DocumentItem,
  DocumentVersion,
  DocumentVisibility,
} from '@/types/document/document.types';

export const documentsApi = {
  systemDocuments: (
    q: {
      name?: string;
      appDetailKey?: string;
      visibility?: DocumentVisibility;
      deleted?: boolean;
      offset?: number;
      limit?: number;
    } = {}
  ) =>
    api<Page<DocumentItem>>(
      `${API_ROUTES.documents.systemList}?${cleanParams({
        name: q.name,
        appDetailKey: q.appDetailKey,
        visibility: q.visibility,
        deleted: !!q.deleted,
        offset: q.offset ?? 0,
        limit: q.limit ?? 20,
      })}`
    ),
  uploadSystemDocument: (
    file: File,
    opts: { name?: string; appDetailKey?: string; visibility?: DocumentVisibility } = {}
  ) => {
    const form = new FormData();
    form.append('file', file);
    if (opts.name) form.append('name', opts.name);
    if (opts.appDetailKey) form.append('appDetailKey', opts.appDetailKey);
    if (opts.visibility) form.append('visibility', opts.visibility);
    return apiForm<DocumentItem>(API_ROUTES.documents.systemList, form);
  },
  documents: (
    clubId: string,
    q: {
      departmentId?: string;
      visibility?: DocumentVisibility;
      name?: string;
      appDetailKey?: string;
      deleted?: boolean;
      offset?: number;
      limit?: number;
    } = {}
  ) =>
    api<Page<DocumentItem>>(
      `${API_ROUTES.clubs.documents(clubId)}?${cleanParams({
        departmentId: q.departmentId,
        visibility: q.visibility,
        name: q.name,
        appDetailKey: q.appDetailKey,
        deleted: !!q.deleted,
        offset: q.offset ?? 0,
        limit: q.limit ?? 20,
      })}`
    ),
  documentCount: (clubId: string, deleted = false) =>
    api<{ clubId: string; deleted: boolean; count: number }>(
      `${API_ROUTES.clubs.documentCount(clubId)}?deleted=${deleted}`
    ),
  documentNames: (clubId: string, deleted = false) =>
    api<{ clubId: string; deleted: boolean; names: string[] }>(
      `${API_ROUTES.clubs.documentNames(clubId)}?deleted=${deleted}`
    ),
  uploadDocument: (
    clubId: string,
    file: File,
    name?: string,
    appDetailKey?: string,
    opts: { departmentId?: string; visibility?: DocumentVisibility } = {}
  ) => {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    if (appDetailKey) form.append('appDetailKey', appDetailKey);
    if (opts.departmentId) form.append('departmentId', opts.departmentId);
    if (opts.visibility) form.append('visibility', opts.visibility);
    return apiForm<DocumentItem>(API_ROUTES.clubs.documents(clubId), form);
  },
  uploadDocumentVersion: (id: string, file: File, expectedVersion?: number) => {
    const form = new FormData();
    form.append('file', file);
    if (expectedVersion) form.append('expectedVersion', String(expectedVersion));
    return apiForm<DocumentItem>(API_ROUTES.documents.versions(id), form);
  },
  documentDetail: (id: string) => api<DocumentItem>(API_ROUTES.documents.detail(id)),
  documentVersions: (id: string) => api<DocumentVersion[]>(API_ROUTES.documents.versions(id)),
  updateDocument: (
    id: string,
    body: { name?: string; appDetailKey?: string; visibility?: DocumentVisibility }
  ) => api<DocumentItem>(API_ROUTES.documents.detail(id), { method: 'PATCH', body: JSON.stringify(body) }),
  deleteDocument: (id: string) => api<void>(API_ROUTES.documents.detail(id), { method: 'DELETE' }),
  restoreDocument: (id: string) =>
    api<DocumentItem>(API_ROUTES.documents.restore(id), { method: 'POST' }),
  downloadDocument: (id: string, version?: number) =>
    apiBlob(`${API_ROUTES.documents.download(id)}${version ? `?version=${version}` : ''}`),
  previewDocument: (id: string, version?: number) =>
    apiBlob(`${API_ROUTES.documents.preview(id)}${version ? `?version=${version}` : ''}`),
  documentDownloadUrl: (id: string, version?: number) =>
    api<{ url: string; version: number; expiresAt?: string }>(
      `${API_ROUTES.documents.downloadUrl(id)}${version ? `?version=${version}` : ''}`
    ),
};
