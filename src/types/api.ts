export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  subscription: 'not_paid' | 'plus' | 'prem';
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  title: string;
  username?: string;
  description?: string;
  subscribers: number;
  photoUrl?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  channelId: string;
  content: string;
  mediaUrls?: string[];
  scheduledAt?: string;
  publishedAt?: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  views?: number;
  reactions?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostMetrics {
  postId: string;
  views: number;
  reactions: number;
  shares: number;
  comments: number;
  date: string;
}

export interface CreatePostRequest {
  channelId: string;
  content: string;
  media?: File[];
  scheduledAt?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: 'plus' | 'prem';
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
}

export interface ChannelStats {
  channelId: string;
  period: 'day' | 'week' | 'month';
  views: number[];
  subscribers: number[];
  engagement: number[];
  labels: string[];
}