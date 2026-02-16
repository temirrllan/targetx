import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";
import type {
  Channel,
  ChannelSummary,
  VerifyChannelRequest,
  VerifyChannelResponse,
  LoadChannelRequest,
  LoadChannelResponse,
  UpsertChannelProfileRequest,
  Post,
  PostMetrics,
  CreatePostRequest,
} from "../types/api";

export class ChannelService {
  /**
   * Получает список каналов пользователя
   */
  async getChannels(): Promise<ChannelSummary[]> {
    try {
      const response = await apiClient.get<ChannelSummary[]>(
        API_ENDPOINTS.TGAPP_CHANNELS
      );
      return response;
    } catch (error) {
      console.error("Ошибка при получении списка каналов:", error);
      throw error;
    }
  }

  /**
   * Получает детальную информацию о канале
   */
  async getChannelDetails(channelId: string): Promise<Channel> {
    try {
      const response = await apiClient.get<Channel>(
        API_ENDPOINTS.TGAPP_CHANNEL_DETAILS(channelId)
      );
      return response;
    } catch (error) {
      console.error("Ошибка при получении деталей канала:", error);
      throw error;
    }
  }

  /**
   * Верифицирует канал
   */
  async verifyChannel(
    request: VerifyChannelRequest
  ): Promise<VerifyChannelResponse> {
    try {
      const response = await apiClient.post<VerifyChannelResponse>(
        API_ENDPOINTS.CHANNEL_VERIFY,
        request
      );
      return response;
    } catch (error) {
      console.error("Ошибка при верификации канала:", error);
      throw error;
    }
  }

  /**
   * Загружает информацию о канале
   */
  async loadChannel(
    request: LoadChannelRequest
  ): Promise<LoadChannelResponse> {
    try {
      const response = await apiClient.post<LoadChannelResponse>(
        API_ENDPOINTS.CHANNEL_LOAD,
        request
      );
      return response;
    } catch (error) {
      console.error("Ошибка при загрузке канала:", error);
      throw error;
    }
  }

  /**
   * Обновляет профиль канала
   */
  async upsertChannelProfile(
    request: UpsertChannelProfileRequest
  ): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.CHANNEL_PROFILE, request);
    } catch (error) {
      console.error("Ошибка при обновлении профиля канала:", error);
      throw error;
    }
  }

  /**
   * Получает список постов канала
   */
  async getChannelPosts(channelId: string): Promise<Post[]> {
    try {
      const response = await apiClient.get<Post[]>(
        API_ENDPOINTS.CHANNEL_POSTS,
        {
          params: { channelId },
        }
      );
      return response;
    } catch (error) {
      console.error("Ошибка при получении постов канала:", error);
      throw error;
    }
  }

  /**
   * Создает пост
   */
  async createPost(request: CreatePostRequest): Promise<Post> {
    try {
      const response = await apiClient.post<Post>(
        API_ENDPOINTS.TGAPP_MANUAL_POST(request.channelId),
        request
      );
      return response;
    } catch (error) {
      console.error("Ошибка при создании поста:", error);
      throw error;
    }
  }

  /**
   * Получает метрики постов
   */
  async getPostMetrics(postIds: string[]): Promise<PostMetrics[]> {
    try {
      const response = await apiClient.get<PostMetrics[]>(
        API_ENDPOINTS.CHANNEL_POST_METRICS,
        {
          params: { postIds: postIds.join(",") },
        }
      );
      return response;
    } catch (error) {
      console.error("Ошибка при получении метрик постов:", error);
      throw error;
    }
  }
}

export const channelService = new ChannelService();