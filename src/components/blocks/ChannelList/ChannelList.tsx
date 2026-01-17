import type { ChannelSummary } from "../../../types/dashboard";
import ChannelCard from "../ChannelCard/ChannelCard";

type ChannelListProps = {
  channels: ChannelSummary[];
};

const ChannelList = ({ channels }: ChannelListProps) => {
  return (
    <div className="grid gap-4">
      {channels.map((channel, index) => (
        <ChannelCard
          key={channel.id}
          channel={channel}
          animationDelay={180 + index * 120}
        />
      ))}
    </div>
  );
};

export default ChannelList;
