import { fetchData } from './ApiSett';
import type { Subscription } from '../types/api';

export const billingApi = {
  getSubscriptions: () =>
    fetchData<Subscription[]>({
      method: 'GET',
      url: '/api/billing/subscriptions',
    }),

  initiateSubscription: (data: {
    plan: 'plus' | 'prem';
    userId: string;
  }) =>
    fetchData<{ paymentUrl: string }>({
      method: 'POST',
      url: '/api/billing/subscriptions/initiate',
      body: data,
    }),

  subscriptionCallback: (id: string, data: Record<string, unknown>) =>
    fetchData<{ success: boolean }>({
      method: 'POST',
      url: `/api/billing/subscriptions/${id}/callback`,
      body: data,
    }),
};
