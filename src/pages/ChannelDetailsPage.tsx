import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ApexLineChart from "../components/ui/Charts/ApexLineChart";
import BottomSheet from "../components/ui/BottomSheet/BottomSheet";
import ElasticList from "../components/ui/ElasticList/ElasticList";
import { channels } from "../data/mockDashboard";

const recentPostTimes = [
  "5 мин назад",
  "20 мин назад",
  "1 час назад",
  "2 часа назад",
  "Вчера",
];

const ChannelDetailsPage = () => {
  const { channelId } = useParams();
  const channel = channels.find((item) => item.id === channelId);
  const [activeSheet, setActiveSheet] = useState<
    "recent" | "scheduled" | null
  >(null);
  const scheduledListRef = useRef<HTMLDivElement>(null);

  const recentPosts = useMemo(
    () =>
      Array.from({ length: 100 }, (_, index) => ({
        id: `recent-${index + 1}`,
        title: `Пост #${index + 1}`,
        timeLabel: recentPostTimes[index % recentPostTimes.length],
        views: 1200 + index * 37,
        reactions: 24 + (index % 12),
      })),
    []
  );

  const scheduledPosts = useMemo(() => {
    if (!channel) {
      return [];
    }

    return Array.from({ length: channel.scheduledPosts }, (_, index) => {
      const hour = 10 + index * 2;
      const hourLabel = String(hour % 24).padStart(2, "0");

      return {
        id: `scheduled-${index + 1}`,
        title: `Запланированный пост #${index + 1}`,
        timeLabel: `Сегодня, ${hourLabel}:00`,
        description:
          "Короткое описание: план публикации, ключевая мысль и призыв.",
      };
    });
  }, [channel]);

  const dayLabels = useMemo(
    () => Array.from({ length: 30 }, (_, index) => `${index + 1}`),
    []
  );

  const viewsSeries = useMemo(() => {
    const points = dayLabels.map((_, index) => {
      const day = index + 1;
      const value =
        1200 +
        day * 28 +
        Math.round(240 * Math.sin(day / 3.5) + 180 * Math.cos(day / 5));
      return Math.max(300, value);
    });

    return [{ name: "Views", data: points }];
  }, [dayLabels]);

  const subscriptionSeries = useMemo(() => {
    const points = dayLabels.map((_, index) => {
      const day = index + 1;
      const value =
        18 +
        Math.round(6 * Math.sin(day / 3) + 4 * Math.cos(day / 4) + day * 0.6);
      return Math.max(0, value);
    });

    return [{ name: "Subscriptions", data: points }];
  }, [dayLabels]);

  if (!channel) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <header className="flex items-center gap-4">
          <Link
            to="/"
            aria-label="Назад"
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
              Канал
            </p>
            <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
              Канал не найден
            </h1>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 text-sm text-slate-300 sm:p-6">
          Канал не найден. Проверьте ссылку или выберите другой канал.
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="flex items-center gap-4">
        <Link
          to="/"
          aria-label="Назад"
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
        <div className="flex items-center gap-3">
          <div
            className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${channel.accent}`}
          />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Канал
            </p>
            <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
              {channel.title}
            </h1>
            <p className="text-xs text-slate-400">
              {channel.subscribers.toLocaleString("ru-RU")} подписчиков
            </p>
          </div>
        </div>



        <Link
    to={`/channel/${channelId}/create-post`}
    className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20"
  >
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M10 4v12m-6-6h12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
    Создать
  </Link>
      </header>

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setActiveSheet("recent")}
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-5 py-4 text-left shadow-[0_18px_45px_-34px_rgba(15,23,42,0.8)] transition hover:border-slate-700/70 hover:bg-slate-900/80"
        >
          <div>
            <p className="text-sm font-semibold text-slate-100">
              Последние 100 постов
            </p>
            <p className="text-xs text-slate-400">
              Быстрый просмотр последних публикаций канала.
            </p>
          </div>
          <span className="text-slate-400">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="m7 4 6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSheet("scheduled")}
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-5 py-4 text-left shadow-[0_18px_45px_-34px_rgba(15,23,42,0.8)] transition hover:border-slate-700/70 hover:bg-slate-900/80"
        >
          <div>
            <p className="text-sm font-semibold text-slate-100">
              Запланировано постов: {channel.scheduledPosts}
            </p>
            <p className="text-xs text-slate-400">
              Свайпните пост влево, чтобы отменить публикацию.
            </p>
          </div>
          <span className="text-slate-400">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="m7 4 6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.8)]">
          <ApexLineChart
            title="Monthly views"
            series={viewsSeries}
            categories={dayLabels}
            color="#38bdf8"
            height={240}
          />
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.8)]">
          <ApexLineChart
            title="Monthly subscriptions"
            series={subscriptionSeries}
            categories={dayLabels}
            color="#fb7185"
            height={240}
          />
        </div>
      </section>

      <BottomSheet
        isOpen={activeSheet === "recent"}
        onClose={() => setActiveSheet(null)}
        title="Последние 100 постов"
        height="95dvh"
      >
        <div className="space-y-3">
          {recentPosts.map((post, index) => (
            <article
              key={post.id}
              className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {post.title}
                  </p>
                  <p className="text-xs text-slate-400">{post.timeLabel}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    <span>{post.views.toLocaleString("ru-RU")} просмотров</span>
                    <span>·</span>
                    <span>{post.reactions} реакций</span>
                  </div>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  #{index + 1}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Короткое описание публикации, чтобы быстро вспомнить контекст.
              </p>
            </article>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={activeSheet === "scheduled"}
        onClose={() => setActiveSheet(null)}
        title={`Запланировано постов: ${channel.scheduledPosts}`}
        height="50dvh"
        maxHeight="95dvh"
        scrollRef={scheduledListRef}
        bodyClassName="overflow-hidden flex flex-col min-h-0 gap-3"
      >
          <p className="text-xs text-slate-400">
            Свайпните карточку влево, чтобы открыть кнопку отмены.
          </p>

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
              {scheduledPosts.map((post) => (
                <li
                  key={post.id}
                  className="rounded-2xl border border-slate-800/70 bg-slate-950/60"
                >
                  <div className="flex w-full snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="min-w-full snap-start px-4 py-3">
                      <p className="text-sm font-semibold text-slate-100">
                        {post.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {post.timeLabel}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {post.description}
                      </p>
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

export default ChannelDetailsPage;
