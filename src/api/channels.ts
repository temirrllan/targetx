import { clearApiCache, fetchData } from './ApiSett';
import type { Channel, ChannelStats } from '../types/api';

export interface RawChannel {
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

export interface RawPost {
  _id: string;
  title?: string;
  text?: string;
  status?: string;
  publishedAt?: string;
  scheduledAt?: string;
  publishAt?: string;
  views?: number;
  forwards?: number;
  tgMessageId?: number;
  metrics?: { reactions?: number; comments?: number };
}

export interface ChannelDetails extends Channel {
  scheduledPostsCount?: number;
  posts?: RawPost[];
}

export type ChannelStatsPeriod = 'day' | 'week' | 'month' | 'year';

interface ChannelByIdResponse {
  channel?: RawChannel;
  scheduledPostsCount?: number;
  posts?: RawPost[];
}

interface ChannelOperationResponse {
  channel: RawChannel;
  postsCount?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asNumberArray = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  }
  return [];
};

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  return [];
};

interface ParsedSeries {
  values: number[];
  labels: string[];
}

const parseObjectSeries = (value: unknown): ParsedSeries => {
  if (!Array.isArray(value)) {
    return { values: [], labels: [] };
  }

  const points = value.filter(isRecord);
  if (points.length === 0) {
    return { values: asNumberArray(value), labels: [] };
  }

  const values = points
    .map((point) => Number(point.value))
    .filter((num) => Number.isFinite(num));

  const labels = points.map((point) => {
    const labelCandidate = point.label ?? point.key ?? point.timestamp;
    return labelCandidate ? String(labelCandidate) : '';
  });

  return { values, labels };
};

const parseMetricPayload = (metric: unknown): ParsedSeries => {
  if (Array.isArray(metric)) {
    return parseObjectSeries(metric);
  }
  if (!isRecord(metric)) {
    return { values: [], labels: [] };
  }

  const direct = parseObjectSeries(metric.series);
  if (direct.values.length > 0 || direct.labels.length > 0) {
    return direct;
  }

  const dataSeries = parseObjectSeries(metric.data);
  if (dataSeries.values.length > 0 || dataSeries.labels.length > 0) {
    return dataSeries;
  }

  const values = asNumberArray(metric.values ?? metric.points);
  const labels = asStringArray(metric.labels ?? metric.categories);
  return { values, labels };
};

const extractNumberSeries = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return parseObjectSeries(value).values;
  }
  if (!isRecord(value)) {
    return [];
  }

  const parsedMetric = parseMetricPayload(value);
  if (parsedMetric.values.length > 0) {
    return parsedMetric.values;
  }

  const nestedKeys = ['data', 'values', 'points', 'series'];
  for (const key of nestedKeys) {
    const candidate = value[key];
    if (Array.isArray(candidate)) {
      const parsedCandidate = parseObjectSeries(candidate).values;
      if (parsedCandidate.length > 0) {
        return parsedCandidate;
      }
      return asNumberArray(candidate);
    }
  }

  return [];
};

const extractStringSeries = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return parseObjectSeries(value).labels;
  }
  if (!isRecord(value)) {
    return [];
  }

  const parsedMetric = parseMetricPayload(value);
  if (parsedMetric.labels.length > 0) {
    return parsedMetric.labels;
  }

  const nestedKeys = ['labels', 'categories', 'dates', 'xAxis', 'x'];
  for (const key of nestedKeys) {
    const candidate = value[key];
    if (Array.isArray(candidate)) {
      return asStringArray(candidate);
    }
  }

  return [];
};

const firstNonEmptyNumbers = (...values: unknown[]): number[] => {
  for (const value of values) {
    const parsed = extractNumberSeries(value);
    if (parsed.length > 0) {
      return parsed;
    }
  }
  return [];
};

const firstNonEmptyStrings = (...values: unknown[]): string[] => {
  for (const value of values) {
    const parsed = extractStringSeries(value);
    if (parsed.length > 0) {
      return parsed;
    }
  }
  return [];
};

const alignSeries = (source: number[], targetLength: number): number[] => {
  if (targetLength === 0) {
    return [];
  }
  return Array.from({ length: targetLength }, (_, index) => source[index] ?? 0);
};

const normalizeChannelStats = (
  payload: unknown,
  channelId: string,
  period: ChannelStatsPeriod
): ChannelStats => {
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : root;
  const charts = isRecord(data.charts) ? data.charts : {};
  const viewsChart = isRecord(data.viewsChart) ? data.viewsChart : {};
  const subscribersChart = isRecord(data.subscribersChart)
    ? data.subscribersChart
    : {};

  const views = firstNonEmptyNumbers(
    data.views,
    data.view,
    charts.views,
    viewsChart,
    viewsChart.data,
    (isRecord(data.views) ? data.views.series : undefined)
  );

  const subscribers = firstNonEmptyNumbers(
    data.subscribers,
    data.subscriber,
    charts.subscribers,
    subscribersChart,
    subscribersChart.data,
    (isRecord(data.subscribers) ? data.subscribers.series : undefined)
  );

  const labels = firstNonEmptyStrings(
    data.labels,
    data.categories,
    charts.labels,
    charts.categories,
    viewsChart.labels,
    viewsChart.categories,
    subscribersChart.labels,
    subscribersChart.categories,
    (isRecord(data.views) ? data.views.series : undefined),
    (isRecord(data.subscribers) ? data.subscribers.series : undefined)
  );

  const maxLength = Math.max(labels.length, views.length, subscribers.length);
  const resolvedLabels =
    labels.length > 0
      ? labels
      : Array.from({ length: maxLength }, (_, index) => `${index + 1}`);

  return {
    channelId,
    period,
    labels: resolvedLabels,
    views: alignSeries(views, resolvedLabels.length),
    subscribers: alignSeries(subscribers, resolvedLabels.length),
  };
};

export const mapChannel = (raw: RawChannel): Channel => ({
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
    const response = await fetchData<{ channels?: RawChannel[] } | RawChannel[]>({
      method: 'GET',
      url: '/api/tgapp/channels',
      cacheTtlMs: 15000,
    });

    const rawChannels = Array.isArray(response)
      ? response
      : (response as { channels?: RawChannel[] }).channels ?? [];

    return rawChannels.map(mapChannel);
  },

  getChannelById: async (id: string): Promise<ChannelDetails> => {
    const response = await fetchData<ChannelByIdResponse | RawChannel>({
      method: 'GET',
      url: `/api/tgapp/channels/${id}`,
      cacheTtlMs: 8000,
    });

    const rawChannel =
      (response as ChannelByIdResponse).channel ?? (response as RawChannel);
    if (!rawChannel?._id) {
      throw new Error('Channel not found');
    }
    const details = response as ChannelByIdResponse;

    return {
      ...mapChannel(rawChannel),
      scheduledPostsCount: details.scheduledPostsCount,
      posts: details.posts,
    };
  },

  getChannelStats: async (
    id: string,
    period: ChannelStatsPeriod
  ): Promise<ChannelStats> => {
    const response = await fetchData<unknown>({
      method: 'GET',
      url: `/api/tgapp/channels/${id}/stats`,
      params: { period },
      cacheTtlMs: 8000,
    });

    if (isRecord(response) && typeof response.message === 'string') {
      const hasStatsPayload =
        isRecord(response.views) ||
        isRecord(response.subscribers) ||
        isRecord(response.data);

      if (!hasStatsPayload) {
        throw new Error(response.message);
      }
    }

    return normalizeChannelStats(response, id, period);
  },

  verifyChannel: (channelUsername: string) =>
    fetchData<ChannelOperationResponse>({
      method: 'POST',
      url: '/api/channel/verify',
      body: { channelUsername },
    }).then((response) => {
      clearApiCache();
      return response;
    }),

  loadChannel: (channelUsername: string) =>
    fetchData<ChannelOperationResponse>({
      method: 'POST',
      url: '/api/channel/load',
      body: { channelUsername },
    }).then((response) => {
      clearApiCache();
      return response;
    }),

  syncChannel: (data: { channelUsername?: string; channelId?: string }) =>
    fetchData<ChannelOperationResponse>({
      method: 'POST',
      url: '/api/channel/load',
      body: data,
    }).then((response) => {
      clearApiCache();
      return response;
    }),
};

