export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type ApiError = { message: string; code?: string };

async function parseError(res: Response): Promise<ApiError> {
  const text = await res.text();
  try {
    const data = text ? JSON.parse(text) : {};
    if (data?.error?.message) return { message: data.error.message, code: data.error.code };
    if (data?.detail) return { message: data.detail };
    if (data?.errors?.length) return { message: data.errors[0].message || 'Request failed' };
  } catch {
    // ignore
  }
  return { message: text || `Request failed (${res.status})` };
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = new Headers(opts.headers || {});
  headers.set('Accept', 'application/json');
  if (opts.token) headers.set('Authorization', `Bearer ${opts.token}`);
  if (opts.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(err.message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => undefined);
  return data as T;
}

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
};
