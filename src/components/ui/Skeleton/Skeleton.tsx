type SkeletonProps = {
  className?: string;
  rounded?: "full" | "xl" | "2xl";
};

const Skeleton = ({ className = "", rounded = "xl" }: SkeletonProps) => {
  const roundedClass =
    rounded === "full" ? "rounded-full" : rounded === "2xl" ? "rounded-2xl" : "rounded-xl";

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-slate-800/70 ${roundedClass} ${className}`.trim()}
    />
  );
};

export default Skeleton;
