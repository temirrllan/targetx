import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";
import type {
  Subscription,
  InitiateSubscriptionRequest,
  InitiateSubscriptionResponse,
} from "../types/api";

export class SubscriptionService {
  /**
   * Получает список подписок пользователя
   */
  async getSubscriptions(): Promise<Subscription[]> {
    try {
      const response = await apiClient.get<Subscription[]>(
        API_ENDPOINTS.SUBSCRIPTIONS
      );
      return response;
    } catch (error) {
      console.error("Ошибка при получении подписок:", error);
      throw error;
    }
  }

  /**
   * Инициирует новую подписку
   */
  async initiateSubscription(
    request: InitiateSubscriptionRequest
  ): Promise<InitiateSubscriptionResponse> {
    try {
      const response = await apiClient.post<InitiateSubscriptionResponse>(
        API_ENDPOINTS.INITIATE_SUBSCRIPTION,
        request
      );
      return response;
    } catch (error) {
      console.error("Ошибка при инициализации подписки:", error);
      throw error;
    }
  }

  /**
   * Обрабатывает callback после оплаты
   */
  async handleSubscriptionCallback(
    subscriptionId: string,
    callbackData: unknown
  ): Promise<void> {
    try {
      await apiClient.post(
        API_ENDPOINTS.SUBSCRIPTION_CALLBACK(subscriptionId),
        callbackData
      );
    } catch (error) {
      console.error("Ошибка при обработке callback подписки:", error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();