const API_BASE_URL = 'https://targetx-back.farmhub.pro';

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

const isDevelopment = import.meta.env.DEV;
const DEV_INIT_DATA = import.meta.env.VITE_DEV_INIT_DATA || '';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  getInitData(): string {
    if (window.Telegram?.WebApp?.initData) {
      return window.Telegram.WebApp.initData;
    }
    if (isDevelopment && DEV_INIT_DATA) {
      return DEV_INIT_DATA;
    }
    return '';
  }

  private getHeaders(): HeadersInit {
    const initData = this.getInitData();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (initData) {
      headers['Authorization'] = `Bearer ${initData}`;
    }
    return headers;
  }

  private buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean>
  ): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { params, ...fetchConfig } = config;
    const url = this.buildUrl(endpoint, params);
    const initData = this.getInitData();

    if (!initData) {
      throw new Error('Missing initData token — открой приложение через Telegram');
    }

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        headers: {
          ...this.getHeaders(),
          ...fetchConfig.headers,
        },
      });

      console.log('📥', config.method || 'GET', endpoint, '→', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error body:', errorText);
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return await response.json() as T;

    } catch (error: unknown) {
      if (error instanceof TypeError) {
        console.error('💥 Network/CORS:', error.message);
        throw new Error(`Сетевая ошибка: ${error.message}`);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Неизвестная ошибка');
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = this.buildUrl(endpoint);
    const initData = this.getInitData();

    if (!initData) {
      throw new Error('Missing initData token');
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${initData}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return await response.json() as T;
    } catch (error: unknown) {
      if (error instanceof TypeError) {
        throw new Error(`Сетевая ошибка: ${error.message}`);
      }
      throw error;
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);