const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export type AuthUser = {
  userId: string;
  email: string;
  fullName: string;
  status: "ACTIVE" | "INACTIVE";
};

export type Grant = { permission: string; scope: "GLOBAL" | "CLUB" | "DEPARTMENT"; resourceId?: string };

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Email hoặc mật khẩu không chính xác"));
  return response.json() as Promise<{ accessToken: string; user: AuthUser }>;
}

export async function register(input: { email: string; password: string; fullName: string; studentCode?: string; phone?: string }) {
  const response = await fetch(`${API_URL}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error(await errorMessage(response, "Không thể tạo tài khoản"));
  return response.json() as Promise<{ accessToken: string; user: AuthUser }>;
}

async function errorMessage(response: Response, fallback: string) {
  try { const body = await response.json() as { detail?: string; message?: string }; return body.detail ?? body.message ?? fallback; }
  catch { return fallback; }
}

export async function currentUser(token: string) {
  const response = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Phiên đăng nhập đã hết hạn");
  return response.json() as Promise<AuthUser>;
}

export async function logout(token: string) {
  await fetch(`${API_URL}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
}

export async function myPermissions(token: string) {
  const response = await fetch(`${API_URL}/permissions/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Không thể tải quyền truy cập");
  return response.json() as Promise<Grant[]>;
}

async function authorized<T>(token: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers } });
  if (!response.ok) throw new Error(await errorMessage(response, "Thao tác không thành công"));
  return response.json() as Promise<T>;
}

export type Club = { clubId: string; code: string; name: string; description: string; field: string; status: string };
export type Department = { departmentId: string; clubId: string; name: string; description: string; status: string };
export type Membership = { membershipId: string; userId: string; clubId: string; status: string; joinedAt: string };
export type Activity = { type: string; title: string; subject: string; at: string };
export type UserSummary = { userId: string; email: string; fullName: string; status: string };
export type MyMembership = { membershipId: string; club: Club; status: string; departments: Department[] };

export function updateProfile(token: string, fullName: string, phone: string) { return authorized<AuthUser>(token, "/auth/me", { method: "PATCH", body: JSON.stringify({ fullName, phone }) }); }
export function clubs(token: string) { return authorized<Club[]>(token, "/clubs"); }
export function createClub(token: string, input: { code: string; name: string; description?: string; field?: string; contactEmail?: string }) { return authorized<Club>(token, "/clubs", { method: "POST", body: JSON.stringify(input) }); }
export function updateClub(token: string, clubId: string, input: { name: string; description?: string; field?: string; contactEmail?: string }) { return authorized<Club>(token, `/clubs/${clubId}`, { method: "PATCH", body: JSON.stringify(input) }); }
export function users(token: string) { return authorized<UserSummary[]>(token, "/users"); }
export function myMemberships(token: string) { return authorized<MyMembership[]>(token, "/memberships/me"); }
export function departments(token: string, clubId: string) { return authorized<Department[]>(token, `/clubs/${clubId}/departments`); }
export function members(token: string, clubId: string) { return authorized<Membership[]>(token, `/clubs/${clubId}/members`); }
export function addMember(token: string, clubId: string, userId: string) { return authorized<Membership>(token, `/clubs/${clubId}/members`, { method: "POST", body: JSON.stringify({ userId }) }); }
export function addDepartmentMember(token: string, clubId: string, departmentId: string, userId: string) { return authorized<Record<string, string>>(token, `/clubs/${clubId}/departments/${departmentId}/members`, { method: "POST", body: JSON.stringify({ userId }) }); }
export function activity(token: string) { return authorized<Activity[]>(token, "/activity"); }
export function createDepartment(token: string, clubId: string, name: string, description: string) { return authorized<Department>(token, `/clubs/${clubId}/departments`, { method: "POST", body: JSON.stringify({ name, description }) }); }
export function grantPermission(token: string, userId: string, permission: string, scope: Grant["scope"], resourceId?: string) { return authorized<{ message: string }>(token, `/permissions/users/${userId}`, { method: "POST", body: JSON.stringify({ permission, scope, resourceId: resourceId || null }) }); }
export function revokePermission(token: string, userId: string, permission: string, scope: Grant["scope"], resourceId?: string) { return authorized<{ message: string }>(token, `/permissions/users/${userId}`, { method: "DELETE", body: JSON.stringify({ permission, scope, resourceId: resourceId || null }) }); }
