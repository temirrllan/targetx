export const API_BASE_URL = "https://targetx-back.farmhub.pro";

export const API_ENDPOINTS = {
  // Billing
  SUBSCRIPTIONS: "/api/billing/subscriptions",
  SUBSCRIPTION_CALLBACK: (id: string) => `/api/billing/subscriptions/${id}/callback`,
  INITIATE_SUBSCRIPTION: "/api/billing/subscriptions/initiate",
  
  // Channel
  CHANNEL_LOAD: "/api/channel/load",
  CHANNEL_POSTS: "/api/channel/posts",
  CHANNEL_POST_CREATE: "/api/channel/posts",
  CHANNEL_POST_METRICS: "/api/channel/posts/metrics",
  CHANNEL_PROFILE: "/api/channel/profile",
  CHANNEL_VERIFY: "/api/channel/verify",
  
  // TG App
  TGAPP_CHANNELS: "/api/tgapp/channels",
  TGAPP_CHANNEL_DETAILS: (id: string) => `/api/tgapp/channels/${id}`,
  TGAPP_MANUAL_POST: (id: string) => `/api/tgapp/channels/${id}/posts`,
  TGAPP_ME: "/api/tgapp/me",
  
  // Users
  USER_BY_ID: (id: string) => `/api/users/${id}`,
} as const;