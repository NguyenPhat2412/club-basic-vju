import { getIntlLocale } from '@/i18n/config';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseApiError(response: Response) {
  let message = `Request failed (${response.status})`;
  let code: string | undefined;
  try {
    const body = await response.json();
    message = body.detail || body.message || body.title || message;
    code = body.code;
  } catch {
    // Non-JSON error response
  }
  return new ApiError(message, response.status, code);
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SIGN_IN_PATHS = ['/auth/login', '/auth/register', '/auth/google'];

function readCsrfCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfToken() {
  const existing = readCsrfCookie();
  if (existing) return existing;
  await fetch(`${API_BASE}/api/v1/auth/csrf`, { credentials: 'include' });
  return readCsrfCookie();
}

function redirectToLogin() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/home') {
    window.location.replace(new URL('/home?auth=login', window.location.origin));
  }
}

async function sendRequest(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Accept-Language': getIntlLocale(),
    ...((init.headers as Record<string, string>) || {}),
  };
  if (UNSAFE_METHODS.has(method)) {
    const token = await ensureCsrfToken();
    if (token) headers['X-XSRF-TOKEN'] = token;
  }
  const response = await fetch(`${API_BASE}/api/v1${path}`, { ...init, headers, credentials: 'include' });
  if (response.status === 403 && UNSAFE_METHODS.has(method) && !retried) {
    const error = await parseApiError(response.clone());
    if (error.code === 'CSRF_INVALID') {
      await fetch(`${API_BASE}/api/v1/auth/csrf`, { credentials: 'include' });
      return sendRequest(path, init, true);
    }
  }
  if (response.status === 401 && !SIGN_IN_PATHS.includes(path) && !path.startsWith('/public/')) {
    redirectToLogin();
  }
  if (!response.ok) throw await parseApiError(response);
  return response;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await sendRequest(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function apiForm<T>(path: string, form: FormData): Promise<T> {
  return (await sendRequest(path, { method: 'POST', body: form })).json();
}

export async function apiBlob(path: string): Promise<Blob> {
  return (await sendRequest(path)).blob();
}

export function cleanParams(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.set(k, String(v));
  });
  return search.toString();
}
