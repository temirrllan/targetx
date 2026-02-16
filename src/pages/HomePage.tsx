import { useState } from "react";
import { Link } from "react-router-dom";
import type { ChannelSummary, UserProfile } from "../types/dashboard";
import StatusText from "../components/ui/StatusText/StatusText";
import Tag from "../components/ui/Tag/Tag";
import { channels, user } from "../data/mockDashboard";

const getInitials = (data: UserProfile) => {
  const initials = [data.firstName, data.lastName]
    .filter(Boolean)
    .map((value) => value?.[0]?.toUpperCase())
    .join("");

  if (initials) {
    return initials;
  }

  if (data.username) {
    return data.username[0]?.toUpperCase() ?? "?";
  }

  return "?";
};

type ChannelCardProps = {
  channel: ChannelSummary;
  animationDelay?: number;
};

const ChannelCard = ({ channel, animationDelay = 0 }: ChannelCardProps) => {
  return (
    <Link
      to={`/channel/${channel.id}`}
      aria-label={`Открыть канал ${channel.title}`}
      className="group animate-fade-up rounded-2xl border border-slate-800/70 bg-slate-900/50 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.7)] transition duration-300 hover:border-slate-700/70 hover:bg-slate-900/70 sm:p-5"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`h-10 w-10 rounded-xl bg-gradient-to-br ${channel.accent} shadow-lg shadow-slate-900/60 sm:h-12 sm:w-12`}
          />
          <div>
            <h4 className="text-base font-semibold text-slate-100 sm:text-lg">
              {channel.title}
            </h4>
            <p className="text-xs text-slate-400 sm:text-sm">
              {channel.subscribers.toLocaleString("en-US")} subscribers
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Tag>Scheduled: {channel.scheduledPosts}</Tag>
          <Tag variant="info">Active</Tag>
        </div>
      </div>
    </Link>
  );
};

const HomePage = () => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const displayName = fullName || "Telegram user";
  const initials = getInitials(user);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Profile Section */}
      <section className="relative z-30 animate-fade-up rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] backdrop-blur sm:p-6">
        <div className="flex justify-between items-center sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              {user.photoUrl ? (
                <img
                  className="h-14 w-14 rounded-2xl object-cover sm:h-16 sm:w-16"
                  src={user.photoUrl}
                  alt={displayName}
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-slate-700 to-blue-700 text-lg font-semibold sm:h-16 sm:w-16 sm:text-xl">
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 rounded-full border border-slate-900 bg-slate-950 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                tg
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Profile
              </p>
              <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                {displayName}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {user.username && (
                  <p className="text-sm text-slate-400">@{user.username}</p>
                )}
                <StatusText tier={user.subscription} />
              </div>
            </div>
          </div>

          <div className="relative sm:top-2 z-20 -top-2 self-end sm:self-start">
            <button
              type="button"
              className="group inline-flex h-10 w-10 items-center justify-center rounded-full "
              onClick={handleToggleMenu}
              aria-expanded={isMenuOpen}
              aria-controls="profile-menu"
            >
              <span className="sr-only">Open profile menu</span>
              <span className="grid gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 transition group-hover:bg-slate-200" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 transition group-hover:bg-slate-200" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 transition group-hover:bg-slate-200" />
              </span>
            </button>

            <div
              id="profile-menu"
              role="menu"
              aria-hidden={!isMenuOpen}
              className={`absolute right-0 top-12 z-40 w-64 origin-top-right rounded-2xl border border-slate-800/80 bg-slate-950/95 p-2 shadow-[0_24px_60px_-35px_rgba(15,23,42,0.9)] backdrop-blur transition ${isMenuOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}
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
      </section>

      {/* Channels Section */}
      <section
        className="animate-fade-up space-y-5 sm:space-y-6"
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex flex-wrap -z-10 items-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Your channels
            </p>
          </div>
          <div className="rounded-full border border-slate-800/80 bg-slate-900/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 sm:text-xs">
            {channels.length} channels
          </div>
        </div>

        <div className="grid gap-4">
          {channels.map((channel, index) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              animationDelay={180 + index * 120}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;