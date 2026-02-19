import { apiClient } from './client';
import type { Subscription } from '../types/api';

export const billingApi = {
  getSubscriptions: () => apiClient.get<Subscription[]>('/api/billing/subscriptions'),
  
  initiateSubscription: (data: {
    plan: 'plus' | 'prem';
    userId: string;
  }) => apiClient.post<{ paymentUrl: string }>('/api/billing/subscriptions/initiate', data),
  
  subscriptionCallback: (id: string, data: unknown) => 
    apiClient.post<{ success: boolean }>(`/api/billing/subscriptions/${id}/callback`, data),
};