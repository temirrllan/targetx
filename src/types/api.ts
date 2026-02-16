// ─── User ───────────────────────────────────────────────────────────────────

export type ApiUser = {
  _id: string;
  tgId: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  isPremium?: boolean;
  points?: number;
};

// ─── Channel ─────────────────────────────────────────────────────────────────

export type ApiChannel = {
  _id: string;
  channelId: string;
  name?: string;
  username?: string;
  subscribersCount?: number;
  isVerified?: boolean;
  scheduledPostsCount?: number;
};

// ─── Post ────────────────────────────────────────────────────────────────────

export type ApiPostMetrics = {
  views?: number;
  reactions?: number;
  comments?: number;
  forwards?: number;
};

export type ApiPost = {
  _id: string;
  title?: string;
  text?: string;
  status: 'published' | 'scheduled' | 'draft';
  publishedAt?: string;
  publishAt?: string;
  views?: number;
  forwards?: number;
  tgMessageId?: number;
  metrics?: ApiPostMetrics;
};

// ─── Responses ───────────────────────────────────────────────────────────────

export type MeResponse = {
  user: ApiUser;
  channels: ApiChannel[];
};

export type ChannelDetailsResponse = {
  channel: ApiChannel;
  posts: ApiPost[];
  scheduledPostsCount?: number;
};

export type VerifyChannelResponse = {
  channel: ApiChannel;
  postsCount?: number;
};

export type LoadChannelResponse = {
  channel: ApiChannel;
  postsCount?: number;
};

export type CreatePostResponse = {
  post: ApiPost;
};

// ─── Post body ───────────────────────────────────────────────────────────────

export type InlineButton = {
  text: string;
  url: string;
  row?: number;
};

export type CreatePostPayload = {
  title?: string;
  text?: string;
  parseMode?: 'HTML' | 'Markdown';
  disableWebPagePreview?: boolean;
  status: 'published' | 'scheduled';
  publishAt?: string;
  buttons?: InlineButton[];
};

// FormData payload (multipart) — собираем через FormData напрямую