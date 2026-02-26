import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type PersistStorage,
  type StateStorage,
} from "zustand/middleware";
import { authApi } from "../api/auth";
import {
  channelsApi,
  type ChannelDetails,
  type ChannelStatsPeriod,
  type RawPost,
} from "../api/channels";
import type { Channel, ChannelStats, User } from "../types/api";

type FetchOptions = {
  force?: boolean;
  background?: boolean;
};

type SyncChannelOptions = {
  channelId: string;
  channelUsername?: string;
  period?: ChannelStatsPeriod;
};

type ChannelCacheEntry = {
  details: ChannelDetails | null;
  posts: RawPost[];
  scheduledPostsCount: number;
  loading: boolean;
  error: string | null;
  statsByPeriod: Partial<Record<ChannelStatsPeriod, ChannelStats>>;
  statsLoadingByPeriod: Record<ChannelStatsPeriod, boolean>;
  statsErrorByPeriod: Record<ChannelStatsPeriod, string | null>;
  updatedAt: number | null;
};

type PersistedChannelCacheEntry = {
  details: ChannelDetails | null;
  posts: RawPost[];
  scheduledPostsCount: number;
  statsByPeriod: Partial<Record<ChannelStatsPeriod, ChannelStats>>;
  updatedAt: number | null;
};

type PersistedStoreState = {
  user: User | null;
  channels: Channel[];
  channelCache: Record<string, PersistedChannelCacheEntry>;
};

interface AppStoreState {
  user: User | null;
  userLoading: boolean;
  userError: string | null;

  channels: Channel[];
  channelsLoading: boolean;
  channelsError: string | null;

  channelCache: Record<string, ChannelCacheEntry>;

  hydrateTelegramUser: () => void;
  fetchUser: (options?: FetchOptions) => Promise<User | null>;

  fetchChannels: (options?: FetchOptions) => Promise<Channel[]>;
  upsertChannelSnapshot: (channel: Channel) => void;
  removeScheduledPostSnapshot: (channelId: string, postId: string) => void;

  fetchChannelDetails: (
    channelId: string,
    options?: FetchOptions
  ) => Promise<ChannelDetails | null>;
  fetchChannelStats: (
    channelId: string,
    period: ChannelStatsPeriod,
    options?: FetchOptions
  ) => Promise<ChannelStats | null>;
  syncChannelAndRefresh: (options: SyncChannelOptions) => Promise<void>;
}

const STATS_PERIODS: ChannelStatsPeriod[] = ["day", "week", "month", "year"];

const createStatsLoadingState = (): Record<ChannelStatsPeriod, boolean> => ({
  day: false,
  week: false,
  month: false,
  year: false,
});

const createStatsErrorState = (): Record<ChannelStatsPeriod, string | null> => ({
  day: null,
  week: null,
  month: null,
  year: null,
});

const createEmptyChannelCacheEntry = (): ChannelCacheEntry => ({
  details: null,
  posts: [],
  scheduledPostsCount: 0,
  loading: false,
  error: null,
  statsByPeriod: {},
  statsLoadingByPeriod: createStatsLoadingState(),
  statsErrorByPeriod: createStatsErrorState(),
  updatedAt: null,
});

const normalizeChannelUsername = (username?: string) => {
  if (!username) return undefined;
  const trimmed = username.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
};

const resolveErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const mapDetailsToChannel = (details: ChannelDetails): Channel => ({
  id: details.id,
  title: details.title,
  username: details.username,
  description: details.description,
  subscribers: details.subscribers,
  photoUrl: details.photoUrl,
  isVerified: details.isVerified,
  createdAt: details.createdAt,
  updatedAt: details.updatedAt,
});

const upsertChannel = (channels: Channel[], next: Channel): Channel[] => {
  const exists = channels.some((channel) => channel.id === next.id);
  if (!exists) {
    return [next, ...channels];
  }

  return channels.map((channel) =>
    channel.id === next.id ? { ...channel, ...next } : channel
  );
};

const getTelegramUserSnapshot = (): User | null => {
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (!tgUser) return null;

  return {
    id: String(tgUser.id),
    firstName: tgUser.first_name,
    lastName: tgUser.last_name,
    username: tgUser.username,
    // Avatar comes from backend. Do not use Telegram photo to avoid UI flicker.
    photoUrl: undefined,
    subscription: "not_paid",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const ensureChannelCacheEntry = (
  current: Record<string, ChannelCacheEntry>,
  channelId: string
) => current[channelId] ?? createEmptyChannelCacheEntry();

const toPersistedChannelCache = (
  cache: Record<string, ChannelCacheEntry>
): Record<string, PersistedChannelCacheEntry> => {
  const result: Record<string, PersistedChannelCacheEntry> = {};

  Object.entries(cache).forEach(([channelId, entry]) => {
    result[channelId] = {
      details: entry.details,
      posts: entry.posts,
      scheduledPostsCount: entry.scheduledPostsCount,
      statsByPeriod: entry.statsByPeriod,
      updatedAt: entry.updatedAt,
    };
  });

  return result;
};

const fromPersistedChannelCache = (
  cache?: Record<string, PersistedChannelCacheEntry>
): Record<string, ChannelCacheEntry> => {
  if (!cache) return {};

  const result: Record<string, ChannelCacheEntry> = {};

  Object.entries(cache).forEach(([channelId, entry]) => {
    result[channelId] = {
      ...createEmptyChannelCacheEntry(),
      details: entry.details,
      posts: Array.isArray(entry.posts) ? entry.posts : [],
      scheduledPostsCount: entry.scheduledPostsCount ?? 0,
      statsByPeriod: entry.statsByPeriod ?? {},
      updatedAt: entry.updatedAt ?? null,
      loading: false,
      error: null,
      statsLoadingByPeriod: createStatsLoadingState(),
      statsErrorByPeriod: createStatsErrorState(),
    };
  });

  return result;
};

const inMemoryStateStorage = new Map<string, string>();

const getSafeLocalStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const safeStateStorage: StateStorage = {
  getItem: (name) => {
    const storage = getSafeLocalStorage();
    if (storage) {
      try {
        return storage.getItem(name);
      } catch {
        // Fallback to memory storage below.
      }
    }
    return inMemoryStateStorage.get(name) ?? null;
  },
  setItem: (name, value) => {
    const storage = getSafeLocalStorage();
    if (storage) {
      try {
        storage.setItem(name, value);
        inMemoryStateStorage.delete(name);
        return;
      } catch {
        // Fallback to memory storage below.
      }
    }
    inMemoryStateStorage.set(name, value);
  },
  removeItem: (name) => {
    const storage = getSafeLocalStorage();
    if (storage) {
      try {
        storage.removeItem(name);
      } catch {
        // Continue and clear in-memory copy.
      }
    }
    inMemoryStateStorage.delete(name);
  },
};

const safePersistStorage =
  createJSONStorage<PersistedStoreState>(() => safeStateStorage) ??
  ({
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  } satisfies PersistStorage<PersistedStoreState>);

let userRequest: Promise<User | null> | null = null;
let channelsRequest: Promise<Channel[]> | null = null;
const channelDetailsRequests = new Map<string, Promise<ChannelDetails | null>>();
const channelStatsRequests = new Map<string, Promise<ChannelStats | null>>();
const syncChannelRequests = new Map<string, Promise<void>>();

export const useAppStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      user: null,
      userLoading: false,
      userError: null,

      channels: [],
      channelsLoading: false,
      channelsError: null,

      channelCache: {},

      hydrateTelegramUser: () => {
        const snapshot = getTelegramUserSnapshot();
        if (!snapshot) return;

        set((state) => {
          if (state.user) return state;
          return {
            ...state,
            user: snapshot,
            userLoading: false,
            userError: null,
          };
        });
      },

      fetchUser: async (options = {}) => {
        const { background = true } = options;

        if (userRequest) {
          return userRequest;
        }

        const hasSnapshot = !!get().user;
        if (!background || !hasSnapshot) {
          set((state) => ({ ...state, userLoading: true, userError: null }));
        } else {
          set((state) => ({ ...state, userError: null }));
        }

        userRequest = (async () => {
          try {
            const user = await authApi.getCurrentUser();
            set((state) => ({
              ...state,
              user,
              userLoading: false,
              userError: null,
            }));
            return user;
          } catch (error) {
            const message = resolveErrorMessage(error, "Failed to load user");
            const fallback = get().user ?? getTelegramUserSnapshot();

            set((state) => ({
              ...state,
              user: fallback,
              userLoading: false,
              userError: fallback ? null : message,
            }));

            return fallback;
          } finally {
            userRequest = null;
          }
        })();

        return userRequest;
      },

      fetchChannels: async (options = {}) => {
        const { background = true } = options;

        if (channelsRequest) {
          return channelsRequest;
        }

        const hasCachedChannels = get().channels.length > 0;
        if (!background || !hasCachedChannels) {
          set((state) => ({ ...state, channelsLoading: true, channelsError: null }));
        } else {
          set((state) => ({ ...state, channelsError: null }));
        }

        channelsRequest = (async () => {
          try {
            const channels = await channelsApi.getChannels();

            set((state) => {
              const nextChannelCache = { ...state.channelCache };

              channels.forEach((channel) => {
                const existing = ensureChannelCacheEntry(nextChannelCache, channel.id);
                const details = existing.details
                  ? { ...existing.details, ...channel }
                  : ({ ...channel } as ChannelDetails);

                nextChannelCache[channel.id] = {
                  ...existing,
                  details,
                  updatedAt: Date.now(),
                };
              });

              return {
                ...state,
                channels,
                channelsLoading: false,
                channelsError: null,
                channelCache: nextChannelCache,
              };
            });

            return channels;
          } catch (error) {
            const message = resolveErrorMessage(error, "Failed to load channels");
            set((state) => ({
              ...state,
              channelsLoading: false,
              channelsError: message,
            }));
            return get().channels;
          } finally {
            channelsRequest = null;
          }
        })();

        return channelsRequest;
      },

      upsertChannelSnapshot: (channel) => {
        set((state) => {
          const nextChannels = upsertChannel(state.channels, channel);
          const existing = ensureChannelCacheEntry(state.channelCache, channel.id);
          const details = existing.details
            ? { ...existing.details, ...channel }
            : ({ ...channel } as ChannelDetails);

          return {
            ...state,
            channels: nextChannels,
            channelCache: {
              ...state.channelCache,
              [channel.id]: {
                ...existing,
                details,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      removeScheduledPostSnapshot: (channelId, postId) => {
        if (!channelId || !postId) return;

        set((state) => {
          const entry = state.channelCache[channelId];
          if (!entry) return state;

          const nextPosts = entry.posts.filter((post) => post._id !== postId);
          const nextDetailsPosts = Array.isArray(entry.details?.posts)
            ? entry.details.posts.filter((post) => post._id !== postId)
            : entry.details?.posts;

          const nextScheduledCount = Math.max(
            0,
            (entry.scheduledPostsCount ?? 0) - 1
          );

          return {
            ...state,
            channelCache: {
              ...state.channelCache,
              [channelId]: {
                ...entry,
                posts: nextPosts,
                scheduledPostsCount: nextScheduledCount,
                details: entry.details
                  ? {
                      ...entry.details,
                      posts: nextDetailsPosts,
                      scheduledPostsCount: nextScheduledCount,
                    }
                  : entry.details,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      fetchChannelDetails: async (channelId, options = {}) => {
        const { background = true } = options;
        if (!channelId) return null;

        if (channelDetailsRequests.has(channelId)) {
          return channelDetailsRequests.get(channelId)!;
        }

        const existingEntry = get().channelCache[channelId];
        if (!background || !existingEntry?.details) {
          set((state) => {
            const entry = ensureChannelCacheEntry(state.channelCache, channelId);
            return {
              ...state,
              channelCache: {
                ...state.channelCache,
                [channelId]: {
                  ...entry,
                  loading: true,
                  error: null,
                },
              },
            };
          });
        }

        const request = (async () => {
          try {
            const details = await channelsApi.getChannelById(channelId);

            set((state) => {
              const entry = ensureChannelCacheEntry(state.channelCache, channelId);
              const posts = Array.isArray(details.posts) ? details.posts : [];
              const scheduledPostsCount = details.scheduledPostsCount ?? 0;

              return {
                ...state,
                channels: upsertChannel(state.channels, mapDetailsToChannel(details)),
                channelCache: {
                  ...state.channelCache,
                  [channelId]: {
                    ...entry,
                    details,
                    posts,
                    scheduledPostsCount,
                    loading: false,
                    error: null,
                    updatedAt: Date.now(),
                  },
                },
              };
            });

            return details;
          } catch (error) {
            const message = resolveErrorMessage(error, "Failed to load channel");
            set((state) => {
              const entry = ensureChannelCacheEntry(state.channelCache, channelId);
              return {
                ...state,
                channelCache: {
                  ...state.channelCache,
                  [channelId]: {
                    ...entry,
                    loading: false,
                    error: message,
                  },
                },
              };
            });
            return null;
          } finally {
            channelDetailsRequests.delete(channelId);
          }
        })();

        channelDetailsRequests.set(channelId, request);
        return request;
      },

      fetchChannelStats: async (channelId, period, options = {}) => {
        const { background = true } = options;
        if (!channelId) return null;

        const requestKey = `${channelId}:${period}`;
        if (channelStatsRequests.has(requestKey)) {
          return channelStatsRequests.get(requestKey)!;
        }

        const hasCachedStats = !!get().channelCache[channelId]?.statsByPeriod?.[period];

        if (!background || !hasCachedStats) {
          set((state) => {
            const entry = ensureChannelCacheEntry(state.channelCache, channelId);
            return {
              ...state,
              channelCache: {
                ...state.channelCache,
                [channelId]: {
                  ...entry,
                  statsLoadingByPeriod: {
                    ...entry.statsLoadingByPeriod,
                    [period]: true,
                  },
                  statsErrorByPeriod: {
                    ...entry.statsErrorByPeriod,
                    [period]: null,
                  },
                },
              },
            };
          });
        } else {
          set((state) => {
            const entry = ensureChannelCacheEntry(state.channelCache, channelId);
            return {
              ...state,
              channelCache: {
                ...state.channelCache,
                [channelId]: {
                  ...entry,
                  statsErrorByPeriod: {
                    ...entry.statsErrorByPeriod,
                    [period]: null,
                  },
                },
              },
            };
          });
        }

        const request = (async () => {
          try {
            const stats = await channelsApi.getChannelStats(channelId, period);
            set((state) => {
              const entry = ensureChannelCacheEntry(state.channelCache, channelId);
              return {
                ...state,
                channelCache: {
                  ...state.channelCache,
                  [channelId]: {
                    ...entry,
                    statsByPeriod: {
                      ...entry.statsByPeriod,
                      [period]: stats,
                    },
                    statsLoadingByPeriod: {
                      ...entry.statsLoadingByPeriod,
                      [period]: false,
                    },
                    statsErrorByPeriod: {
                      ...entry.statsErrorByPeriod,
                      [period]: null,
                    },
                    updatedAt: Date.now(),
                  },
                },
              };
            });
            return stats;
          } catch (error) {
            const message = resolveErrorMessage(error, "Failed to load stats");
            set((state) => {
              const entry = ensureChannelCacheEntry(state.channelCache, channelId);
              return {
                ...state,
                channelCache: {
                  ...state.channelCache,
                  [channelId]: {
                    ...entry,
                    statsLoadingByPeriod: {
                      ...entry.statsLoadingByPeriod,
                      [period]: false,
                    },
                    statsErrorByPeriod: {
                      ...entry.statsErrorByPeriod,
                      [period]: message,
                    },
                  },
                },
              };
            });
            return null;
          } finally {
            channelStatsRequests.delete(requestKey);
          }
        })();

        channelStatsRequests.set(requestKey, request);
        return request;
      },

      syncChannelAndRefresh: async ({
        channelId,
        channelUsername,
        period = "month",
      }) => {
        if (!channelId) return;

        if (syncChannelRequests.has(channelId)) {
          return syncChannelRequests.get(channelId)!;
        }

        const request = (async () => {
          const normalizedUsername = normalizeChannelUsername(channelUsername);
          await channelsApi.syncChannel(
            normalizedUsername
              ? { channelUsername: normalizedUsername }
              : { channelId }
          );

          await Promise.all([
            get().fetchChannels({ force: true, background: true }),
            get().fetchChannelDetails(channelId, { force: true, background: true }),
            get().fetchChannelStats(channelId, period, { force: true, background: true }),
          ]);
        })().finally(() => {
          syncChannelRequests.delete(channelId);
        });

        syncChannelRequests.set(channelId, request);
        return request;
      },
    }),
    {
      name: "targetx-app-store",
      storage: safePersistStorage,
      partialize: (state): PersistedStoreState => ({
        user: state.user,
        channels: state.channels,
        channelCache: toPersistedChannelCache(state.channelCache),
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<PersistedStoreState>) ?? {};

        return {
          ...currentState,
          user: persisted.user ?? currentState.user,
          channels: Array.isArray(persisted.channels)
            ? persisted.channels
            : currentState.channels,
          channelCache: fromPersistedChannelCache(persisted.channelCache),
        };
      },
    }
  )
);

export const isStatsPeriod = (value: string): value is ChannelStatsPeriod =>
  STATS_PERIODS.includes(value as ChannelStatsPeriod);
