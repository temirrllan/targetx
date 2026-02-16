import { apiClient } from './client';
import type { User } from '../types/api';

export const authApi = {
  getCurrentUser: () => apiClient.get<User>('/api/tgapp/me'),
  
  getUserById: (id: string) => apiClient.get<User>(`/api/users/${id}`),
};