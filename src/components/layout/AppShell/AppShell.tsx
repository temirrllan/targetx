import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

const AppShell = ({ children }: AppShellProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-blue-700/20 blur-3xl animate-glow-pulse" />
        <div className="absolute right-[-120px] top-[-80px] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-slate-700/30 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-4 pb-12 pt-6 sm:max-w-xl sm:px-6 sm:pt-8 lg:max-w-3xl">
        {children}
      </div>
    </div>
  );
};

export default AppShell;
