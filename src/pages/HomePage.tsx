import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { channelsApi } from "../api/channels";
import { useBackButton } from "../hooks/useTelegramWebApp";
import type { Channel } from "../types/api";
import StatusText from "../components/ui/StatusText/StatusText";
import Tag from "../components/ui/Tag/Tag";

const getInitials = (firstName?: string, lastName?: string, username?: string) => {
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((v) => v?.[0]?.toUpperCase())
    .join("");
  if (initials) return initials;
  if (username) return username[0]?.toUpperCase() ?? "?";
  return "?";
};

const isTelegramEnv = () => {
  return typeof window !== "undefined" && !!window.Telegram?.WebApp?.initData;
};

const isDev = import.meta.env.DEV;

type ChannelCardProps = { channel: Channel; animationDelay?: number };

const ChannelCard = ({ channel, animationDelay = 0 }: ChannelCardProps) => (
  <Link
    to={`/channel/${channel.id}`}
    aria-label={`Открыть канал ${channel.title}`}
    className="group animate-fade-up rounded-2xl border border-slate-800/70 bg-slate-900/50 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.7)] transition duration-300 hover:border-slate-700/70 hover:bg-slate-900/70 sm:p-5"
    style={{ animationDelay: `${animationDelay}ms` }}
  >
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        {channel.photoUrl ? (
          <img src={channel.photoUrl} alt={channel.title} className="h-10 w-10 rounded-xl object-cover sm:h-12 sm:w-12" />
        ) : (
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/80 to-blue-600/80 sm:h-12 sm:w-12" />
        )}
        <div>
          <h4 className="text-base font-semibold text-slate-100 sm:text-lg">{channel.title}</h4>
          <p className="text-xs text-slate-400 sm:text-sm">{channel.subscribers.toLocaleString("ru-RU")} подписчиков</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {channel.isVerified && <Tag variant="info">Верифицирован</Tag>}
        <Tag>Активен</Tag>
      </div>
    </div>
  </Link>
);

const HomePage = () => {
  const { user, loading: userLoading, error: userError } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useBackButton(() => {
    window.Telegram?.WebApp?.close();
  }, false);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setChannelsLoading(true);
        setChannelsError(null);
        const data = await channelsApi.getChannels();
        setChannels(Array.isArray(data) ? data : []);
      } catch (error) {
        setChannelsError(error instanceof Error ? error.message : "Ошибка загрузки каналов");
        setChannels([]);
      } finally {
        setChannelsLoading(false);
      }
    };
    fetchChannels();
  }, []);

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Telegram user"
    : "Telegram user";
  const initials = user ? getInitials(user.firstName, user.lastName, user.username) : "?";

  // ── Not in Telegram (and not dev) ──
  if (!isTelegramEnv() && !isDev) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="h-20 w-20 rounded-full border border-amber-400/30 bg-amber-400/10 flex items-center justify-center">
          <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10 text-amber-300">
            <path d="M20 4C11.163 4 4 11.163 4 20s7.163 16 16 16 16-7.163 16-16S28.837 4 20 4zm0 8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm2 14h-4v-9h4v9z" fill="currentColor" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-amber-200">Откройте в Telegram</h2>
          <p className="mt-2 text-sm text-slate-400 max-w-xs">
            Это приложение работает только внутри Telegram. Пожалуйста, запустите его через бота.
          </p>
        </div>
        <p className="text-xs text-slate-600">Missing initData token</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-amber-200 transition hover:border-amber-400/50"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-slate-800 border-t-blue-500" />
          <p className="mt-4 text-sm text-slate-400">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (userError && !user) {
    return (
      <div className="space-y-8 sm:space-y-10">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-300 mb-2">Ошибка загрузки</h2>
          <p className="text-sm text-red-300 mb-4">{userError.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 inline-flex items-center justify-center rounded-full border border-red-400/30 bg-red-500/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-red-200 transition hover:border-red-400/50"
          >
            Попробовать снова
          </button>
        </div>
        {isDev && (
          <details className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
            <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-slate-500">Информация для отладки</summary>
            <div className="mt-4 space-y-2 text-xs font-mono text-slate-400">
              <p>📱 Telegram WebApp: {window.Telegram?.WebApp ? "✅" : "❌"}</p>
              <p>🔑 Init Data: {window.Telegram?.WebApp?.initData ? "✅" : "❌"}</p>
              <p>🌐 VITE_DEV_INIT_DATA: {import.meta.env.VITE_DEV_INIT_DATA ? "✅ задан" : "❌ не задан"}</p>
            </div>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Profile card */}
      <section className="relative z-30 animate-fade-up rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] backdrop-blur sm:p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              {user?.photoUrl ? (
                <img className="h-14 w-14 rounded-2xl object-cover sm:h-16 sm:w-16" src={user.photoUrl} alt={displayName} />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-slate-700 to-blue-700 text-lg font-semibold sm:h-16 sm:w-16 sm:text-xl">
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 rounded-full border border-slate-900 bg-slate-950 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">tg</div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Профиль</p>
              <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">{displayName}</h2>
              <div className="flex flex-wrap items-center gap-2">
                {user?.username && <p className="text-sm text-slate-400">@{user.username}</p>}
                {user && <StatusText tier={user.subscription} />}
              </div>
            </div>
          </div>

          <div className="relative z-20">
            <button
              type="button"
              className="group inline-flex h-10 w-10 items-center justify-center rounded-full"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
            >
              <span className="grid gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-400 transition group-hover:bg-slate-200" />
                ))}
              </span>
            </button>
            <div
              role="menu"
              aria-hidden={!isMenuOpen}
              className={`absolute right-0 top-12 z-40 w-64 origin-top-right rounded-2xl border border-slate-800/80 bg-slate-950/95 p-2 shadow-[0_24px_60px_-35px_rgba(15,23,42,0.9)] backdrop-blur transition ${isMenuOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}
            >
              <Link to="/subscription" role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800/70" onClick={() => setIsMenuOpen(false)}>
                Управление подпиской
              </Link>
              <Link to="/add-channel" role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800/70" onClick={() => setIsMenuOpen(false)}>
                Добавить канал
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Channels */}
      <section className="animate-fade-up space-y-5 sm:space-y-6" style={{ animationDelay: "120ms" }}>
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ваши каналы</p>
          <div className="rounded-full border border-slate-800/80 bg-slate-900/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 sm:text-xs">
            {channels.length} каналов
          </div>
        </div>

        {channelsLoading ? (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-10 text-center">
            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-slate-800 border-t-blue-500" />
            <p className="mt-4 text-sm text-slate-400">Загрузка каналов...</p>
          </div>
        ) : channelsError ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
            <p className="text-sm text-amber-200 mb-2">{channelsError}</p>
            <button onClick={() => window.location.reload()} className="mt-3 text-xs text-amber-300 hover:text-amber-100 underline">
              Попробовать снова
            </button>
          </div>
        ) : channels.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-10 text-center">
            <p className="text-sm text-slate-400 mb-4">У вас пока нет добавленных каналов</p>
            <Link to="/add-channel" className="inline-flex items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20">
              Добавить канал
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {channels.map((channel, index) => (
              <ChannelCard key={channel.id} channel={channel} animationDelay={180 + index * 120} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;