import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ApexLineChart from "../components/ui/Charts/ApexLineChart";
import BottomSheet from "../components/ui/BottomSheet/BottomSheet";
import ElasticList from "../components/ui/ElasticList/ElasticList";
import { apiClient } from "../api/client";
import type { Channel } from "../types/api";

// ── Типы постов от бэкенда ────────────────────────────────────────────────────
interface RawPost {
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

interface ChannelResponse {
  channel?: {
    _id: string;
    name?: string;
    title?: string;
    username?: string;
    subscribersCount?: number;
    subscribers?: number;
    photoUrl?: string;
    isVerified?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  scheduledPostsCount?: number;
  posts?: RawPost[];
}

const ChannelDetailsPage = () => {
  const { channelId } = useParams<{ channelId: string }>();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [posts, setPosts] = useState<RawPost[]>([]);
  const [scheduledPostsCount, setScheduledPostsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [activeSheet, setActiveSheet] = useState<"recent" | "scheduled" | null>(null);
  const scheduledListRef = useRef<HTMLDivElement>(null);

  // ── Загрузка данных канала ─────────────────────────────────────────────────
  const loadChannel = async () => {
    if (!channelId) return;
    try {
      setError(null);
      const res = await apiClient.get<ChannelResponse>(`/api/tgapp/channels/${channelId}`);
      const raw = res.channel;
      if (!raw) { setError("Канал не найден"); return; }

      setChannel({
        id: raw._id,
        title: raw.name || raw.title || "Без названия",
        username: raw.username,
        subscribers: raw.subscribersCount ?? raw.subscribers ?? 0,
        photoUrl: raw.photoUrl,
        isVerified: raw.isVerified ?? false,
        createdAt: raw.createdAt ?? new Date().toISOString(),
        updatedAt: raw.updatedAt ?? new Date().toISOString(),
      });
      setScheduledPostsCount(res.scheduledPostsCount ?? 0);
      setPosts(Array.isArray(res.posts) ? res.posts : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки канала");
    }
  };

  useEffect(() => {
    setLoading(true);
    loadChannel().finally(() => setLoading(false));
  }, [channelId]);

  // ── Синхронизация ──────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (!channel?.username && !channelId) return;
    setSyncing(true);
    try {
      await apiClient.post("/api/channel/load", {
        channelUsername: channel?.username ? `@${channel.username}` : undefined,
        channelId,
      });
      await loadChannel();
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  // ── Посты: последние (опубликованные) и запланированные ───────────────────
  const recentPosts = useMemo(
    () => posts.filter((p) => p.status === "published" || p.status !== "scheduled"),
    [posts]
  );
  const scheduledPosts = useMemo(
    () => posts.filter((p) => p.status === "scheduled"),
    [posts]
  );

  // ── Заглушки для графиков ─────────────────────────────────────────────────
  const dayLabels = useMemo(() => Array.from({ length: 30 }, (_, i) => `${i + 1}`), []);

  const viewsSeries = useMemo(() => {
    const data = dayLabels.map((_, i) => {
      const day = i + 1;
      return Math.max(100, 800 + day * 20 + Math.round(200 * Math.sin(day / 3.5)));
    });
    return [{ name: "Views", data }];
  }, [dayLabels]);

  const subsSeries = useMemo(() => {
    const data = dayLabels.map((_, i) => Math.max(0, 10 + i + Math.round(5 * Math.sin(i / 3))));
    return [{ name: "Subscriptions", data }];
  }, [dayLabels]);

  // ── Форматирование ─────────────────────────────────────────────────────────
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  // ── Состояния загрузки / ошибки ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-slate-800 border-t-blue-500" />
          <p className="mt-4 text-sm text-slate-400">Загрузка канала...</p>
        </div>
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-4">
          <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/60 text-slate-200 transition hover:border-slate-600/80 hover:text-white">
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Ошибка</h1>
        </header>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center space-y-4">
          <p className="text-sm text-red-300">{error ?? "Канал не найден"}</p>
          <button
            onClick={() => { setLoading(true); loadChannel().finally(() => setLoading(false)); }}
            className="rounded-full border border-red-400/30 bg-red-500/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-red-200 transition hover:border-red-400/50"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  // ── Основной рендер ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Блок 1: Информация о канале */}
      <header className="flex items-center gap-3">
        <Link to="/" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/60 text-slate-200 transition hover:border-slate-600/80 hover:text-white">
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        {channel.photoUrl ? (
          <img src={channel.photoUrl} alt={channel.title} className="h-12 w-12 rounded-2xl object-cover shrink-0" />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-cyan-500/80 to-blue-600/80" />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Канал</p>
          <h1 className="text-xl font-semibold text-slate-50 truncate sm:text-2xl">{channel.title}</h1>
          <p className="text-sm text-slate-400">
            {channel.subscribers.toLocaleString("ru-RU")} подписчиков
            {channel.username && <span className="ml-2 text-slate-500">@{channel.username}</span>}
          </p>
        </div>
      </header>

      {/* Блок 2: Кнопки действий */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-700/70 bg-slate-800/60 px-4 py-2.5 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:bg-slate-700/60 disabled:opacity-50"
        >
          <svg viewBox="0 0 20 20" fill="none" className={`h-3.5 w-3.5 shrink-0 ${syncing ? "animate-spin" : ""}`}>
            <path d="M4 10a6 6 0 0 1 10.5-4M16 10a6 6 0 0 1-10.5 4M16 6v4h-4M4 14v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {syncing ? "Синхронизация..." : "Синхронизировать"}
        </button>

        <Link
          to={`/channel/${channelId}/create-post`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 shrink-0">
            <path d="M10 4v12m-6-6h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Создать пост
        </Link>
      </div>

      {/* Кнопки открытия шторок */}
      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setActiveSheet("recent")}
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-5 py-4 text-left transition hover:border-slate-700/70 hover:bg-slate-900/80"
        >
          <div>
            <p className="text-sm font-semibold text-slate-100">Последние посты</p>
            <p className="text-xs text-slate-400">{recentPosts.length} публикаций</p>
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
            <p className="text-sm font-semibold text-slate-100">Запланировано: {scheduledPostsCount || scheduledPosts.length}</p>
            <p className="text-xs text-slate-400">Свайпните пост влево чтобы отменить</p>
          </div>
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-slate-400">
            <path d="m7 4 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </section>

      {/* Графики */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
          <ApexLineChart title="Monthly views" series={viewsSeries} categories={dayLabels} color="#38bdf8" height={220} />
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
          <ApexLineChart title="Monthly subscriptions" series={subsSeries} categories={dayLabels} color="#fb7185" height={220} />
        </div>
      </section>

      {/* Шторка: последние посты */}
      <BottomSheet
        isOpen={activeSheet === "recent"}
        onClose={() => setActiveSheet(null)}
        title="Последние посты"
        height="95dvh"
      >
        {recentPosts.length === 0 ? (
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

      {/* Шторка: запланированные */}
      <BottomSheet
        isOpen={activeSheet === "scheduled"}
        onClose={() => setActiveSheet(null)}
        title={`Запланировано: ${scheduledPostsCount || scheduledPosts.length}`}
        height="50dvh"
        maxHeight="95dvh"
        scrollRef={scheduledListRef}
        bodyClassName="overflow-hidden flex flex-col min-h-0 gap-3"
      >
        <p className="text-xs text-slate-400">Свайпните карточку влево чтобы открыть кнопку отмены.</p>

        {scheduledPosts.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-center text-sm text-slate-400">
            Нет запланированных постов
          </div>
        ) : (
          <ElasticList
            ref={scheduledListRef}
            className="flex-1 min-h-0 space-y-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {scheduledPosts.map((post) => (
              <li key={post._id} className="rounded-2xl border border-slate-800/70 bg-slate-950/60 list-none">
                <div className="flex w-full snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  <div className="flex min-w-[96px] snap-end items-center justify-center ml-2 pr-3">
                    <button
                      type="button"
                      className="rounded-2xl border border-red-400/70 px-3 py-3 text-[10px] uppercase tracking-[0.2em] text-red-300 transition hover:border-red-400 hover:text-red-200"
                    >
                      Отменить
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ElasticList>
        )}
      </BottomSheet>
    </div>
  );
};

export default ChannelDetailsPage;