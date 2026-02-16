import { apiClient } from './client';
import type { Channel } from '../types/api';

export const channelsApi = {
  getChannels: () => apiClient.get<Channel[]>('/api/tgapp/channels'),
  
  getChannelById: (id: string) => apiClient.get<Channel>(`/api/tgapp/channels/${id}`),
  
  loadChannel: (data: { channelId: string; accessToken?: string }) => 
    apiClient.post<Channel>('/api/channel/load', data),
  
  verifyChannel: (data: { channelId: string }) => 
    apiClient.post<{ verified: boolean }>('/api/channel/verify', data),
  
  upsertChannelProfile: (data: {
    channelId: string;
    title?: string;
    description?: string;
    photoUrl?: string;
  }) => apiClient.post<Channel>('/api/channel/profile', data),
};