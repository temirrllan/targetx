import { apiClient } from './client';
import type { Channel } from '../types/api';

// Формат канала от бэкенда
interface RawChannel {
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

interface ChannelsResponse {
  channels?: RawChannel[];
}

interface ChannelResponse {
  channel?: RawChannel;
  scheduledPostsCount?: number;
  posts?: unknown[];
}

const mapChannel = (raw: RawChannel): Channel => ({
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
    const res = await apiClient.get<ChannelsResponse | RawChannel[]>('/api/tgapp/channels');
    // Бэкенд может вернуть { channels: [...] } или просто [...]
    const raw = Array.isArray(res) ? res : (res as ChannelsResponse).channels ?? [];
    return raw.map(mapChannel);
  },

  getChannelById: async (id: string): Promise<Channel> => {
    const res = await apiClient.get<ChannelResponse | RawChannel>(`/api/tgapp/channels/${id}`);
    const raw = (res as ChannelResponse).channel ?? (res as RawChannel);
    return mapChannel(raw);
  },

  loadChannel: (data: { channelId?: string; channelUsername?: string; accessToken?: string }) =>
    apiClient.post<{ channel: RawChannel }>('/api/channel/load', data),

  verifyChannel: (data: { channelId?: string; channelUsername?: string }) =>
    apiClient.post<{ verified: boolean; channel?: RawChannel }>('/api/channel/verify', data),

  upsertChannelProfile: (data: {
    channelId: string;
    title?: string;
    description?: string;
    photoUrl?: string;
  }) => apiClient.post<RawChannel>('/api/channel/profile', data),
};