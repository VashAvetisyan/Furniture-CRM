import { useAuthStore } from '@/stores';

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
    // Keep the persisted auth flag in sync — otherwise a stale isAuthenticated:true
    // survives the reload below and immediately bounces /login back to /dashboard,
    // which 401s again with no tokens and calls back into this function forever.
    useAuthStore.getState().logout();
    window.location.href = '/login';
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body:    JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { access: string; refresh?: string };
    localStorage.setItem('token', data.access);
    // Some SIMPLE_JWT configs rotate the refresh token on every use (and
    // blacklist the old one) — if the response includes a new one, we must
    // store it or the *next* refresh will fail with an already-used token.
    if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
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

// Some endpoints are used by the frontend as "give me the full list" (autocompletes,
// totals, kanban boards) even though the backend paginates them (~25/page). Ask for
// a much larger page (the DRF paginator's `page_size` override, confirmed working on
// `/tasks/`) so the common case is a single request, then fire any remaining pages in
// parallel instead of chaining requests one `next` at a time — far fewer round trips.
const BULK_PAGE_SIZE = 200;

export async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
  type Page = T[] | { results: T[]; next: string | null; count?: number };

  const sep = endpoint.includes('?') ? '&' : '?';
  const first: Page = await request(`${endpoint}${sep}page_size=${BULK_PAGE_SIZE}`, { method: 'GET' });
  if (Array.isArray(first)) return first;

  const all = [...(first.results ?? [])];
  const pageSize = all.length;
  const count = first.count ?? all.length;
  if (!first.next || pageSize === 0 || count <= pageSize) return all;

  const totalPages = Math.ceil(count / pageSize);
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      request<Page>(`${endpoint}${sep}page_size=${BULK_PAGE_SIZE}&page=${i + 2}`, { method: 'GET' })
    ),
  );

  for (const res of rest) {
    all.push(...(Array.isArray(res) ? res : (res.results ?? [])));
  }

  return all;
}
