import { API_BASE_URL } from "../config/api";
import { getAuthToken } from "../utils/telegram";

export class ApiError extends Error {
  public status: number;
  public response?: unknown;

  constructor(message: string, status: number, response?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.response = response;
  }
}

export interface ApiRequestOptions extends RequestInit {
  requiresAuth?: boolean;
  params?: Record<string, string | number | boolean>;
}

/**
 * Основной класс для работы с API
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Создает заголовки для запроса
   */
  private createHeaders(requiresAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (requiresAuth) {
      const token = getAuthToken();
      // Отправляем RAW initData напрямую в заголовке Authorization
      headers["Authorization"] = token;
      
      // Логируем для отладки (только первые 50 символов)
      console.log("Authorization header:", token.substring(0, 50) + "...");
    }

    return headers;
  }

  /**
   * Добавляет query параметры к URL
   */
  private addQueryParams(
    url: string,
    params?: Record<string, string | number | boolean>
  ): string {
    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });

    return `${url}?${searchParams.toString()}`;
  }

  /**
   * Выполняет HTTP запрос
   */
  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const {
      requiresAuth = true,
      params,
      headers: customHeaders,
      ...fetchOptions
    } = options;

    const url = this.addQueryParams(`${this.baseUrl}${endpoint}`, params);
    const headers = {
      ...this.createHeaders(requiresAuth),
      ...customHeaders,
    };

    console.log(`API Request: ${fetchOptions.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      console.log(`API Response: ${response.status} ${response.statusText}`);

      // Проверяем статус ответа
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorResponse;

        try {
          errorResponse = await response.json();
          errorMessage = errorResponse.message || errorResponse.error || errorMessage;
          console.error("API Error Response:", errorResponse);
        } catch {
          // Если не удалось распарсить JSON, используем текст
          try {
            errorMessage = await response.text();
            console.error("API Error Text:", errorMessage);
          } catch {
            // Игнорируем ошибки парсинга
          }
        }

        throw new ApiError(errorMessage, response.status, errorResponse);
      }

      // Проверяем, есть ли тело ответа
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        console.log("API Success:", data);
        return data;
      }

      // Если нет JSON, возвращаем пустой объект
      return {} as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Обработка сетевых ошибок
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new ApiError(
          "Ошибка сети. Проверьте подключение к интернету.",
          0
        );
      }

      throw new ApiError(
        error instanceof Error ? error.message : "Неизвестная ошибка",
        0
      );
    }
  }

  /**
   * GET запрос
   */
  async get<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  /**
   * POST запрос
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT запрос
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE запрос
   */
  async delete<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  /**
   * PATCH запрос
   */
  async patch<T>(
    endpoint: string,
    data?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Создаем и экспортируем единственный экземпляр
export const apiClient = new ApiClient(API_BASE_URL);
