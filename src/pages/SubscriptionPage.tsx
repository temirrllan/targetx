import { Link } from "react-router-dom";

const plans = [
  {
    id: "plus",
    label: "Plus",
    description:
      "Больше автопостинга, гибкое расписание и аналитика базовых метрик.",
    accent: "from-blue-500/15 via-slate-900/60 to-slate-950/90",
  },
  {
    id: "prem",
    label: "Prem",
    description:
      "Максимальные лимиты, приоритетная отправка и расширенная аналитика.",
    accent: "from-emerald-500/15 via-slate-900/60 to-slate-950/90",
  },
];

const SubscriptionPage = () => {
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
            Подписки
          </p>
          <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
            Управление подпиской
          </h1>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <section
            key={plan.id}
            className={`rounded-2xl border border-slate-800/80 bg-gradient-to-br ${plan.accent} p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur sm:p-6`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  План
                </p>
                <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">
                  {plan.label}
                </h2>
              </div>
              <span className="rounded-full border border-slate-800/80 bg-slate-950/70 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                {plan.label}
              </span>
            </div>

            <p className="mt-4 text-sm text-slate-300">{plan.description}</p>

            <button
              type="button"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-slate-700/70 bg-slate-950/80 px-5 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-600/70 hover:text-white"
            >
              Купить
            </button>
          </section>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPage;
