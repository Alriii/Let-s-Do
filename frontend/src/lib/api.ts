function resolveBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '');
  if (!envUrl) {
    return 'http://127.0.0.1:8000/api/v1';
  }
  // Automatically normalize e.g. "https://let-s-do.onrender.com" to ".../api/v1"
  if (!envUrl.includes('/api')) {
    return `${envUrl}/api/v1`;
  }
  return envUrl;
}

const BASE_URL = resolveBaseUrl();

const TOKEN_KEY = 'letsdo.token';

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;
  data: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    errors: Record<string, string[]> = {},
    data: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.data = data;
  }

  /** First validation message, useful for inline form errors. */
  firstError(field?: string): string | null {
    if (field) {
      return this.errors[field]?.[0] ?? null;
    }

    const first = Object.values(this.errors)[0];

    return first?.[0] ?? null;
  }
}

export const tokenStore = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = tokenStore.get();
  const headers = new Headers({ Accept: 'application/json' });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let body: BodyInit | undefined;

  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    });
  } catch {
    throw new ApiError(0, 'Unable to reach the server. Check that the API is running.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const data = (payload ?? {}) as {
      message?: string;
      errors?: Record<string, string[]>;
      [key: string]: unknown;
    };

    if (response.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event('letsdo:unauthorized'));
    }

    throw new ApiError(
      response.status,
      data.message ?? `Request failed with status ${response.status}.`,
      data.errors ?? {},
      data,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
};

export { BASE_URL };
