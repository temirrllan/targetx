import { Link } from 'react-router-dom';
import StatusText from '../components/ui/StatusText/StatusText';
import Tag from '../components/ui/Tag/Tag';
import { useProfile } from '../hooks/useProfile';
import type { ApiChannel } from '../types/api';
import { useState } from 'react';
import type { SubscriptionTier } from '../types/dashboard';

const getInitials = (firstName?: string, lastName?: string, username?: string): string => {
  const parts = [firstName, lastName].filter(Boolean);
  if (parts.length > 0) {
    return parts.map((p) => p![0].toUpperCase()).join('');
  }
  return username?.[0]?.toUpperCase() ?? '?';
};

const subscriptionTier = (isPremium?: boolean): SubscriptionTier => {
  if (isPremium) return 'prem';
  return 'plus';
};

type ChannelCardProps = {
  channel: ApiChannel;
  animationDelay?: number;
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

const ChannelCard = ({ channel, animationDelay = 0 }: ChannelCardProps) => {
  const accent = getAccent(channel._id);
  const scheduled = channel.scheduledPostsCount ?? 0;
  const subs = (channel.subscribersCount ?? 0).toLocaleString('ru-RU');

  return (
    <Link
      to={`/channel/${channel._id}`}
      aria-label={`Открыть канал ${channel.name ?? 'Без названия'}`}
      className="group animate-fade-up rounded-2xl border border-slate-800/70 bg-slate-900/50 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.7)] transition duration-300 hover:border-slate-700/70 hover:bg-slate-900/70 sm:p-5"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${accent} shadow-lg shadow-slate-900/60 sm:h-12 sm:w-12`} />
          <div>
            <h4 className="text-base font-semibold text-slate-100 sm:text-lg">
              {channel.name ?? 'Без названия'}
            </h4>
            <p className="text-xs text-slate-400 sm:text-sm">
              {channel.username ? `@${channel.username} · ` : ''}{subs} подписчиков
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Tag>Запланировано: {scheduled}</Tag>
          <Tag variant="info">{channel.isVerified ? 'Проверен' : 'Не проверен'}</Tag>
        </div>
      </div>
    </Link>
  );
};

const HomePage = () => {
  const { user, channels, loading, error, reload } = useProfile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Telegram User';
  const initials = getInitials(user?.firstName, user?.lastName, user?.username);

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Profile Section */}
      <section className="relative z-30 animate-fade-up rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] backdrop-blur sm:p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-slate-700 to-blue-700 text-lg font-semibold sm:h-16 sm:w-16 sm:text-xl">
                {loading ? '…' : initials}
              </div>
              <div className="absolute -bottom-2 -right-2 rounded-full border border-slate-900 bg-slate-950 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                tg
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Профиль</p>
              {loading ? (
                <div className="h-6 w-32 animate-pulse rounded-lg bg-slate-800" />
              ) : (
                <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">{displayName}</h2>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {user?.username && (
                  <p className="text-sm text-slate-400">@{user.username}</p>
                )}
                {user && <StatusText tier={subscriptionTier(user.isPremium)} />}
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="relative z-20">
            <button
              type="button"
              className="group inline-flex h-10 w-10 items-center justify-center rounded-full"
              onClick={() => setIsMenuOpen((p) => !p)}
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Открыть меню</span>
              <span className="grid gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 transition group-hover:bg-slate-200" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 transition group-hover:bg-slate-200" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 transition group-hover:bg-slate-200" />
              </span>
            </button>

            <div
              role="menu"
              aria-hidden={!isMenuOpen}
              className={`absolute right-0 top-12 z-40 w-64 origin-top-right rounded-2xl border border-slate-800/80 bg-slate-950/95 p-2 shadow-[0_24px_60px_-35px_rgba(15,23,42,0.9)] backdrop-blur transition ${isMenuOpen ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'}`}
            >
              <Link
                to="/subscription"
                role="menuitem"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800/70"
                onClick={() => setIsMenuOpen(false)}
              >
                Управление подпиской
              </Link>
              <Link
                to="/add-channel"
                role="menuitem"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800/70"
                onClick={() => setIsMenuOpen(false)}
              >
                Добавить канал
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>
            <button
              type="button"
              onClick={reload}
              className="ml-3 text-xs underline hover:text-red-200"
            >
              Повторить
            </button>
          </div>
        )}
      </section>

      {/* Channels Section */}
      <section className="animate-fade-up space-y-5 sm:space-y-6" style={{ animationDelay: '120ms' }}>
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Мои каналы</p>
          <div className="rounded-full border border-slate-800/80 bg-slate-900/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 sm:text-xs">
            {loading ? '…' : `${channels.length} каналов`}
          </div>
        </div>

        {loading && (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl border border-slate-800/70 bg-slate-900/50" />
            ))}
          </div>
        )}

        {!loading && channels.length === 0 && !error && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 text-sm text-slate-400 text-center">
            Нет подключённых каналов.{' '}
            <Link to="/add-channel" className="text-blue-400 underline">
              Добавить канал
            </Link>
          </div>
        )}

        <div className="grid gap-4">
          {channels.map((ch, index) => (
            <ChannelCard key={ch._id} channel={ch} animationDelay={180 + index * 120} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;