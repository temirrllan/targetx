import { apiClient } from './client';
import type { Post, PostMetrics, CreatePostRequest } from '../types/api';

export const postsApi = {
  getPosts: (channelId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => apiClient.get<Post[]>('/api/channel/posts', { channelId, ...params }),
  
  createPost: async (data: CreatePostRequest) => {
    if (data.media && data.media.length > 0) {
      const formData = new FormData();
      formData.append('channelId', data.channelId);
      formData.append('content', data.content);
      
      if (data.scheduledAt) {
        formData.append('scheduledAt', data.scheduledAt);
      }
      
      data.media.forEach((file, index) => {
        formData.append(`media[${index}]`, file);
      });
      
      return apiClient.postFormData<Post>('/api/channel/posts', formData);
    }
    
    return apiClient.post<Post>('/api/channel/posts', {
      channelId: data.channelId,
      content: data.content,
      scheduledAt: data.scheduledAt,
    });
  },
  
  manualPost: (channelId: string, data: {
    content: string;
    media?: File[];
  }) => {
    if (data.media && data.media.length > 0) {
      const formData = new FormData();
      formData.append('content', data.content);
      
      data.media.forEach((file, index) => {
        formData.append(`media[${index}]`, file);
      });
      
      return apiClient.postFormData<Post>(`/api/tgapp/channels/${channelId}/posts`, formData);
    }
    
    return apiClient.post<Post>(`/api/tgapp/channels/${channelId}/posts`, {
      content: data.content,
    });
  },
  
  getPostMetrics: (params?: {
    channelId?: string;
    startDate?: string;
    endDate?: string;
  }) => apiClient.get<PostMetrics[]>('/api/channel/posts/metrics', params),
};