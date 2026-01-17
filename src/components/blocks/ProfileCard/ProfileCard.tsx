import { useState } from "react";
import { Link } from "react-router-dom";
import type { UserProfile } from "../../../types/dashboard";
import StatusText from "../../ui/StatusText/StatusText";

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

type ProfileCardProps = {
  user: UserProfile;
};

const ProfileCard = ({ user }: ProfileCardProps) => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const displayName = fullName || "Telegram user";
  const initials = getInitials(user);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  return (
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
  );
};

export default ProfileCard;
