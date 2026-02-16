import { useState } from 'react';
import { Link } from 'react-router-dom';
import { verifyChannel, loadChannel } from '../api/tgapp';
import type { ApiChannel } from '../types/api';

const AddChannelPage = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ApiChannel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const run = async (mode: 'verify' | 'load') => {
    const channelUsername = query.trim();
    if (!channelUsername) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setResult(null);

    try {
      const data =
        mode === 'load'
          ? await loadChannel(channelUsername)
          : await verifyChannel(channelUsername);
      setResult(data.channel);
      setSuccessMsg(mode === 'load' ? 'Канал добавлен и синхронизирован' : 'Канал добавлен');
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Не удалось добавить канал');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="flex items-center gap-4">
        <Link
          to="/"
          aria-label="Назад"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/60 text-slate-200 transition hover:border-slate-600/80 hover:text-white"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Каналы</p>
          <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">Добавить канал</h1>
        </div>
      </header>

      {/* Инструкция */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur sm:p-6">
        <h2 className="text-lg font-semibold text-slate-50">Инструкция по подключению</h2>
        <ol className="mt-4 space-y-2 text-sm text-slate-300">
          <li>1. Добавьте нашего бота в канал и назначьте администратором.</li>
          <li>2. Дайте разрешения на публикацию и просмотр данных.</li>
          <li>3. Введите @username или ссылку на канал и нажмите «Добавить».</li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          Например: <span className="font-mono text-slate-400">@mychannel</span> или{' '}
          <span className="font-mono text-slate-400">https://t.me/mychannel</span>
        </p>
      </section>

      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
        Добавить канал в профиль может только владелец канала.
      </section>

      {/* Форма */}
      <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur sm:p-6">
        <div>
          <label
            htmlFor="channel-search"
            className="text-xs uppercase tracking-[0.2em] text-slate-500"
          >
            Username или ссылка
          </label>
          <input
            id="channel-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="@channel_username или https://t.me/channel"
            disabled={loading}
            className="mt-2 w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={!query.trim() || loading}
            onClick={() => void run('verify')}
            className="flex-1 inline-flex items-center justify-center rounded-full border border-slate-700/70 bg-slate-950/80 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-600/70 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800/60 disabled:text-slate-600"
          >
            {loading ? 'Загрузка...' : 'Добавить канал'}
          </button>
          <button
            type="button"
            disabled={!query.trim() || loading}
            onClick={() => void run('load')}
            className="flex-1 inline-flex items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Загрузка...' : 'Добавить и синхр.'}
          </button>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Успех */}
        {successMsg && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {successMsg}
          </div>
        )}

        {/* Результат */}
        {result && (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-100">{result.name ?? 'Без названия'}</p>
                <p className="text-xs text-slate-400">
                  {result.username ? `@${result.username}` : 'закрытый канал'}
                </p>
              </div>
              <Link
                to={`/channel/${result._id}`}
                className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-500/50"
              >
                Открыть
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">
              <span>{result.isVerified ? '✓ Проверен' : '✗ Не проверен'}</span>
              <span>Подписчики: {result.subscribersCount ?? 0}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AddChannelPage;