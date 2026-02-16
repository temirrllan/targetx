import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ApexLineChart from '../components/ui/Charts/ApexLineChart';
import BottomSheet from '../components/ui/BottomSheet/BottomSheet';
import ElasticList from '../components/ui/ElasticList/ElasticList';
import { useChannel } from '../hooks/useChannel';
import { syncChannel } from '../api/tgapp';
import type { ApiPost } from '../types/api';

const StatusLabel: Record<string, string> = {
  published: 'Опубликован',
  scheduled: 'Запланирован',
  draft: 'Черновик',
};

const ACCENT_POOL = [
  'from-cyan-500/80 to-blue-600/80',
  'from-sky-500/80 to-indigo-500/80',
  'from-emerald-400/80 to-teal-600/80',
  'from-violet-500/80 to-purple-600/80',
  'from-rose-500/80 to-pink-600/80',
];

const getAccent = (id: string) =>
  ACCENT_POOL[Math.abs([...id].reduce((a, c) => a + c.charCodeAt(0), 0)) % ACCENT_POOL.length];

const ChannelDetailsPage = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const { channel, posts, scheduledPostsCount, loading, error, reload } = useChannel(channelId);

  const [activeSheet, setActiveSheet] = useState<'recent' | 'scheduled' | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const scheduledListRef = useRef<HTMLDivElement>(null);

  const recentPosts = useMemo(
    () => posts.filter((p) => p.status === 'published'),
    [posts],
  );

  const scheduledPosts = useMemo(
    () => posts.filter((p) => p.status === 'scheduled'),
    [posts],
  );

  // Генерируем charts из реальных данных или заглушки
  const dayLabels = useMemo(
    () => Array.from({ length: 30 }, (_, i) => `${i + 1}`),
    [],
  );

  const viewsSeries = useMemo(() => {
    const data = dayLabels.map((_, i) => {
      const v = 1200 + i * 28 + Math.round(240 * Math.sin(i / 3.5) + 180 * Math.cos(i / 5));
      return Math.max(300, v);
    });
    return [{ name: 'Просмотры', data }];
  }, [dayLabels]);

  const subsSeries = useMemo(() => {
    const data = dayLabels.map((_, i) => {
      const v = 18 + Math.round(6 * Math.sin(i / 3) + 4 * Math.cos(i / 4) + i * 0.6);
      return Math.max(0, v);
    });
    return [{ name: 'Подписчики', data }];
  }, [dayLabels]);

  const handleSync = async () => {
    if (!channel?.channelId) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      await syncChannel(channel.channelId);
      setSyncMsg('Синхронизировано');
      reload();
    } catch (err: unknown) {
      setSyncMsg((err as Error).message ?? 'Ошибка синхронизации');
    } finally {
      setSyncing(false);
    }
  };

  const accent = channel ? getAccent(channel._id) : 'from-slate-600/80 to-slate-700/80';

  // Skeleton / error states
  if (loading) {
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-4">
          <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/60 text-slate-200">
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-800" />
        </header>
        <div className="h-32 animate-pulse rounded-2xl border border-slate-800/70 bg-slate-900/50" />
        <div className="h-32 animate-pulse rounded-2xl border border-slate-800/70 bg-slate-900/50" />
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-4">
          <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/60 text-slate-200">
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Канал не найден</h1>
        </header>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">
          {error ?? 'Канал не найден. Проверьте ссылку или выберите другой канал.'}
        </div>
        <button type="button" onClick={reload} className="rounded-full border border-slate-700/70 bg-slate-950/80 px-5 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Link to="/" aria-label="Назад" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/60 text-slate-200 transition hover:border-slate-600/80 hover:text-white">
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
        <div className="flex flex-1 items-center gap-3">
          <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${accent} flex-shrink-0`} />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Канал</p>
            <h1 className="truncate text-2xl font-semibold text-slate-50 sm:text-3xl">
              {channel.name ?? 'Без названия'}
            </h1>
            <p className="text-xs text-slate-400">
              {channel.username ? `@${channel.username} · ` : ''}
              {(channel.subscribersCount ?? 0).toLocaleString('ru-RU')} подписчиков
            </p>
          </div>
        </div>

        <Link
          to={`/channel/${channelId}/create-post`}
          className="flex-shrink-0 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M10 4v12m-6-6h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          Создать
        </Link>
      </header>

      {/* Sync */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-600/70 hover:text-white disabled:opacity-50"
        >
          {syncing ? 'Синхронизация...' : 'Синхронизировать'}
        </button>
        {syncMsg && <span className="text-xs text-slate-400">{syncMsg}</span>}
      </div>

      {/* Post list buttons */}
      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setActiveSheet('recent')}
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-5 py-4 text-left shadow-[0_18px_45px_-34px_rgba(15,23,42,0.8)] transition hover:border-slate-700/70 hover:bg-slate-900/80"
        >
          <div>
            <p className="text-sm font-semibold text-slate-100">Опубликованные посты</p>
            <p className="text-xs text-slate-400">{recentPosts.length} записей</p>
          </div>
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-slate-400"><path d="m7 4 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        <button
          type="button"
          onClick={() => setActiveSheet('scheduled')}
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-5 py-4 text-left shadow-[0_18px_45px_-34px_rgba(15,23,42,0.8)] transition hover:border-slate-700/70 hover:bg-slate-900/80"
        >
          <div>
            <p className="text-sm font-semibold text-slate-100">
              Запланировано: {scheduledPostsCount}
            </p>
            <p className="text-xs text-slate-400">Свайпните пост влево, чтобы отменить публикацию.</p>
          </div>
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-slate-400"><path d="m7 4 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.8)]">
          <ApexLineChart title="Monthly views" series={viewsSeries} categories={dayLabels} color="#38bdf8" height={240} />
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.8)]">
          <ApexLineChart title="Monthly subscriptions" series={subsSeries} categories={dayLabels} color="#fb7185" height={240} />
        </div>
      </section>

      {/* Recent posts sheet */}
      <BottomSheet
        isOpen={activeSheet === 'recent'}
        onClose={() => setActiveSheet(null)}
        title="Опубликованные посты"
        height="95dvh"
      >
        <div className="space-y-3">
          {recentPosts.length === 0 && (
            <p className="text-sm text-slate-400">Нет опубликованных постов.</p>
          )}
          {recentPosts.map((post: ApiPost, index: number) => (
            <PostCard key={post._id} post={post} index={index} />
          ))}
        </div>
      </BottomSheet>

      {/* Scheduled posts sheet */}
      <BottomSheet
        isOpen={activeSheet === 'scheduled'}
        onClose={() => setActiveSheet(null)}
        title={`Запланировано: ${scheduledPostsCount}`}
        height="50dvh"
        maxHeight="95dvh"
        scrollRef={scheduledListRef}
        bodyClassName="overflow-hidden flex flex-col min-h-0 gap-3"
      >
        <p className="text-xs text-slate-400">Свайпните карточку влево, чтобы открыть кнопку отмены.</p>

        {scheduledPosts.length === 0 && (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 text-sm text-slate-300">
            Пока нет запланированных постов.
          </div>
        )}

        {scheduledPosts.length > 0 && (
          <ElasticList
            ref={scheduledListRef}
            className="flex-1 min-h-0 space-y-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {scheduledPosts.map((post: ApiPost) => (
              <li key={post._id} className="rounded-2xl border border-slate-800/70 bg-slate-950/60">
                <div className="flex w-full snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="min-w-full snap-start px-4 py-3">
                    <p className="text-sm font-semibold text-slate-100">{post.title ?? 'Без заголовка'}</p>
                    <p className="text-xs text-slate-400">
                      {post.publishAt ? new Date(post.publishAt).toLocaleString('ru-RU') : '—'}
                    </p>
                    {post.text && (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-400">{post.text}</p>
                    )}
                  </div>
                  <div className="flex px-4" />
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

type PostCardProps = { post: ApiPost; index: number };

const PostCard = ({ post, index }: PostCardProps) => (
  <article className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-100">{post.title ?? 'Без заголовка'}</p>
        <p className="text-xs text-slate-400">
          {post.publishedAt ? new Date(post.publishedAt).toLocaleString('ru-RU') : '—'}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
          <span>{(post.views ?? 0).toLocaleString('ru-RU')} просмотров</span>
          <span>·</span>
          <span>{post.metrics?.reactions ?? 0} реакций</span>
          <span>·</span>
          <span>{post.forwards ?? 0} пересылок</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">#{index + 1}</span>
        <span className="text-[10px] text-slate-500">{StatusLabel[post.status] ?? post.status}</span>
      </div>
    </div>
    {post.text && (
      <p className="mt-2 line-clamp-2 text-xs text-slate-400">{post.text}</p>
    )}
  </article>
);

export default ChannelDetailsPage;