// Типы для пользователя
export interface User {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  photoUrl?: string;
  subscription: "not_paid" | "plus" | "prem";
}

// Типы для канала
export interface Channel {
  id: string;
  title: string;
  username?: string;
  description?: string;
  subscribersCount: number;
  isVerified: boolean;
  photoUrl?: string;
}

export interface ChannelSummary {
  id: string;
  title: string;
  subscribers: number;
  scheduledPosts: number;
  accent: string;
  username?: string;
  photoUrl?: string;
}

// Типы для постов
export interface Post {
  id: string;
  channelId: string;
  content: string;
  mediaUrls?: string[];
  scheduledAt?: string;
  publishedAt?: string;
  status: "draft" | "scheduled" | "published" | "failed";
  views?: number;
  reactions?: number;
}

export interface PostMetrics {
  views: number;
  reactions: number;
  shares: number;
  comments: number;
}

export interface CreatePostRequest {
  channelId: string;
  content: string;
  mediaUrls?: string[];
  scheduledAt?: string;
}

// Типы для подписок
export interface Subscription {
  id: string;
  userId: number;
  tier: "plus" | "prem";
  status: "active" | "cancelled" | "expired";
  startDate: string;
  endDate: string;
  price: number;
}

export interface InitiateSubscriptionRequest {
  tier: "plus" | "prem";
  paymentMethod: string;
}

export interface InitiateSubscriptionResponse {
  subscriptionId: string;
  paymentUrl: string;
}

// Типы для верификации канала
export interface VerifyChannelRequest {
  channelUsername: string;
}

export interface VerifyChannelResponse {
  channelId: string;
  isVerified: boolean;
  isOwner: boolean;
}

// Типы для загрузки канала
export interface LoadChannelRequest {
  channelUsername: string;
}

export interface LoadChannelResponse {
  channel: Channel;
  posts: Post[];
}

// Типы для профиля канала
export interface UpsertChannelProfileRequest {
  channelId: string;
  title?: string;
  description?: string;
}

// Общие типы для API ответов
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Типы для ошибок
export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}