export type SubscriptionTier = "not_paid" | "plus" | "prem";

export type UserProfile = {
  firstName?: string;
  lastName?: string;
  username?: string;
  subscription: SubscriptionTier;
  photoUrl?: string;
};

export type ChannelSummary = {
  id: string;
  title: string;
  subscribers: number;
  scheduledPosts: number;
  accent: string;
};
