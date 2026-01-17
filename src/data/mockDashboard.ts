import type { ChannelSummary, UserProfile } from "../types/dashboard";

export const user: UserProfile = {
  firstName: "Artem",
  lastName: "Moroz",
  username: "tgtarget",
  subscription: "plus",
};

export const channels: ChannelSummary[] = [
  {
    id: "pulse",
    title: "Crypto Pulse",
    subscribers: 128400,
    scheduledPosts: 6,
    accent: "from-cyan-500/80 to-blue-600/80",
  },
  {
    id: "launch",
    title: "Launch Radar",
    subscribers: 42150,
    scheduledPosts: 4,
    accent: "from-sky-500/80 to-indigo-500/80",
  },
  {
    id: "growth",
    title: "Growth Lab",
    subscribers: 95300,
    scheduledPosts: 9,
    accent: "from-emerald-400/80 to-teal-600/80",
  },
];
