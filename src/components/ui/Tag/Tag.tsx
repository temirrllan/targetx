import type { ReactNode } from "react";

type TagVariant = "neutral" | "info";

type TagProps = {
  children: ReactNode;
  variant?: TagVariant;
  className?: string;
};

const variantStyles: Record<TagVariant, string> = {
  neutral:
    "border-slate-800/80 bg-slate-950/70 text-slate-300",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-100",
};

const Tag = ({ children, variant = "neutral", className = "" }: TagProps) => {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] sm:text-xs ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Tag;
