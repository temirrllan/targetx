import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { channelsApi, mapChannel } from "../api/channels";
import { useHapticFeedback } from "../hooks/useTelegramWebApp";
import type { Channel } from "../types/api";

type Step = "input" | "preview" | "success";

const AddChannelPage = () => {
  const navigate = useNavigate();
  const haptic = useHapticFeedback();

  const [query, setQuery] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewChannel, setPreviewChannel] = useState<Channel | null>(null);
  const [postsCount, setPostsCount] = useState<number | null>(null);

  const handleVerify = async () => {
    const value = query.trim();
    if (!value) return;

    setIsLoading(true);
    setError(null);
    haptic.impactOccurred("medium");

    try {
      const res = await channelsApi.verifyChannel(value);
      const channel = mapChannel(res.channel);
      setPreviewChannel(channel);
      setPostsCount(res.postsCount ?? null);
      setStep("preview");
      haptic.notificationOccurred("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не удалось найти канал";
      setError(msg);
      haptic.notificationOccurred("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async () => {
    const value = query.trim();
    if (!value) return;

    setIsLoading(true);
    setError(null);
    haptic.impactOccurred("heavy");

    try {
      const res = await channelsApi.loadChannel(value);
      const channel = mapChannel(res.channel);
      setPreviewChannel(channel);
      setPostsCount(res.postsCount ?? null);
      setStep("success");
      haptic.notificationOccurred("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не удалось добавить канал";
      setError(msg);
      haptic.notificationOccurred("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setQuery("");
    setStep("input");
    setError(null);
    setPreviewChannel(null);
    setPostsCount(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Link
          to="/"
          aria-label="Назад"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/60 text-slate-200 transition hover:border-slate-600/80 hover:text-white"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Каналы</p>
          <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">Добавить канал</h1>
        </div>
      </header>

      {/* Инструкция */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur space-y-3">
        <h2 className="text-sm font-semibold text-slate-100">Инструкция</h2>
        <ol className="space-y-2 text-sm text-slate-300">
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/10 text-[10px] font-bold text-blue-300">1</span>
            Добавьте бота <span className="font-mono text-slate-200">@TargetXAI_bot</span> в ваш канал как администратора
          </li>
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/10 text-[10px] font-bold text-blue-300">2</span>
            Дайте боту права: публикация сообщений, просмотр участников
          </li>
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/10 text-[10px] font-bold text-blue-300">3</span>
            Введите @username канала ниже и нажмите «Найти»
          </li>
        </ol>
      </section>

      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
        Добавить канал может только его владелец или администратор.
      </section>

      {/* Форма */}
      {step === "input" && (
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur space-y-4">
          <div className="space-y-1">
            <label htmlFor="channel-input" className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Username или ссылка
            </label>
            <input
              id="channel-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              placeholder="@mychannel или https://t.me/mychannel"
              disabled={isLoading}
              className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleVerify}
              disabled={!query.trim() || isLoading}
              className="flex-1 rounded-full border border-slate-700/70 bg-slate-800/60 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:bg-slate-700/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLoading ? "Поиск..." : "Найти канал"}
            </button>
            <button
              type="button"
              onClick={handleLoad}
              disabled={!query.trim() || isLoading}
              className="flex-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLoading ? "Загрузка..." : "Добавить сразу"}
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            «Найти» — только проверка. «Добавить сразу» — найти и синхронизировать посты.
          </p>
        </section>
      )}

      {/* Превью найденного канала */}
      {step === "preview" && previewChannel && (
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Найден канал</p>

          <div className="flex items-center gap-4 rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
            {previewChannel.photoUrl ? (
              <img src={previewChannel.photoUrl} alt={previewChannel.title} className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500/80 to-blue-600/80" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-100 truncate">{previewChannel.title}</p>
              {previewChannel.username && (
                <p className="text-xs text-slate-400">@{previewChannel.username}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>{previewChannel.subscribers.toLocaleString("ru-RU")} подписчиков</span>
                {postsCount !== null && <span>{postsCount} постов</span>}
                <span className={previewChannel.isVerified ? "text-emerald-400" : "text-slate-500"}>
                  {previewChannel.isVerified ? "✓ проверен" : "не проверен"}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="flex-1 rounded-full border border-slate-700/70 bg-slate-800/60 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-200 disabled:opacity-50"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={handleLoad}
              disabled={isLoading}
              className="flex-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20 disabled:opacity-50"
            >
              {isLoading ? "Добавляем..." : "Подтвердить добавление"}
            </button>
          </div>
        </section>
      )}

      {/* Успех */}
      {step === "success" && previewChannel && (
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 backdrop-blur space-y-4 text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
            <svg viewBox="0 0 20 20" fill="none" className="h-7 w-7 text-emerald-300">
              <path d="M4 10l5 5 7-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-emerald-200">Канал добавлен!</h2>
            <p className="mt-1 text-sm text-slate-400">{previewChannel.title}</p>
            {postsCount !== null && (
              <p className="text-xs text-slate-500 mt-1">Синхронизировано постов: {postsCount}</p>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-slate-700/70 bg-slate-800/60 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:text-white"
            >
              Добавить ещё
            </button>
            <button
              type="button"
              onClick={() => navigate(`/channel/${previewChannel.id}`)}
              className="rounded-full border border-blue-500/30 bg-blue-500/10 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20"
            >
              Открыть канал
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default AddChannelPage;