import { clearApiCache, fetchData } from './ApiSett';
import type { Post, PostMetrics } from '../types/api';

export interface CreatePostRequest {
  channelId: string;
  title?: string;
  text?: string;
  parseMode?: 'HTML' | 'Markdown';
  disableWebPagePreview?: boolean;
  status: 'published' | 'scheduled';
  publishAt?: string;
  buttons?: Array<{ text: string; url: string; row?: number }>;
  mediaType?: 'photo' | 'video' | 'document' | 'audio';
  mediaCaption?: string;
  mediaFile?: File;
  mediaGroupMeta?: Array<{ type: string; caption?: string }>;
  mediaFiles?: File[];
}

type CreatePostResponse = Post | Record<string, unknown>;
type CancelScheduledPostResponse = { message?: string; success?: boolean } | Record<string, unknown>;

type CancelAttempt = {
  method: 'DELETE' | 'POST';
  url: string;
  params?: Record<string, string>;
  body?: Record<string, string>;
};

const buildTextPayload = (data: CreatePostRequest): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    title: data.title,
    text: data.text,
    parseMode: data.parseMode ?? 'HTML',
    status: data.status,
  };

  if (data.disableWebPagePreview) {
    payload.disableWebPagePreview = true;
  }
  if (data.status === 'scheduled' && data.publishAt) {
    payload.publishAt = data.publishAt;
    payload.scheduledAt = data.publishAt;
  }
  if (data.buttons?.length) {
    payload.buttons = data.buttons;
  }

  return payload;
};

const buildFormDataPayload = (data: CreatePostRequest): FormData => {
  const form = new FormData();

  if (data.title) form.append('title', data.title);
  if (data.text) form.append('text', data.text);

  form.append('parseMode', data.parseMode ?? 'HTML');
  form.append('status', data.status);

  if (data.disableWebPagePreview) {
    form.append('disableWebPagePreview', 'true');
  }
  if (data.status === 'scheduled' && data.publishAt) {
    form.append('publishAt', data.publishAt);
    form.append('scheduledAt', data.publishAt);
  }
  if (data.buttons?.length) {
    form.append('buttons', JSON.stringify(data.buttons));
  }

  if (data.mediaFile) {
    form.append('mediaType', data.mediaType ?? 'photo');
    if (data.mediaCaption) {
      form.append('mediaCaption', data.mediaCaption);
    }
    form.append('mediaFile', data.mediaFile);
  }

  if (data.mediaFiles?.length && data.mediaGroupMeta?.length) {
    form.append('mediaGroupMeta', JSON.stringify(data.mediaGroupMeta));
    data.mediaFiles.forEach((file) => form.append('mediaFiles', file));
  }

  return form;
};

export const postsApi = {
  getPosts: (channelId: string, params?: { page?: number; limit?: number; status?: string }) =>
    fetchData<Post[]>({
      method: 'GET',
      url: '/api/channel/posts',
      params: { channelId, ...params },
    }),

  createPost: (data: CreatePostRequest): Promise<CreatePostResponse> => {
    const endpoint = `/api/tgapp/channels/${data.channelId}/posts`;
    const isMultipart = !!data.mediaFile || !!(data.mediaFiles && data.mediaFiles.length > 0);

    return fetchData<CreatePostResponse>({
      method: 'POST',
      url: endpoint,
      body: isMultipart ? buildFormDataPayload(data) : buildTextPayload(data),
    }).then((response) => {
      clearApiCache();
      return response;
    });
  },

  getPostMetrics: (params?: { channelId?: string; startDate?: string; endDate?: string }) =>
    fetchData<PostMetrics[]>({
      method: 'GET',
      url: '/api/channel/posts/metrics',
      params,
    }),

  cancelScheduledPost: async (
    channelId: string,
    postId: string
  ): Promise<CancelScheduledPostResponse> => {
    const attempts: CancelAttempt[] = [
      {
        method: 'DELETE',
        url: `/api/tgapp/channels/${channelId}/posts/${postId}`,
      },
      {
        method: 'POST',
        url: `/api/tgapp/channels/${channelId}/posts/${postId}/cancel`,
      },
      {
        method: 'DELETE',
        url: `/api/channel/posts/${postId}`,
        params: { channelId },
      },
      {
        method: 'POST',
        url: `/api/channel/posts/${postId}/cancel`,
        body: { channelId },
      },
      {
        method: 'POST',
        url: '/api/channel/post/cancel',
        body: { channelId, postId },
      },
    ];

    let lastError: unknown = null;

    for (const attempt of attempts) {
      try {
        const response = await fetchData<CancelScheduledPostResponse>({
          method: attempt.method,
          url: attempt.url,
          params: attempt.params,
          body: attempt.body ?? {},
        });
        clearApiCache();
        return response;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error('Failed to cancel scheduled post');
  },
};

