import { Link } from "react-router-dom";
import type { ComponentProps } from "react";

type ActionLinkVariant = "primary" | "ghost";

type ActionLinkProps = ComponentProps<typeof Link> & {
  variant?: ActionLinkVariant;
};

const variantStyles: Record<ActionLinkVariant, string> = {
  primary:
    "border-slate-700/70 bg-slate-950/80 text-slate-200 hover:border-slate-600/70 hover:text-white",
  ghost: "border-transparent text-slate-300 hover:text-white",
};

const ActionLink = ({
  variant = "primary",
  className = "",
  ...props
}: ActionLinkProps) => {
  return (
    <Link
      className={`inline-flex items-center justify-center rounded-full border px-5 py-2 text-xs uppercase tracking-[0.2em] transition ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
};

export default ActionLink;
