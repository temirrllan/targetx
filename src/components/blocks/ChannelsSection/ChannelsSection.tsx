import type { ChannelSummary } from "../../../types/dashboard";
import ChannelList from "../ChannelList/ChannelList";

type ChannelsSectionProps = {
  channels: ChannelSummary[];
};

const ChannelsSection = ({ channels }: ChannelsSectionProps) => {
  return (
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

      <ChannelList channels={channels} />
    </section>
  );
};

export default ChannelsSection;
