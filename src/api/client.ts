import { fetchData, type QueryParams, type HttpMethod } from './ApiSett';

interface RequestConfig extends Omit<RequestInit, 'method' | 'body'> {
  method?: HttpMethod;
  params?: QueryParams;
  body?: unknown;
}

class ApiClientCompat {
  request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    return fetchData<T>({
      method: config.method ?? 'GET',
      url: endpoint,
      body: config.body as Record<string, unknown> | FormData | undefined,
      params: config.params,
      headers: config.headers,
    });
  }

  get<T>(endpoint: string, params?: QueryParams): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: formData });
  }
}

export const apiClient = new ApiClientCompat();

