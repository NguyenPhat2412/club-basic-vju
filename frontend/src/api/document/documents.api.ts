import { api, apiBlob, apiForm } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Page } from '@/types/common.types';
import type { DocumentItem, DocumentVersion } from '@/types/document/document.types';

export const documentsApi = {
  documents: (
    clubId: string,
    q: { name?: string; appDetailKey?: string; deleted?: boolean; offset?: number; limit?: number } = {}
  ) =>
    api<Page<DocumentItem>>(
      `${API_ROUTES.clubs.documents(clubId)}?${new URLSearchParams({
        name: q.name || '',
        appDetailKey: q.appDetailKey || '',
        deleted: String(!!q.deleted),
        offset: String(q.offset || 0),
        limit: String(q.limit || 20),
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
  uploadDocument: (clubId: string, file: File, name?: string, appDetailKey?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    if (appDetailKey) form.append('appDetailKey', appDetailKey);
    return apiForm<DocumentItem>(API_ROUTES.clubs.documents(clubId), form);
  },
  uploadDocumentVersion: (id: string, file: File, expectedVersion?: number) => {
    const form = new FormData();
    form.append('file', file);
    if (expectedVersion) form.append('expectedVersion', String(expectedVersion));
    return apiForm<DocumentItem>(`/documents/${id}/versions`, form);
  },
  documentDetail: (id: string) => api<DocumentItem>(`/documents/${id}`),
  documentVersions: (id: string) => api<DocumentVersion[]>(`/documents/${id}/versions`),
  updateDocument: (id: string, body: { name?: string; appDetailKey?: string }) =>
    api<DocumentItem>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteDocument: (id: string) => api<void>(`/documents/${id}`, { method: 'DELETE' }),
  restoreDocument: (id: string) => api<DocumentItem>(`/documents/${id}/restore`, { method: 'POST' }),
  downloadDocument: (id: string, version?: number) =>
    apiBlob(`/documents/${id}/download${version ? `?version=${version}` : ''}`),
  documentDownloadUrl: (id: string, version?: number) =>
    api<{ url: string; version: number; expiresAt?: string }>(
      `/documents/${id}/download-url${version ? `?version=${version}` : ''}`
    ),
};
