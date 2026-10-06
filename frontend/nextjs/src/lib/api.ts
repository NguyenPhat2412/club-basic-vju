const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
export type Page<T> = { items: T[]; total: number; offset: number; limit: number };
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await fetch(`${API}/api/v1${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
  if (!response.ok) { let message = `Request failed (${response.status})`; try { const body = await response.json(); message = body.detail || body.message || body.title || message; } catch {} throw new Error(message); }
  if (response.status === 204) return undefined as T; return response.json();
}
export const apiModel = {
  login: (email: string, password: string) => api<{ user: User; tokens: { accessToken: string; refreshToken: string } }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
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
};
export type User = { id: string; email: string; fullName?: string; studentCode?: string; status: string };
export type EffectivePermission = { permissionKey: string; scope: string; clubId?: string; departmentId?: string; source: string; roleCode?: string };
export type Club = { id: string; code: string; name: string; description?: string; activityField?: string; contactEmail?: string; status: string; logoUrl?: string; coverUrl?: string };
export type ApplicationSummary = { id: string; clubId: string; clubCode: string; clubName: string; status: string; createdAt: string; reviewedAt?: string };
export type Application = ApplicationSummary & { applicantId: string; message: string; reviewNote?: string; membershipId?: string; membershipStatus?: string };
export type Membership = { id: string; userId: string; clubId: string; clubCode: string; clubName: string; status: string; joinedAt?: string; leftAt?: string; departments: { id: string; name: string }[] };
export type Department = { id: string; clubId: string; name: string; description?: string; status: string };
export type DepartmentMember = { id: string; departmentId: string; membershipId: string; userId: string; joinedAt: string };
export type Notification = { id: string; title: string; message: string; read: boolean; referenceId?: string; createdAt: string };
