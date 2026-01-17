import type { SubscriptionTier } from "../../../types/dashboard";

type StatusTextProps = {
  tier: SubscriptionTier;
  className?: string;
};

const subscriptionStyles = {
  not_paid: {
    label: "not paid",
    className: "text-red-400",
  },
  plus: {
    label: "plus",
    className: "text-blue-300",
  },
  prem: {
    label: "prem",
    className: "text-emerald-300",
  },
} as const;

const StatusText = ({ tier, className = "" }: StatusTextProps) => {
  const subscription = subscriptionStyles[tier];

  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-[0.2em] sm:text-xs ${subscription.className} ${className}`}
    >
      {subscription.label}
    </span>
  );
};

export default StatusText;
