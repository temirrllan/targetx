// Базовый URL бэкенда — замените на реальный если нужно
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

function getTgInitData(): string {
  try {
    return window.Telegram?.WebApp?.initData ?? '';
  } catch {
    return '';
  }
}

type FetchOptions = RequestInit & {
  json?: unknown;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { json, headers: extraHeaders, body, ...rest } = options;

  const headers = new Headers(extraHeaders as HeadersInit | undefined);
  headers.set('X-Telegram-Init-Data', getTgInitData());

  let resolvedBody: BodyInit | undefined;

  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    resolvedBody = JSON.stringify(json);
  } else if (body instanceof FormData) {
    // не ставим Content-Type — браузер сам с boundary
    resolvedBody = body;
  } else {
    resolvedBody = body as BodyInit | undefined;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    body: resolvedBody,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const err = (await response.json()) as { message?: string; error?: string };
      message = err.message ?? err.error ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}