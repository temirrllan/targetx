import { apiClient } from './client';
import type { Post, PostMetrics } from '../types/api';

export interface CreatePostRequest {
  channelId: string;
  title?: string;
  text?: string;
  parseMode?: 'HTML' | 'Markdown';
  disableWebPagePreview?: boolean;
  status: 'published' | 'scheduled';
  publishAt?: string; // ISO string, required when status = scheduled
  buttons?: Array<{ text: string; url: string; row?: number }>;
  // multipart fields — handled separately
  mediaType?: 'photo' | 'video' | 'document' | 'audio';
  mediaCaption?: string;
  mediaFile?: File;
  // album
  mediaGroupMeta?: Array<{ type: string; caption?: string }>;
  mediaFiles?: File[];
}

export const postsApi = {
  getPosts: (channelId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => apiClient.get<Post[]>('/api/channel/posts', { channelId, ...params }),

  /**
   * Creates a post via the TG-app endpoint.
   * Text-only → JSON body.
   * Media / album → multipart FormData.
   */
  createPost: async (data: CreatePostRequest): Promise<Post> => {
    const { channelId } = data;
    const isMultipart = !!data.mediaFile || (data.mediaFiles && data.mediaFiles.length > 0);

    if (isMultipart) {
      const form = new FormData();
      if (data.title) form.append('title', data.title);
      if (data.text) form.append('text', data.text);
      form.append('parseMode', data.parseMode ?? 'HTML');
      if (data.disableWebPagePreview) form.append('disableWebPagePreview', 'true');
      form.append('status', data.status);
      if (data.status === 'scheduled' && data.publishAt) {
        form.append('publishAt', data.publishAt);
      }
      if (data.buttons?.length) {
        form.append('buttons', JSON.stringify(data.buttons));
      }

      // single media
      if (data.mediaFile) {
        form.append('mediaType', data.mediaType ?? 'photo');
        if (data.mediaCaption) form.append('mediaCaption', data.mediaCaption);
        form.append('mediaFile', data.mediaFile);
      }

      // album
      if (data.mediaFiles?.length && data.mediaGroupMeta?.length) {
        form.append('mediaGroupMeta', JSON.stringify(data.mediaGroupMeta));
        data.mediaFiles.forEach((file) => form.append('mediaFiles', file));
      }

      return apiClient.postFormData<Post>(`/api/tgapp/channels/${channelId}/posts`, form);
    }

    // text only
    const payload: Record<string, unknown> = {
      title: data.title,
      text: data.text,
      parseMode: data.parseMode ?? 'HTML',
      status: data.status,
    };
    if (data.disableWebPagePreview) payload.disableWebPagePreview = true;
    if (data.status === 'scheduled' && data.publishAt) payload.publishAt = data.publishAt;
    if (data.buttons?.length) payload.buttons = data.buttons;

    return apiClient.post<Post>(`/api/tgapp/channels/${channelId}/posts`, payload);
  },

  getPostMetrics: (params?: {
    channelId?: string;
    startDate?: string;
    endDate?: string;
  }) => apiClient.get<PostMetrics[]>('/api/channel/posts/metrics', params),
};