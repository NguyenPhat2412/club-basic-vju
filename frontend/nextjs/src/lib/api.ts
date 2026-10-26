const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
export type Page<T> = { items: T[]; total: number; offset: number; limit: number };
export class ApiError extends Error { constructor(message: string, public status: number, public code?: string) { super(message); } }
async function apiError(response: Response) { let message = `Request failed (${response.status})`; let code: string | undefined; try { const body = await response.json(); message = body.detail || body.message || body.title || message; code = body.code; } catch {} return new ApiError(message, response.status, code); }

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SIGN_IN_PATHS = ['/auth/login', '/auth/google'];

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
  if (response.status === 401 && !SIGN_IN_PATHS.includes(path) && !path.startsWith('/public/')) toLogin();
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

function cleanParams(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.set(k, String(v));
  });
  return search.toString();
}

export const apiModel = {
  login: (email: string, password: string) => api<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  googleConfig: () => api<GoogleSignInConfig>('/auth/google/config'),
  googleLogin: (credential: string, register = false) => api<{ user: User }>('/auth/google', { method: 'POST', body: JSON.stringify({ credential, register }) }),
  logout: () => api<void>('/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) => api<void>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  users: (query = '', offset = 0, limit = 20) => api<Page<User>>(`/users?${new URLSearchParams({ query, offset: String(offset), limit: String(limit) })}`),
  createUser: (body: { email: string; password?: string; fullName: string; studentCode?: string; phone?: string; requiresPasswordChange?: boolean; roles?: RoleAssignmentInput[] }) => api<User>('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: string, body: { fullName?: string; studentCode?: string; phone?: string; avatarUrl?: string }) => api<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteUser: (id: string) => api<void>(`/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id: string, newPassword: string, requiresPasswordChange = true) => api<void>(`/users/${id}/password`, { method: 'PATCH', body: JSON.stringify({ newPassword, requiresPasswordChange }) }),
  roles: () => api<Role[]>('/roles'),
  createRole: (body: { code: string; name: string; description?: string; scope: Scope; permissionIds: string[] }) => api<Role>('/roles', { method: 'POST', body: JSON.stringify(body) }),
  updateRolePermissions: (id: string, permissionIds: string[]) => api<Role>(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify({ permissionIds }) }),
  permissionGroups: () => api<PermissionGroup[]>('/permissions/groups'),
  userRoles: (userId: string) => api<UserRole[]>(`/users/${userId}/roles`),
  assignRole: (userId: string, body: RoleAssignmentInput) => api<UserRole>(`/users/${userId}/roles`, { method: 'POST', body: JSON.stringify(body) }),
  revokeRole: (userId: string, assignmentId: string) => api<void>(`/users/${userId}/roles/${assignmentId}`, { method: 'DELETE' }),
  updateUserStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') => api<User>(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  me: () => api<User>('/auth/me'),
  effectivePermissions: () => api<EffectivePermission[]>('/users/me/effective-permissions'),
  publicClubs: (query = '', category = '', offset = 0, limit = 50) => api<Page<Club>>(`/public/clubs?${new URLSearchParams({ query, category, offset: String(offset), limit: String(limit) })}`),
  publicClub: (id: string) => api<Club>(`/public/clubs/${id}`),
  publicEvents: (offset = 0, limit = 10) => api<Page<PublicEvent>>(`/public/events?${new URLSearchParams({ offset: String(offset), limit: String(limit) })}`),
  clubs: (query = '', category = '', offset = 0, limit = 50, status?: string) => api<Page<Club>>(`/clubs?${cleanParams({ query, category, status, offset, limit })}`),
  club: (id: string) => api<Club>(`/clubs/${id}`),
  createClub: (body: ClubInput) => api<Club>('/clubs', { method: 'POST', body: JSON.stringify(body) }),
  updateClub: (id: string, body: Partial<ClubInput>) => api<Club>(`/clubs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateClubStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') => api<Club>(`/clubs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  apply: (clubId: string, body: CreateApplicationInput | string) =>
    api<Application>(`/clubs/${clubId}/applications`, {
      method: 'POST',
      body: JSON.stringify(typeof body === 'string' ? { message: body } : body),
    }),
  myApplications: () => api<Page<ApplicationSummary>>('/users/me/applications?limit=50'),
  application: (id: string) => api<Application>(`/users/me/applications/${id}`),
  updateMyApplication: (id: string, body: UpdateApplicationInput) =>
    api<Application>(`/users/me/applications/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMyApplication: (id: string) => api<void>(`/users/me/applications/${id}`, { method: 'DELETE' }),
  cancelApplication: (id: string) => api<Application>(`/users/me/applications/${id}/cancel`, { method: 'PATCH' }),
  myMemberships: () => api<Page<Membership>>('/users/me/memberships?limit=50'),
  clubApplicationForm: (clubId: string) => api<ApplicationForm>(`/clubs/${clubId}/application-form`),
  clubApplicationForms: (clubId: string) => api<ApplicationForm[]>(`/clubs/${clubId}/application-forms`),
  createClubApplicationForm: (clubId: string, body: UpsertApplicationFormInput) =>
    api<ApplicationForm>(`/clubs/${clubId}/application-forms`, { method: 'POST', body: JSON.stringify(body) }),
  createApplicationForm: (clubId: string, body: UpsertApplicationFormInput) =>
    api<ApplicationForm>(`/clubs/${clubId}/application-forms`, { method: 'POST', body: JSON.stringify(body) }),
  updateClubApplicationForm: (clubId: string, formId: string, body: UpsertApplicationFormInput) =>
    api<ApplicationForm>(`/clubs/${clubId}/application-forms/${formId}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateApplicationForm: (clubId: string, formId: string, body: UpsertApplicationFormInput) =>
    api<ApplicationForm>(`/clubs/${clubId}/application-forms/${formId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteClubApplicationForm: (clubId: string, formId: string) =>
    api<void>(`/clubs/${clubId}/application-forms/${formId}`, { method: 'DELETE' }),
  deleteApplicationForm: (clubId: string, formId: string) =>
    api<void>(`/clubs/${clubId}/application-forms/${formId}`, { method: 'DELETE' }),
  uploadFormFile: (clubId: string, formId: string, file: File, fileCategory?: string) => {
    const form = new FormData();
    form.append('file', file);
    const q = fileCategory ? `?fileCategory=${encodeURIComponent(fileCategory)}` : '';
    return apiForm<ApplicationFile>(`/clubs/${clubId}/application-forms/${formId}/files${q}`, form);
  },
  uploadApplicationFormFile: (clubId: string, formId: string, file: File, fileCategory?: string) => {
    const form = new FormData();
    form.append('file', file);
    const q = fileCategory ? `?fileCategory=${encodeURIComponent(fileCategory)}` : '';
    return apiForm<ApplicationFile>(`/clubs/${clubId}/application-forms/${formId}/files${q}`, form);
  },
  deleteFormFile: (clubId: string, formId: string, fileId: string) =>
    api<void>(`/clubs/${clubId}/application-forms/${formId}/files/${fileId}`, { method: 'DELETE' }),
  deleteApplicationFormFile: (clubId: string, formId: string, fileId: string) =>
    api<void>(`/clubs/${clubId}/application-forms/${formId}/files/${fileId}`, { method: 'DELETE' }),
  uploadApplicationFile: (applicationId: string, file: File, fileCategory?: string) => {
    const form = new FormData();
    form.append('file', file);
    const q = fileCategory ? `?fileCategory=${encodeURIComponent(fileCategory)}` : '';
    return apiForm<ApplicationFile>(`/applications/${applicationId}/files${q}`, form);
  },
  deleteApplicationFile: (applicationId: string, fileId: string) =>
    api<void>(`/applications/${applicationId}/files/${fileId}`, { method: 'DELETE' }),
  applicationFileUrl: (fileId: string, inline = false) =>
    `${API}/api/v1/application-files/${fileId}/download?inline=${inline}`,
  clubApplications: (clubId: string, q: { status?: string; search?: string } = {}) =>
    api<Page<Application>>(`/clubs/${clubId}/applications?${cleanParams({ status: q.status, search: q.search, limit: 50 })}`),
  clubApplicationDetail: (clubId: string, applicationId: string) =>
    api<Application>(`/clubs/${clubId}/applications/${applicationId}`),
  updateClubApplication: (clubId: string, applicationId: string, body: UpdateApplicationInput) =>
    api<Application>(`/clubs/${clubId}/applications/${applicationId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteClubApplication: (clubId: string, applicationId: string) =>
    api<void>(`/clubs/${clubId}/applications/${applicationId}`, { method: 'DELETE' }),
  approve: (clubId: string, applicationId: string, note: string, departmentId?: string) =>
    api<Application>(`/clubs/${clubId}/applications/${applicationId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reviewNote: note, departmentId: departmentId || undefined }),
    }),
  reject: (clubId: string, applicationId: string, note: string) =>
    api<Application>(`/clubs/${clubId}/applications/${applicationId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reviewNote: note }),
    }),
  departments: (clubId: string) => api<Page<Department>>(`/clubs/${clubId}/departments?limit=50`),
  createDepartment: (clubId: string, body: { name: string; description?: string }) => api<Department>(`/clubs/${clubId}/departments`, { method: 'POST', body: JSON.stringify(body) }),
  updateDepartment: (id: string, body: { name?: string; description?: string }) => api<Department>(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateDepartmentStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') => api<Department>(`/departments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  clubMemberships: (clubId: string, status = '') => api<Page<Membership>>(`/clubs/${clubId}/memberships?${cleanParams({ status, limit: 100 })}`),
  addClubMember: (clubId: string, userId: string) => api<Membership>(`/clubs/${clubId}/memberships`, { method: 'POST', body: JSON.stringify({ userId }) }),
  membership: (id: string) => api<Membership>(`/memberships/${id}`),
  updateMembership: (id: string, status: string) => api<Membership>(`/memberships/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  removeMembership: (id: string) => api<void>(`/memberships/${id}`, { method: 'DELETE' }),
  departmentMembers: (departmentId: string) => api<Page<DepartmentMember>>(`/departments/${departmentId}/members?limit=100`),
  addDepartmentMember: (departmentId: string, membershipId: string) => api<DepartmentMember>(`/departments/${departmentId}/members`, { method: 'POST', body: JSON.stringify({ membershipId }) }),
  removeDepartmentMember: (departmentId: string, membershipId: string) => api<void>(`/departments/${departmentId}/members/${membershipId}`, { method: 'DELETE' }),
  clubEvents: (clubId: string, q: { status?: string; departmentId?: string; offset?: number; limit?: number } = {}) => api<Page<ClubEvent>>(`/clubs/${clubId}/events?${cleanParams({ status: q.status, departmentId: q.departmentId, offset: q.offset ?? 0, limit: q.limit ?? 50 })}`),
  eventDetail: (eventId: string) => api<ClubEvent>(`/events/${eventId}`),
  createEvent: (clubId: string, body: CreateEventInput) => api<ClubEvent>(`/clubs/${clubId}/events`, { method: 'POST', body: JSON.stringify(body) }),
  updateEvent: (clubId: string, eventId: string, body: Partial<CreateEventInput>) => api<ClubEvent>(`/clubs/${clubId}/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  registerEvent: (eventId: string, note?: string) => api<EventRegistration>(`/events/${eventId}/registrations`, { method: 'POST', body: JSON.stringify({ note: note || undefined }) }),
  cancelEventRegistration: (eventId: string) => api<EventRegistration>(`/events/${eventId}/registrations/me/cancel`, { method: 'PATCH' }),
  eventRegistrations: (eventId: string) => api<Page<EventRegistration>>(`/events/${eventId}/registrations?limit=100`),
  eventAttendances: (eventId: string) => api<EventAttendance[]>(`/events/${eventId}/attendances`),
  recordAttendance: (eventId: string, items: { userId: string; status: 'PRESENT' | 'ABSENT' | 'LATE'; note?: string }[]) => api<EventAttendance[]>(`/events/${eventId}/attendances`, { method: 'PUT', body: JSON.stringify({ items }) }),
  myCalendar: (from?: string, to?: string) => api<CalendarItem[]>(`/users/me/calendar${cleanParams({ from, to }) ? `?${cleanParams({ from, to })}` : ''}`),
  clubTasks: (clubId: string, q: { departmentId?: string; status?: string; assigneeId?: string; offset?: number; limit?: number } = {}) => api<Page<TaskItem>>(`/clubs/${clubId}/tasks?${cleanParams({ departmentId: q.departmentId, status: q.status, assigneeId: q.assigneeId, offset: q.offset ?? 0, limit: q.limit ?? 50 })}`),
  myTasks: (status?: string) => api<Page<TaskItem>>(`/users/me/tasks?${cleanParams({ status, limit: 50 })}`),
  createTask: (clubId: string, body: CreateTaskInput) => api<TaskItem>(`/clubs/${clubId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  updateTaskProgress: (taskId: string, body: { status?: string; progressPercent?: number; progressNote?: string; reportLink?: string }) => api<TaskItem>(`/tasks/${taskId}/progress`, { method: 'PATCH', body: JSON.stringify(body) }),
  verifyTask: (taskId: string) => api<TaskItem>(`/tasks/${taskId}/verify`, { method: 'PATCH' }),
  clubChannels: (clubId: string) => api<ChatChannel[]>(`/clubs/${clubId}/channels`),
  createChannel: (clubId: string, body: { name: string; channelType?: string; departmentId?: string; eventId?: string }) => api<ChatChannel>(`/clubs/${clubId}/channels`, { method: 'POST', body: JSON.stringify(body) }),
  channelMessages: (channelId: string, offset = 0, limit = 50) => api<Page<ChatMessage>>(`/channels/${channelId}/messages?${cleanParams({ offset, limit })}`),
  sendMessage: (channelId: string, content: string) => api<ChatMessage>(`/channels/${channelId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  summarizeChannel: (channelId: string, body: { messageLimit?: number; postToChannel?: boolean } = { messageLimit: 50, postToChannel: true }) => api<AiSummary>(`/channels/${channelId}/summaries`, { method: 'POST', body: JSON.stringify(body) }),
  channelSummaries: (channelId: string) => api<AiSummary[]>(`/channels/${channelId}/summaries`),
  notifications: () => api<Page<Notification>>('/users/me/notifications?limit=30'),
  markNotificationRead: (id: string) => api<void>(`/users/me/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => api<void>('/users/me/notifications/read-all', { method: 'PATCH' }),
  broadcastNotification: (clubId: string, body: { title: string; message: string; departmentId?: string }) => api<{ clubId: string; departmentId?: string; recipientCount: number }>(`/clubs/${clubId}/notifications`, { method: 'POST', body: JSON.stringify(body) }),
  auditLogs: (q: { resourceType?: string; clubId?: string; action?: string; offset?: number; limit?: number } = {}) => api<Page<AuditLogItem>>(`/audit-logs?${cleanParams({ resourceType: q.resourceType, clubId: q.clubId, action: q.action, offset: q.offset ?? 0, limit: q.limit ?? 20 })}`),
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
export type User = { id: string; email: string; fullName?: string; studentCode?: string; phone?: string; avatarUrl?: string; status: string; requiresPasswordChange?: boolean; createdAt?: string; updatedAt?: string };
export type Scope = 'GLOBAL' | 'CLUB' | 'DEPARTMENT';
export type Role = { id: string; code: string; name: string; description?: string; scope: Scope; system: boolean; active: boolean; locked: boolean; permissionKeys: string[] };
export type UserRole = { id: string; userId: string; roleId: string; roleCode: string; roleName: string; scope: Scope; clubId?: string; departmentId?: string; grantedAt: string };
export type RoleAssignmentInput = { roleId: string; scope: Scope; clubId?: string; departmentId?: string };
export type PermissionItem = { id: string; permissionKey: string; module: string; action: string; scope: Scope; description?: string; active: boolean };
export type PermissionGroup = { module: string; permissions: PermissionItem[] };
export type EffectivePermission = { permissionKey: string; scope: string; clubId?: string; departmentId?: string; source: string; roleCode?: string };
export type Club = { id: string; code: string; name: string; description?: string; activityField?: string; contactEmail?: string; status: string; logoUrl?: string; coverUrl?: string };
export type ClubInput = { code: string; name: string; description?: string; activityField?: string; contactEmail?: string; logoUrl?: string; coverUrl?: string };
export type PublicEvent = { id: string; clubId: string; clubName: string; departmentId?: string; departmentName?: string; title: string; description?: string; eventType: string; location?: string; startTime: string; endTime: string; registrationDeadline?: string; allowCtv: boolean; maxParticipants?: number; status: string };
export type ClubEvent = PublicEvent & { clubCode?: string; createdAt?: string; updatedAt?: string };
export type CreateEventInput = { departmentId?: string; title: string; description?: string; eventType?: string; location?: string; startTime: string; endTime: string; registrationDeadline: string; allowCtv?: boolean; maxParticipants?: number; status?: string };
export type EventRegistration = { id: string; eventId: string; userId: string; userEmail?: string; userFullName?: string; studentCode?: string; participantType: string; status: string; note?: string; registeredAt: string; cancelledAt?: string };
export type EventAttendance = { id: string; eventId: string; userId: string; userEmail?: string; userFullName?: string; studentCode?: string; status: 'PRESENT' | 'ABSENT' | 'LATE'; note?: string; checkedBy: string; checkedAt: string };
export type CalendarItem = { id: string; itemType: 'EVENT' | 'TASK'; clubId: string; clubName: string; departmentId?: string; title: string; status: string; location?: string; startTime: string; endTime: string };
export type TaskItem = { id: string; clubId: string; clubCode: string; clubName: string; departmentId?: string; departmentName?: string; eventId?: string; eventTitle?: string; title: string; description?: string; priority: string; status: string; progressPercent: number; deadline: string; assigneeId: string; assigneeFullName?: string; assignerId: string; assignerFullName?: string; progressNote?: string; reportLink?: string; verifiedBy?: string; verifiedAt?: string; createdAt: string; updatedAt: string };
export type CreateTaskInput = { departmentId?: string; eventId?: string; title: string; description?: string; priority?: string; deadline: string; assigneeId: string };
export type ChatChannel = { id: string; clubId: string; departmentId?: string; departmentName?: string; eventId?: string; eventTitle?: string; name: string; channelType: string; createdAt: string; updatedAt: string };
export type ChatMessage = { id: string; channelId: string; senderId?: string; senderFullName?: string; senderType: 'USER' | 'AI_BOT'; content: string; createdAt: string };
export type AiSummary = { id: string; channelId: string; requestedBy: string; messageCount: number; summary: string; decisions: string[]; suggestedTasks: string[]; suggestedEvents: string[]; model: string; createdAt: string };
export type AuditLogItem = { id: string; actorUserId?: string; action: string; resourceType: string; resourceId: string; clubId?: string; oldValue?: Record<string, unknown> | null; newValue?: Record<string, unknown> | null; createdAt: string };
export type ApplicationFieldType = 'TEXT' | 'TEXTAREA' | 'SELECT' | 'RADIO' | 'CHECKBOX' | 'NUMBER' | 'DATE' | 'URL';
export type FormFieldDefinition = {
  key: string;
  label: string;
  type: ApplicationFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
};
export type ApplicationFile = {
  id: string;
  clubId: string;
  formId?: string;
  applicationId?: string;
  purpose: 'FORM_TEMPLATE' | 'APPLICANT_ATTACHMENT';
  fileCategory: string;
  originalName: string;
  contentType: string;
  fileType: string;
  sizeBytes: number;
  checksumSha256: string;
  uploadedBy?: string;
  createdAt: string;
};
export type ApplicationForm = {
  id: string | null;
  clubId: string;
  clubCode: string;
  clubName: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  openAt?: string;
  closeAt?: string;
  fields: FormFieldDefinition[];
  allowAttachments: boolean;
  requireAttachment: boolean;
  maxAttachments: number;
  isDefault: boolean;
  templateFiles: ApplicationFile[];
  departments: { id: string; name: string; description?: string }[];
  createdAt?: string;
  updatedAt?: string;
};
export type UpsertApplicationFormInput = {
  title: string;
  description?: string;
  status?: 'DRAFT' | 'OPEN' | 'CLOSED';
  openAt?: string;
  closeAt?: string;
  fields: FormFieldDefinition[];
  allowAttachments?: boolean;
  requireAttachment?: boolean;
  maxAttachments?: number;
  isDefault?: boolean;
};
export type CreateApplicationInput = {
  message: string;
  formId?: string;
  preferredDepartmentId?: string;
  secondaryDepartmentId?: string;
  applicantPhone?: string;
  facultyMajor?: string;
  academicYear?: string;
  gpa?: string;
  socialPortfolioUrl?: string;
  selfIntroduction?: string;
  skillsExperience?: string;
  availability?: string;
  customAnswers?: Record<string, unknown>;
  applicantId?: string;
};
export type UpdateApplicationInput = {
  preferredDepartmentId?: string;
  secondaryDepartmentId?: string;
  applicantPhone?: string;
  facultyMajor?: string;
  academicYear?: string;
  gpa?: string;
  socialPortfolioUrl?: string;
  selfIntroduction?: string;
  skillsExperience?: string;
  availability?: string;
  message?: string;
  customAnswers?: Record<string, unknown>;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewNote?: string;
  assignDepartmentId?: string;
};
export type ApplicationSummary = {
  id: string;
  clubId: string;
  clubCode: string;
  clubName: string;
  formId?: string;
  preferredDepartmentId?: string;
  preferredDepartmentName?: string;
  secondaryDepartmentId?: string;
  secondaryDepartmentName?: string;
  facultyMajor?: string;
  academicYear?: string;
  applicantPhone?: string;
  attachmentCount?: number;
  status: string;
  createdAt: string;
  reviewedAt?: string;
};
export type Application = ApplicationSummary & {
  applicantId: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantStudentCode?: string;
  applicantPhone?: string;
  facultyMajor?: string;
  academicYear?: string;
  gpa?: string;
  socialPortfolioUrl?: string;
  selfIntroduction?: string;
  skillsExperience?: string;
  availability?: string;
  message: string;
  customAnswers?: Record<string, unknown>;
  attachments?: ApplicationFile[];
  reviewedBy?: string;
  reviewNote?: string;
  cancelledAt?: string;
  updatedAt?: string;
  membershipId?: string;
  membershipStatus?: string;
};
export type Membership = { id: string; userId: string; userFullName?: string; userStudentCode?: string; clubId: string; clubCode: string; clubName: string; status: string; joinedAt?: string; leftAt?: string; departments: { id: string; name: string }[] };
export type Department = { id: string; clubId: string; name: string; description?: string; status: string };
export type DepartmentMember = { id: string; departmentId: string; membershipId: string; userId: string; joinedAt: string };
export type Notification = { id: string; title: string; message: string; read: boolean; referenceId?: string; createdAt: string };
export type GoogleSignInConfig = { enabled: boolean; clientId: string | null; allowedDomains: string[] };
