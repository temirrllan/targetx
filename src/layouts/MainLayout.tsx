import AppShell from "../components/layout/AppShell/AppShell";
import FloatingAiChatButton from "../components/layout/FloatingAiChatButton";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <AppShell>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
      <FloatingAiChatButton />
    </AppShell>
  );
};

export default MainLayout;
