const API_BASE_URL = 'https://targetx-back.farmhub.pro';

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

// Development mode detection
const isDevelopment = import.meta.env.DEV;

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Add Telegram WebApp init data if available
    if (window.Telegram?.WebApp?.initData) {
      headers['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
      console.log('✅ Telegram init data added to headers');
    } else if (isDevelopment) {
      console.warn('⚠️ Development mode: No Telegram init data - using mock');
      // In development, you might want to add a mock token or skip auth
    } else {
      console.error('❌ No Telegram init data available');
    }

    return headers;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
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

    console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        headers: {
          ...this.getHeaders(),
          ...fetchConfig.headers,
        },
      });

      console.log(`📡 API Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ API Response Data:', data);
      return data;
    } catch (error) {
      console.error('💥 API request failed:', error);
      throw error;
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
    const headers: HeadersInit = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (window.Telegram?.WebApp?.initData) {
      headers['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
    }

    console.log(`🌐 API Request (FormData): POST ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      console.log(`📡 API Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ API Response Data:', data);
      return data;
    } catch (error) {
      console.error('💥 API request failed:', error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);