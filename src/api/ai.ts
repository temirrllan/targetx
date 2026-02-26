import { fetchData, type QueryParams } from './ApiSett';

export interface AiRequestPayload {
  [key: string]: unknown;
}

export type AiSessionStatus = 'active' | 'closed';
export type AiMessageRole = 'system' | 'user' | 'assistant';
export type AiMessageKind = 'system_prompt' | 'seed_posts' | 'user' | 'assistant';

export interface AiSessionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface AiSessionConfig {
  sessionTtlMinutes: number;
  maxSessionTokens: number;
  maxCompletionTokens: number;
  maxContextMessages: number;
  maxContextInputTokens: number;
  seedPostsCount: number;
}

export interface AiSession {
  id: string;
  status: AiSessionStatus;
  model: string;
  startedAt: string;
  expiresAt: string;
  closedAt: string | null;
  closeReason: string | null;
  messageCount: number;
  seedPostsCount: number;
  usage: AiSessionUsage;
  config: AiSessionConfig;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessageUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AiMessage {
  id: string;
  role: AiMessageRole;
  kind: AiMessageKind;
  content: string;
  model?: string;
  tokenEstimate: number;
  usage: AiMessageUsage;
  createdAt: string;
  updatedAt: string;
}

export interface AiSessionsResponse {
  sessions: AiSession[];
}

export interface AiMessagesResponse {
  session: AiSession;
  messages: AiMessage[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextBefore: string | null;
  };
}

export interface AiSendMessagePayload extends Record<string, unknown> {
  message: string;
  useWebSearch?: boolean;
  forceNewSession?: boolean;
}

export interface AiSendMessageResponse {
  session: AiSession;
  userMessage: AiMessage;
  assistantMessage: AiMessage;
  usage: AiSessionUsage;
  context: {
    model: string;
    includedSeedPosts: number;
    includedHistoryMessages: number;
    estimatedInputTokens: number;
    maxContextInputTokens: number;
  };
  rotation: {
    wasRotated: boolean;
    reason:
      | 'none'
      | 'ttl_expired'
      | 'token_budget_reached'
      | 'manual_restart'
      | 'session_not_active';
    nextMessageStartsNewSession: boolean;
  };
}

const normalizeLimit = (limit: number | undefined, fallback: number): number => {
  if (typeof limit !== 'number' || Number.isNaN(limit)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(limit), 1), 200);
};

const buildAiChannelUrl = (channelId: string, suffix = '') => {
  const normalizedChannelId = channelId.trim();
  if (!normalizedChannelId) {
    throw new Error('Channel ID is required');
  }
  const encodedChannelId = encodeURIComponent(normalizedChannelId);
  return `/api/tgapp/channels/${encodedChannelId}/ai-chat${suffix}`;
};

export const aiApi = {
  getSessions: (
    channelId: string,
    params?: {
      limit?: number;
      status?: AiSessionStatus;
    }
  ) =>
    fetchData<AiSessionsResponse>({
      method: 'GET',
      url: buildAiChannelUrl(channelId, '/sessions'),
      params: {
        limit: normalizeLimit(params?.limit, 20),
        status: params?.status,
      },
      cacheTtlMs: 5000,
    }),

  getSessionMessages: (
    channelId: string,
    sessionId: string,
    params?: {
      limit?: number;
      before?: string;
    }
  ) =>
    fetchData<AiMessagesResponse>({
      method: 'GET',
      url: `${buildAiChannelUrl(channelId, '/sessions')}/${encodeURIComponent(
        sessionId
      )}/messages`,
      params: {
        limit: normalizeLimit(params?.limit, 100),
        before: params?.before,
      },
      cacheTtlMs: 3000,
    }),

  sendMessage: (
    channelId: string,
    body: AiSendMessagePayload
  ) =>
    fetchData<AiSendMessageResponse>({
      method: 'POST',
      url: buildAiChannelUrl(channelId, '/messages'),
      body,
    }),

  run: <TResponse = unknown>(
    url: `/api/${string}`,
    body: AiRequestPayload = {},
    params?: QueryParams
  ) =>
    fetchData<TResponse>({
      method: 'POST',
      url,
      body,
      params,
    }),
};
