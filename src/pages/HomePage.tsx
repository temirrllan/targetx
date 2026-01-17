import ProfileCard from "../components/blocks/ProfileCard/ProfileCard";
import ChannelsSection from "../components/blocks/ChannelsSection/ChannelsSection";
import { channels, user } from "../data/mockDashboard";

const HomePage = () => {
  return (
    <div className="space-y-8 sm:space-y-10">
      <ProfileCard user={user} />
      <div>
        <ChannelsSection channels={channels} />
      </div>
    </div>
  );
};

export default HomePage;
