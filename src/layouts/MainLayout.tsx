import AppShell from "../components/layout/AppShell/AppShell";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <AppShell>
      <main className="flex-1">
        <Outlet />
      </main>
    </AppShell>
  );
};

export default MainLayout;
