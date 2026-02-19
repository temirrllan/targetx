import { apiClient } from './client';
import type { Channel } from '../types/api';

export interface RawChannel {
  _id: string;
  channelId?: string;
  name?: string;
  title?: string;
  username?: string;
  description?: string;
  subscribersCount?: number;
  subscribers?: number;
  photoUrl?: string;
  isVerified?: boolean;
  scheduledPostsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const mapChannel = (raw: RawChannel): Channel => ({
  id: raw._id,
  title: raw.name || raw.title || 'Без названия',
  username: raw.username,
  description: raw.description,
  subscribers: raw.subscribersCount ?? raw.subscribers ?? 0,
  photoUrl: raw.photoUrl,
  isVerified: raw.isVerified ?? false,
  createdAt: raw.createdAt ?? new Date().toISOString(),
  updatedAt: raw.updatedAt ?? new Date().toISOString(),
});

export const channelsApi = {
  getChannels: async (): Promise<Channel[]> => {
    const res = await apiClient.get<{ channels?: RawChannel[] } | RawChannel[]>('/api/tgapp/channels');
    const raw = Array.isArray(res) ? res : (res as { channels?: RawChannel[] }).channels ?? [];
    return raw.map(mapChannel);
  },

  getChannelById: async (id: string): Promise<Channel & { scheduledPostsCount?: number; posts?: unknown[] }> => {
    const res = await apiClient.get<{ channel?: RawChannel; scheduledPostsCount?: number; posts?: unknown[] } | RawChannel>(`/api/tgapp/channels/${id}`);
    const raw = (res as { channel?: RawChannel }).channel ?? (res as RawChannel);
    const extra = res as { scheduledPostsCount?: number; posts?: unknown[] };
    return {
      ...mapChannel(raw),
      scheduledPostsCount: extra.scheduledPostsCount,
      posts: extra.posts,
    };
  },

  // Принимает channelUsername — @username или https://t.me/username
  verifyChannel: (channelUsername: string) =>
    apiClient.post<{ channel: RawChannel; postsCount?: number }>('/api/channel/verify', { channelUsername }),

  // Добавить и сразу синхронизировать
  loadChannel: (channelUsername: string) =>
    apiClient.post<{ channel: RawChannel; postsCount?: number }>('/api/channel/load', { channelUsername }),
};