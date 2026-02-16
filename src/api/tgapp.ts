import { apiFetch } from './client';
import type {
  MeResponse,
  ChannelDetailsResponse,
  VerifyChannelResponse,
  LoadChannelResponse,
  CreatePostPayload,
  CreatePostResponse,
  InlineButton,
} from '../types/api';

// ─── Profile ──────────────────────────────────────────────────────────────────

export const fetchMe = (): Promise<MeResponse> =>
  apiFetch<MeResponse>('/api/tgapp/me');

// ─── Channels ─────────────────────────────────────────────────────────────────

export const fetchChannelDetails = (id: string): Promise<ChannelDetailsResponse> =>
  apiFetch<ChannelDetailsResponse>(`/api/tgapp/channels/${id}`);

export const verifyChannel = (channelUsername: string): Promise<VerifyChannelResponse> =>
  apiFetch<VerifyChannelResponse>('/api/channel/verify', {
    method: 'POST',
    json: { channelUsername },
  });

export const loadChannel = (channelUsername: string): Promise<LoadChannelResponse> =>
  apiFetch<LoadChannelResponse>('/api/channel/load', {
    method: 'POST',
    json: { channelUsername },
  });

export const syncChannel = (channelId: string): Promise<LoadChannelResponse> =>
  apiFetch<LoadChannelResponse>('/api/channel/load', {
    method: 'POST',
    json: { channelId },
  });

// ─── Posts ────────────────────────────────────────────────────────────────────

export const createTextPost = (
  channelId: string,
  payload: CreatePostPayload,
): Promise<CreatePostResponse> =>
  apiFetch<CreatePostResponse>(`/api/tgapp/channels/${channelId}/posts`, {
    method: 'POST',
    json: payload,
  });

type MediaItem = {
  type: 'photo' | 'video' | 'document' | 'audio';
  file: File;
  caption?: string;
};

type CreateMultipartPostOptions = {
  title?: string;
  text?: string;
  parseMode?: 'HTML' | 'Markdown';
  disableWebPagePreview?: boolean;
  status: 'published' | 'scheduled';
  publishAt?: string;
  buttons?: InlineButton[];
  // Одиночное медиа
  mediaType?: 'photo' | 'video' | 'document' | 'audio';
  mediaFile?: File;
  mediaCaption?: string;
  // Альбом
  albumItems?: MediaItem[];
};

export const createMultipartPost = (
  channelId: string,
  opts: CreateMultipartPostOptions,
): Promise<CreatePostResponse> => {
  const form = new FormData();

  if (opts.title) form.append('title', opts.title);
  if (opts.text) form.append('text', opts.text);
  form.append('parseMode', opts.parseMode ?? 'HTML');
  if (opts.disableWebPagePreview) form.append('disableWebPagePreview', 'true');
  form.append('status', opts.status);
  if (opts.publishAt) form.append('publishAt', opts.publishAt);
  if (opts.buttons?.length) form.append('buttons', JSON.stringify(opts.buttons));

  if (opts.mediaFile && opts.mediaType) {
    form.append('mediaType', opts.mediaType);
    if (opts.mediaCaption) form.append('mediaCaption', opts.mediaCaption);
    form.append('mediaFile', opts.mediaFile);
  }

  if (opts.albumItems?.length) {
    const meta = opts.albumItems.map((item) => ({
      type: item.type,
      caption: item.caption ?? '',
    }));
    form.append('mediaGroupMeta', JSON.stringify(meta));
    opts.albumItems.forEach((item) => {
      form.append('mediaFiles', item.file);
    });
  }

  return apiFetch<CreatePostResponse>(`/api/tgapp/channels/${channelId}/posts`, {
    method: 'POST',
    body: form,
  });
};