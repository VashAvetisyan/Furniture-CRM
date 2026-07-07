export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.tmhub.am/api/v1';

export function mediaUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  const path = avatar.startsWith('http')
    ? new URL(avatar).pathname
    : avatar;
  return `/api/media?path=${encodeURIComponent(path)}`;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

function redirectToLogin() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body:    JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { access: string };
    localStorage.setItem('token', data.access);
    return data.access;
  } catch {
    return null;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function doFetch(url: string, method: string, body: unknown, token: string | null): Promise<Response> {
  const headers: HeadersInit = { 'ngrok-skip-browser-warning': 'true' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const url = `${BASE_URL}${endpoint}`.replace(/\/?(\?|$)/, '/$1');

  let token = auth ? getToken() : null;
  let res = await doFetch(url, method, body, token);

  // Token expired — try refresh once
  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      token = newToken;
      res = await doFetch(url, method, body, token);
    } else {
      redirectToLogin();
      throw new ApiError(401, 'Նիստն ավարտվել է');
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail ?? data.message ?? data.error ?? 'Սերվերի սխալ');
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
