const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
export type Page<T> = { items: T[]; total: number; offset: number; limit: number };
export class ApiError extends Error { constructor(message: string, public status: number, public code?: string) { super(message); } }
async function apiError(response: Response) { let message = `Request failed (${response.status})`; let code: string | undefined; try { const body = await response.json(); message = body.detail || body.message || body.title || message; code = body.code; } catch {} return new ApiError(message, response.status, code); }

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SIGN_IN_PATHS = ['/auth/login'];

function csrfCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function csrfToken() {
  const existing = csrfCookie();
  if (existing) return existing;
  await fetch(`${API}/api/v1/auth/csrf`, { credentials: 'include' });
  return csrfCookie();
}

function toLogin() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') window.location.replace(new URL('/login', window.location.origin));
}

async function send(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> || {}) };
  if (UNSAFE.has(method)) { const token = await csrfToken(); if (token) headers['X-XSRF-TOKEN'] = token; }
  const response = await fetch(`${API}/api/v1${path}`, { ...init, headers, credentials: 'include' });
  if (response.status === 403 && UNSAFE.has(method) && !retried) {
    const error = await apiError(response.clone());
    if (error.code === 'CSRF_INVALID') {
      await fetch(`${API}/api/v1/auth/csrf`, { credentials: 'include' });
      return send(path, init, true);
    }
  }
  if (response.status === 401 && !SIGN_IN_PATHS.includes(path)) toLogin();
  if (!response.ok) throw await apiError(response);
  return response;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await send(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (response.status === 204) return undefined as T; return response.json();
}
export async function apiForm<T>(path: string, form: FormData): Promise<T> {
  return (await send(path, { method: 'POST', body: form })).json();
}
export async function apiBlob(path: string): Promise<Blob> {
  return (await send(path)).blob();
}
export const apiModel = {
  login: (email: string, password: string) => api<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => api<void>('/auth/logout', { method: 'POST' }),
  me: () => api<User>('/auth/me'), effectivePermissions: () => api<EffectivePermission[]>('/users/me/effective-permissions'), clubs: (query = '', category = '') => api<Page<Club>>(`/clubs?query=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&limit=50`), club: (id: string) => api<Club>(`/clubs/${id}`),
  apply: (clubId: string, message: string) => api<Application>(`/clubs/${clubId}/applications`, { method: 'POST', body: JSON.stringify({ message }) }), myApplications: () => api<Page<ApplicationSummary>>('/users/me/applications?limit=50'), application: (id: string) => api<Application>(`/users/me/applications/${id}`), cancelApplication: (id: string) => api<Application>(`/users/me/applications/${id}/cancel`, { method: 'PATCH' }), myMemberships: () => api<Page<Membership>>('/users/me/memberships?limit=50'),
  clubApplications: (clubId: string) => api<Page<Application>>(`/clubs/${clubId}/applications?limit=50`), approve: (clubId: string, applicationId: string, note: string) => api<Application>(`/clubs/${clubId}/applications/${applicationId}/approve`, { method: 'POST', body: JSON.stringify({ reviewNote: note }) }), reject: (clubId: string, applicationId: string, note: string) => api<Application>(`/clubs/${clubId}/applications/${applicationId}/reject`, { method: 'POST', body: JSON.stringify({ reviewNote: note }) }),
  departments: (clubId: string) => api<Page<Department>>(`/clubs/${clubId}/departments?limit=50`),
  clubMemberships: (clubId: string) => api<Page<Membership>>(`/clubs/${clubId}/memberships?status=ACTIVE&limit=50`),
  membership: (id: string) => api<Membership>(`/memberships/${id}`),
  updateMembership: (id: string, status: string) => api<Membership>(`/memberships/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  departmentMembers: (departmentId: string) => api<Page<DepartmentMember>>(`/departments/${departmentId}/members?limit=100`),
  addDepartmentMember: (departmentId: string, membershipId: string) => api<DepartmentMember>(`/departments/${departmentId}/members`, { method: 'POST', body: JSON.stringify({ membershipId }) }),
  removeDepartmentMember: (departmentId: string, membershipId: string) => api<void>(`/departments/${departmentId}/members/${membershipId}`, { method: 'DELETE' }),
  notifications: () => api<Page<Notification>>('/users/me/notifications?limit=20'),
  markNotificationRead: (id: string) => api<void>(`/users/me/notifications/${id}/read`, { method: 'PATCH' }),
  documents: (clubId: string, q: { name?: string; appDetailKey?: string; deleted?: boolean; offset?: number; limit?: number } = {}) => api<Page<DocumentItem>>(`/clubs/${clubId}/documents?${new URLSearchParams({ name: q.name || '', appDetailKey: q.appDetailKey || '', deleted: String(!!q.deleted), offset: String(q.offset || 0), limit: String(q.limit || 20) })}`),
  documentCount: (clubId: string, deleted = false) => api<{ clubId: string; deleted: boolean; count: number }>(`/clubs/${clubId}/documents/count?deleted=${deleted}`),
  documentNames: (clubId: string, deleted = false) => api<{ clubId: string; deleted: boolean; names: string[] }>(`/clubs/${clubId}/documents/names?deleted=${deleted}`),
  uploadDocument: (clubId: string, file: File, name?: string, appDetailKey?: string) => { const form = new FormData(); form.append('file', file); if (name) form.append('name', name); if (appDetailKey) form.append('appDetailKey', appDetailKey); return apiForm<DocumentItem>(`/clubs/${clubId}/documents`, form); },
  uploadDocumentVersion: (id: string, file: File, expectedVersion?: number) => { const form = new FormData(); form.append('file', file); if (expectedVersion) form.append('expectedVersion', String(expectedVersion)); return apiForm<DocumentItem>(`/documents/${id}/versions`, form); },
  documentDetail: (id: string) => api<DocumentItem>(`/documents/${id}`),
  documentVersions: (id: string) => api<DocumentVersion[]>(`/documents/${id}/versions`),
  updateDocument: (id: string, body: { name?: string; appDetailKey?: string }) => api<DocumentItem>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteDocument: (id: string) => api<void>(`/documents/${id}`, { method: 'DELETE' }),
  restoreDocument: (id: string) => api<DocumentItem>(`/documents/${id}/restore`, { method: 'POST' }),
  downloadDocument: (id: string, version?: number) => apiBlob(`/documents/${id}/download${version ? `?version=${version}` : ''}`),
  documentDownloadUrl: (id: string, version?: number) => api<{ url: string; version: number; expiresAt?: string }>(`/documents/${id}/download-url${version ? `?version=${version}` : ''}`),
};
export type DocumentItem = { id: string; clubId: string; ownerId: string; name: string; path: string; version: number; contentType: string; sizeBytes: number; checksumSha256: string; appDetailKey?: string; deleted: boolean; deletedAt?: string; deletedBy?: string; createdAt: string; updatedAt: string };
export type DocumentVersion = { id: string; documentId: string; version: number; originalName: string; contentType: string; sizeBytes: number; checksumSha256: string; uploadedBy: string; createdAt: string };
export type User = { id: string; email: string; fullName?: string; studentCode?: string; status: string };
export type EffectivePermission = { permissionKey: string; scope: string; clubId?: string; departmentId?: string; source: string; roleCode?: string };
export type Club = { id: string; code: string; name: string; description?: string; activityField?: string; contactEmail?: string; status: string; logoUrl?: string; coverUrl?: string };
export type ApplicationSummary = { id: string; clubId: string; clubCode: string; clubName: string; status: string; createdAt: string; reviewedAt?: string };
export type Application = ApplicationSummary & { applicantId: string; message: string; reviewNote?: string; membershipId?: string; membershipStatus?: string };
export type Membership = { id: string; userId: string; clubId: string; clubCode: string; clubName: string; status: string; joinedAt?: string; leftAt?: string; departments: { id: string; name: string }[] };
export type Department = { id: string; clubId: string; name: string; description?: string; status: string };
export type DepartmentMember = { id: string; departmentId: string; membershipId: string; userId: string; joinedAt: string };
export type Notification = { id: string; title: string; message: string; read: boolean; referenceId?: string; createdAt: string };
