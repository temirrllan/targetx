import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const mockChannels = [
  {
    id: "alpha",
    title: "Alpha Signals",
    handle: "@alpha_signals",
    members: 12450,
  },
  {
    id: "market",
    title: "Market Pulse",
    handle: "@market_pulse",
    members: 32100,
  },
  {
    id: "growth",
    title: "Growth Studio",
    handle: "@growth_studio",
    members: 8600,
  },
];

const AddChannelPage = () => {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredChannels = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return mockChannels.filter((channel) => {
      const titleMatch = channel.title.toLowerCase().includes(normalizedQuery);
      const handleMatch = channel.handle.toLowerCase().includes(normalizedQuery);
      return titleMatch || handleMatch;
    });
  }, [normalizedQuery]);

  useEffect(() => {
    if (!normalizedQuery) {
      setSelectedId("");
      return;
    }

    if (filteredChannels.length === 1) {
      setSelectedId(filteredChannels[0].id);
      return;
    }

    if (!filteredChannels.some((channel) => channel.id === selectedId)) {
      setSelectedId("");
    }
  }, [filteredChannels, normalizedQuery, selectedId]);

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="flex items-center gap-4">
        <Link
          to="/"
          aria-label="Назад в профиль"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/60 text-slate-200 transition hover:border-slate-600/80 hover:text-white"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              d="M12.5 4.5 7 10l5.5 5.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Каналы
          </p>
          <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
            Добавить канал
          </h1>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur sm:p-6">
        <h2 className="text-lg font-semibold text-slate-50">
          Инструкция по подключению
        </h2>
        <ol className="mt-4 space-y-2 text-sm text-slate-300">
          <li>1. Добавьте бота в канал и назначьте администратором.</li>
          <li>2. Дайте все разрешения на публикацию и просмотр данных.</li>
          <li>3. Введите название или ссылку на канал и подтвердите выбор.</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
        Добавить канал в профиль может только владелец канала.
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur sm:p-6">
        <div>
          <label
            htmlFor="channel-search"
            className="text-xs uppercase tracking-[0.2em] text-slate-500"
          >
            Название канала
          </label>
          <input
            id="channel-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Например, @market_pulse"
            className="mt-2 w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Результаты поиска
          </p>

          {!normalizedQuery && (
            <p className="text-sm text-slate-500">
              Начните вводить название, чтобы увидеть каналы.
            </p>
          )}

          {normalizedQuery && filteredChannels.length === 0 && (
            <p className="text-sm text-slate-500">
              Каналы не найдены. Проверьте название или ссылку.
            </p>
          )}

          {filteredChannels.length > 0 && (
            <div className="space-y-2">
              {filteredChannels.map((channel) => (
                <label
                  key={channel.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-700/70 hover:bg-slate-900/70"
                >
                  <input
                    type="radio"
                    name="channel"
                    value={channel.id}
                    checked={selectedId === channel.id}
                    onChange={() => setSelectedId(channel.id)}
                    className="h-4 w-4 accent-blue-500"
                  />
                  <div>
                    <p className="font-semibold text-slate-100">
                      {channel.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {channel.handle} ·{" "}
                      {channel.members.toLocaleString("ru-RU")} подписчиков
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={!selectedId}
          className="inline-flex w-full items-center justify-center rounded-full border border-slate-700/70 bg-slate-950/80 px-5 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-600/70 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800/60 disabled:text-slate-600"
        >
          Подтвердить добавление
        </button>
      </section>
    </div>
  );
};

export default AddChannelPage;
