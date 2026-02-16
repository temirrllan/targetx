import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";
import type { User } from "../types/api";

export class UserService {
  /**
   * Получает профиль текущего пользователя
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>(API_ENDPOINTS.TGAPP_ME);
      return response;
    } catch (error) {
      console.error("Ошибка при получении профиля пользователя:", error);
      throw error;
    }
  }

  /**
   * Получает пользователя по ID
   */
  async getUserById(userId: string): Promise<User> {
    try {
      const response = await apiClient.get<User>(
        API_ENDPOINTS.USER_BY_ID(userId)
      );
      return response;
    } catch (error) {
      console.error("Ошибка при получении пользователя по ID:", error);
      throw error;
    }
  }
}

export const userService = new UserService();