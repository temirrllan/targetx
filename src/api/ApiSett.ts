const FALLBACK_API_BASE_URL = 'https://targetx-back.farmhub.pro';

const DEV_INIT_DATA = import.meta.env.VITE_DEV_INIT_DATA || '';
const IS_DEV = import.meta.env.DEV;

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || FALLBACK_API_BASE_URL
).replace(/\/+$/, '');

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

export type QueryParamValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryParamValue>;

export interface FetchDataConfig<TBody = Record<string, unknown>> {
  method?: HttpMethod;
  url: string;
  body?: TBody | FormData;
  param?: QueryParams;
  params?: QueryParams;
  headers?: HeadersInit;
  cacheTtlMs?: number;
}

export class ApiRequestError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.details = details;
  }
}

const responseCache = new Map<string, { expiresAt: number; data: unknown }>();
const inFlightGetRequests = new Map<string, Promise<unknown>>();

const shouldAttachBody = (method: HttpMethod, body: unknown): boolean => {
  if (method === 'GET' || method === 'HEAD') {
    return false;
  }
  if (body instanceof FormData) {
    return true;
  }
  if (body == null) {
    return false;
  }
  if (typeof body === 'object') {
    return Object.keys(body as Record<string, unknown>).length > 0;
  }
  return true;
};

const readResponseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const getErrorMessage = (fallback: string, payload: unknown): string => {
  if (!payload) {
    return fallback;
  }
  if (typeof payload === 'string') {
    return payload;
  }
  if (typeof payload === 'object') {
    const maybe = payload as { message?: string; error?: string };
    if (typeof maybe.message === 'string') {
      return maybe.message;
    }
    if (typeof maybe.error === 'string') {
      return maybe.error;
    }
  }
  return fallback;
};

const buildUrl = (url: string, params?: QueryParams): string => {
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  const full = new URL(normalizedPath, `${API_BASE_URL}/`);

  if (!params) {
    return full.toString();
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }
    full.searchParams.append(key, String(value));
  });

  return full.toString();
};

const getInitData = (): string => {
  const tgInitData = window.Telegram?.WebApp?.initData;
  if (tgInitData) {
    return tgInitData;
  }
  if (IS_DEV && DEV_INIT_DATA) {
    return DEV_INIT_DATA;
  }
  return '';
};

const withDefaultHeaders = (
  customHeaders: HeadersInit | undefined,
  initData: string,
  attachJsonContentType: boolean
): Headers => {
  const headers = new Headers(customHeaders);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (!headers.has('Authorization') && initData) {
    headers.set('Authorization', `Bearer ${initData}`);
  }
  if (attachJsonContentType && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
};

export const fetchData = <TResponse, TBody = Record<string, unknown>>({
  method = 'GET',
  url,
  body = {} as TBody,
  param,
  params,
  headers,
  cacheTtlMs = 0,
}: FetchDataConfig<TBody>): Promise<TResponse> => {
  const initData = getInitData();
  if (!initData) {
    throw new Error('Missing Telegram initData token');
  }

  const queryParams = param ?? params;
  const fullUrl = buildUrl(url, queryParams);
  const cacheKey = `${method}:${fullUrl}`;
  const canUseCache = method === 'GET' && cacheTtlMs > 0;

  if (canUseCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached.data as TResponse);
    }
    if (cached) {
      responseCache.delete(cacheKey);
    }

    const inFlight = inFlightGetRequests.get(cacheKey);
    if (inFlight) {
      return inFlight as Promise<TResponse>;
    }
  }

  const attachBody = shouldAttachBody(method, body);
  const isFormData = body instanceof FormData;
  const requestHeaders = withDefaultHeaders(headers, initData, attachBody && !isFormData);

  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (attachBody) {
    requestInit.body = isFormData ? body : JSON.stringify(body);
  }

  console.log(`[API] -> ${method} ${url}`, queryParams ? { params: queryParams } : undefined);

  const requestPromise = fetch(fullUrl, requestInit)
    .then(async (response) => {
      const responseBody = await readResponseBody(response);
      console.log(`[API] <- ${method} ${url} [${response.status}]`);

      if (!response.ok) {
        const fallbackMessage = `HTTP ${response.status}`;
        const message = getErrorMessage(fallbackMessage, responseBody);
        console.error(`[API] !! ${method} ${url}`, responseBody);
        throw new ApiRequestError(message, response.status, responseBody);
      }

      if (canUseCache) {
        responseCache.set(cacheKey, {
          expiresAt: Date.now() + cacheTtlMs,
          data: responseBody,
        });
      }

      return responseBody as TResponse;
    })
    .catch((error: unknown) => {
      if (error instanceof ApiRequestError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Unexpected network error';
      console.error(`[API] xx ${method} ${url}`, error);
      throw new Error(`Network error: ${message}`);
    })
    .finally(() => {
      if (canUseCache) {
        inFlightGetRequests.delete(cacheKey);
      }
    });

  if (canUseCache) {
    inFlightGetRequests.set(cacheKey, requestPromise as Promise<unknown>);
  }

  return requestPromise;
};

export const clearApiCache = () => {
  responseCache.clear();
  inFlightGetRequests.clear();
};

export const ApiSett = {
  API_BASE_URL,
  fetchData,
  clearApiCache,
  getInitData,
};
