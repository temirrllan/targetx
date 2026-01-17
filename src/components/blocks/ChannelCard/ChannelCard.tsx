import type { ChannelSummary } from "../../../types/dashboard";
import Tag from "../../ui/Tag/Tag";

type ChannelCardProps = {
  channel: ChannelSummary;
  animationDelay?: number;
};

const ChannelCard = ({ channel, animationDelay = 0 }: ChannelCardProps) => {
  return (
    <div
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
    </div>
  );
};

export default ChannelCard;
