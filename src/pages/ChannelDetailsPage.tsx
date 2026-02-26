import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ApexLineChart from "../components/ui/Charts/ApexLineChart";
import BottomSheet from "../components/ui/BottomSheet/BottomSheet";
import ElasticList from "../components/ui/ElasticList/ElasticList";
import type { ChannelStatsPeriod, RawPost } from "../api/channels";
import { postsApi } from "../api/posts";
import { useAppStore } from "../store/appStore";
import Skeleton from "../components/ui/Skeleton/Skeleton";

const STATS_PERIODS: Array<{ key: ChannelStatsPeriod; label: string }> = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

const STALE_SCHEDULED_POST_MS = 120_000;

const ChannelDetailsPage = () => {
  const { channelId } = useParams<{ channelId: string }>();

  const channels = useAppStore((state) => state.channels);
  const channelCache = useAppStore((state) =>
    channelId ? state.channelCache[channelId] : undefined
  );
  const fetchChannelDetails = useAppStore((state) => state.fetchChannelDetails);
  const fetchChannelStats = useAppStore((state) => state.fetchChannelStats);
  const syncChannelAndRefresh = useAppStore((state) => state.syncChannelAndRefresh);
  const removeScheduledPostSnapshot = useAppStore(
    (state) => state.removeScheduledPostSnapshot
  );

  const [activeSheet, setActiveSheet] = useState<"recent" | "scheduled" | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<ChannelStatsPeriod>("month");
  const [cancelingPostIds, setCancelingPostIds] = useState<string[]>([]);

  const scheduledListRef = useRef<HTMLDivElement>(null);
  const syncedChannelRef = useRef<string | null>(null);
  const staleCleanupAttemptRef = useRef<Set<string>>(new Set());

  const fallbackChannel = useMemo(() => {
    if (!channelId) return null;
    return channels.find((item) => item.id === channelId) ?? null;
  }, [channelId, channels]);

  const channel = channelCache?.details ?? fallbackChannel;
  const posts = useMemo(
    () => (channelCache?.posts ?? channelCache?.details?.posts ?? []) as RawPost[],
    [channelCache?.details?.posts, channelCache?.posts]
  );

  const loading = channelCache?.loading ?? !channel;
  const error = channelCache?.error ?? null;

  const stats = channelCache?.statsByPeriod?.[statsPeriod];
  const statsLoading = channelId
    ? (channelCache?.statsLoadingByPeriod?.[statsPeriod] ?? true)
    : false;
  const statsError = channelCache?.statsErrorByPeriod?.[statsPeriod] ?? null;

  const statsLabels = useMemo(() => stats?.labels ?? [], [stats?.labels]);
  const viewsData = useMemo(() => stats?.views ?? [], [stats?.views]);
  const subscribersData = useMemo(
    () => stats?.subscribers ?? [],
    [stats?.subscribers]
  );

  const getScheduledPostTimestamp = useCallback((post: RawPost) => {
    const rawValue = post.scheduledAt ?? post.publishAt;
    if (!rawValue) return null;

    const timestamp = Date.parse(rawValue);
    return Number.isNaN(timestamp) ? null : timestamp;
  }, []);

  useEffect(() => {
    if (!channelId) return;
    void fetchChannelDetails(channelId, { background: true });
  }, [channelId, fetchChannelDetails]);

  useEffect(() => {
    if (!channelId) return;
    void fetchChannelStats(channelId, statsPeriod, { background: true });
  }, [channelId, fetchChannelStats, statsPeriod]);

  useEffect(() => {
    if (!channelId || !channel || syncedChannelRef.current === channelId) return;

    const username = channel.username?.trim();
    if (!username) return;

    syncedChannelRef.current = channelId;

    void syncChannelAndRefresh({
      channelId,
      channelUsername: username,
      period: statsPeriod,
    }).catch((syncError) => {
      console.error("Auto sync error:", syncError);
    });
  }, [channel, channelId, statsPeriod, syncChannelAndRefresh]);

  const retryChannelLoad = useCallback(() => {
    if (!channelId) return;
    void fetchChannelDetails(channelId, { force: true, background: false });
  }, [channelId, fetchChannelDetails]);

  const retryStatsLoad = useCallback(() => {
    if (!channelId) return;
    void fetchChannelStats(channelId, statsPeriod, { force: true, background: false });
  }, [channelId, fetchChannelStats, statsPeriod]);

  const recentPosts = useMemo(
    () => posts.filter((post) => post.status === "published" || post.status !== "scheduled"),
    [posts]
  );

  const scheduledPosts = useMemo(
    () =>
      posts.filter((post) => {
        if (post.status !== "scheduled") return false;

        const scheduledTs = getScheduledPostTimestamp(post);
        if (scheduledTs === null) return true;

        return scheduledTs > Date.now() - STALE_SCHEDULED_POST_MS;
      }),
    [getScheduledPostTimestamp, posts]
  );

  const staleScheduledPosts = useMemo(
    () =>
      posts.filter((post) => {
        if (post.status !== "scheduled") return false;

        const scheduledTs = getScheduledPostTimestamp(post);
        return scheduledTs !== null && scheduledTs <= Date.now() - STALE_SCHEDULED_POST_MS;
      }),
    [getScheduledPostTimestamp, posts]
  );

  const scheduledPostsVisibleCount = scheduledPosts.length;

  const viewsSeries = useMemo(() => [{ name: "Views", data: viewsData }], [viewsData]);
  const subsSeries = useMemo(
    () => [{ name: "Subscribers", data: subscribersData }],
    [subscribersData]
  );

  const hasStatsData = statsLabels.length > 0;
  const showChannelSkeleton = !channel && loading;
  const showPostsSkeleton = loading && posts.length === 0;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCancelScheduledPost = useCallback(
    async (postId: string) => {
      if (!channelId || !postId || cancelingPostIds.includes(postId)) {
        return;
      }

      setCancelingPostIds((prev) => [...prev, postId]);

      try {
        await postsApi.cancelScheduledPost(channelId, postId);
        removeScheduledPostSnapshot(channelId, postId);
        void fetchChannelDetails(channelId, { force: true, background: true });
      } catch (cancelError) {
        console.error("Failed to cancel scheduled post", cancelError);
      } finally {
        setCancelingPostIds((prev) => prev.filter((id) => id !== postId));
      }
    },
    [cancelingPostIds, channelId, fetchChannelDetails, removeScheduledPostSnapshot]
  );

  useEffect(() => {
    if (!channelId || scheduledPostsVisibleCount === 0) return;

    const intervalId = window.setInterval(() => {
      void fetchChannelDetails(channelId, { background: true });
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [channelId, fetchChannelDetails, scheduledPostsVisibleCount]);

  useEffect(() => {
    if (!channelId || staleScheduledPosts.length === 0) return;

    const postsToCleanup = staleScheduledPosts.filter(
      (post) => !staleCleanupAttemptRef.current.has(post._id)
    );

    if (postsToCleanup.length === 0) return;

    let isDisposed = false;

    const cleanupStaleScheduledPosts = async () => {
      for (const post of postsToCleanup) {
        if (isDisposed) return;

        staleCleanupAttemptRef.current.add(post._id);

        try {
          await postsApi.cancelScheduledPost(channelId, post._id);
          removeScheduledPostSnapshot(channelId, post._id);
        } catch (cleanupError) {
          staleCleanupAttemptRef.current.delete(post._id);
          console.error("Failed to auto-cancel stale scheduled post", cleanupError);
        }
      }

      if (!isDisposed) {
        void fetchChannelDetails(channelId, { force: true, background: true });
      }
    };

    void cleanupStaleScheduledPosts();

    return () => {
      isDisposed = true;
    };
  }, [channelId, fetchChannelDetails, removeScheduledPostSnapshot, staleScheduledPosts]);

  if (!channelId) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">
        Channel ID is missing in route
      </div>
    );
  }

  if (error && !channel) {
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/60 text-slate-200 transition hover:border-slate-600/80 hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path
                d="M12.5 4.5 7 10l5.5 5.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Ошибка</h1>
        </header>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center space-y-4">
          <p className="text-sm text-red-300">{error}</p>
          <button
            type="button"
            onClick={retryChannelLoad}
            className="rounded-full border border-red-400/30 bg-red-500/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-red-200 transition hover:border-red-400/50"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/60 text-slate-200 transition hover:border-slate-600/80 hover:text-white"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <path
              d="M12.5 4.5 7 10l5.5 5.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        {showChannelSkeleton ? (
          <>
            <Skeleton className="h-12 w-12" rounded="2xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
            <Skeleton className="h-11 w-11 shrink-0" rounded="2xl" />
          </>
        ) : (
          <>
            {channel?.photoUrl ? (
              <img
                src={channel.photoUrl}
                alt={channel.title}
                className="h-12 w-12 rounded-2xl object-cover shrink-0"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-cyan-500/80 to-blue-600/80" />
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Канал</p>
              <h1 className="text-xl font-semibold text-slate-50 truncate sm:text-2xl">
                {channel?.title ?? "Без названия"}
              </h1>
              {channel?.username && (
                <p className="text-sm text-slate-500">@{channel.username}</p>
              )}
              <p className="text-sm text-slate-400">
                {(channel?.subscribers ?? 0).toLocaleString("ru-RU")} подписчиков
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                to={`/channel/${channelId}/ai-chat`}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-100 transition hover:border-cyan-500/50 hover:bg-cyan-500/20 active:scale-95"
                aria-label="AI chat"
                title="AI chat"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path
                    d="M4 6.5A2.5 2.5 0 0 1 6.5 4h7A2.5 2.5 0 0 1 16 6.5v4A2.5 2.5 0 0 1 13.5 13H9l-3.4 2.55A.4.4 0 0 1 5 15.2V13.9A2.5 2.5 0 0 1 4 11.5v-5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <Link
                to={`/channel/${channelId}/create-post`}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20 active:scale-95"
                aria-label="Create post"
                title="Create post"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="M10 4v12m-6-6h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </Link>
            </div>
          </>
        )}
      </header>

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setActiveSheet("recent")}
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-5 py-4 text-left transition hover:border-slate-700/70 hover:bg-slate-900/80"
        >
          <div>
            <p className="text-sm font-semibold text-slate-100">Последние посты</p>
            {showPostsSkeleton ? (
              <Skeleton className="mt-2 h-3.5 w-28" />
            ) : (
              <p className="text-xs text-slate-400">{recentPosts.length} публикаций</p>
            )}
          </div>
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-slate-400">
            <path d="m7 4 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setActiveSheet("scheduled")}
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-5 py-4 text-left transition hover:border-slate-700/70 hover:bg-slate-900/80"
        >
          <div>
            <p className="text-sm font-semibold text-slate-100">
              Запланировано: {showPostsSkeleton ? "..." : scheduledPostsVisibleCount}
            </p>
            {showPostsSkeleton ? (
              <Skeleton className="mt-2 h-3.5 w-44" />
            ) : (
              <p className="text-xs text-slate-400">Свайпните пост влево чтобы отменить</p>
            )}
          </div>
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-slate-400">
            <path d="m7 4 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {STATS_PERIODS.map((periodOption) => {
              const active = statsPeriod === periodOption.key;
              return (
                <button
                  key={periodOption.key}
                  type="button"
                  onClick={() => setStatsPeriod(periodOption.key)}
                  disabled={statsLoading && active}
                  className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition ${
                    active
                      ? "border border-blue-500/40 bg-blue-500/20 text-blue-100"
                      : "border border-slate-700/70 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60"
                  }`}
                >
                  {periodOption.label}
                </button>
              );
            })}
          </div>
        </div>

        {!hasStatsData && statsLoading ? (
          <div className="lg:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 text-center">
            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-slate-800 border-t-blue-500" />
            <p className="mt-3 text-sm text-slate-400">Loading stats...</p>
          </div>
        ) : !hasStatsData && statsError ? (
          <div className="lg:col-span-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center space-y-3">
            <p className="text-sm text-red-300">{statsError}</p>
            <button
              type="button"
              onClick={retryStatsLoad}
              className="rounded-full border border-red-400/40 px-4 py-2 text-xs uppercase tracking-[0.15em] text-red-200 transition hover:border-red-300/60"
            >
              Retry
            </button>
          </div>
        ) : !hasStatsData ? (
          <div className="lg:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
            No stats for selected period
          </div>
        ) : (
          <>
            {statsLoading && (
              <div className="lg:col-span-2 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-3 text-center">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Updating stats...
                </p>
              </div>
            )}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
              <ApexLineChart
                title="Views"
                series={viewsSeries}
                categories={statsLabels}
                color="#38bdf8"
                height={220}
              />
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
              <ApexLineChart
                title="Subscribers"
                series={subsSeries}
                categories={statsLabels}
                color="#fb7185"
                height={220}
              />
            </div>
          </>
        )}
      </section>

      <BottomSheet
        isOpen={activeSheet === "recent"}
        onClose={() => setActiveSheet(null)}
        title="Последние посты"
        height="95dvh"
      >
        {showPostsSkeleton ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <article key={item} className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
              </article>
            ))}
          </div>
        ) : recentPosts.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-center text-sm text-slate-400">
            Постов пока нет
          </div>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((post, idx) => (
              <article key={post._id} className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-100 truncate">
                      {post.title || post.text?.slice(0, 60) || "Без названия"}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(post.publishedAt)}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.15em] text-slate-500">
                      <span>{(post.views ?? 0).toLocaleString("ru-RU")} просмотров</span>
                      <span>{post.metrics?.reactions ?? 0} реакций</span>
                      <span>{post.metrics?.comments ?? 0} комментариев</span>
                      {post.forwards !== undefined && <span>{post.forwards} переслали</span>}
                      {post.tgMessageId && <span>msg #{post.tgMessageId}</span>}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-slate-600">#{idx + 1}</span>
                </div>
                {post.text && post.title && (
                  <p className="mt-2 text-xs text-slate-500 line-clamp-2">{post.text}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        isOpen={activeSheet === "scheduled"}
        onClose={() => setActiveSheet(null)}
        title={`Запланировано: ${scheduledPostsVisibleCount}`}
        height="50dvh"
        maxHeight="95dvh"
        scrollRef={scheduledListRef}
        bodyClassName="overflow-hidden flex flex-col min-h-0 gap-3"
      >
        <p className="text-xs text-slate-400">
          Свайпните карточку влево чтобы открыть кнопку отмены.
        </p>

        {showPostsSkeleton ? (
          <div className="space-y-3">
            {[0, 1].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : scheduledPosts.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-center text-sm text-slate-400">
            Нет запланированных постов
          </div>
        ) : (
          <ElasticList
            ref={scheduledListRef}
            className="flex-1 min-h-0 space-y-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {scheduledPosts.map((post) => {
              const isCanceling = cancelingPostIds.includes(post._id);

              return (
                <li key={post._id} className="rounded-2xl border border-slate-800/70 bg-slate-950/60 list-none">
                  <div
                    className="flex w-full snap-x snap-mandatory overflow-x-auto [touch-action:pan-x] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    onTouchStart={(event) => event.stopPropagation()}
                    onTouchMove={(event) => event.stopPropagation()}
                  >
                    <div className="min-w-full snap-start px-4 py-3">
                      <p className="text-sm font-semibold text-slate-100">
                        {post.title || post.text?.slice(0, 60) || "Без названия"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDate(post.scheduledAt || post.publishAt)}
                      </p>
                      {post.text && post.title && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{post.text}</p>
                      )}
                    </div>
                    <div className="flex min-w-[116px] snap-end items-center justify-center ml-2 pr-3">
                      <button
                        type="button"
                        onClick={() => handleCancelScheduledPost(post._id)}
                        disabled={isCanceling}
                        className="rounded-2xl border border-red-400/70 px-3 py-3 text-[10px] uppercase tracking-[0.2em] text-red-300 transition hover:border-red-400 hover:text-red-200 disabled:opacity-60"
                      >
                        {isCanceling ? "Отмена..." : "Отменить"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ElasticList>
        )}
      </BottomSheet>
    </div>
  );
};

export default ChannelDetailsPage;
