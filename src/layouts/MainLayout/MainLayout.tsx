import { Outlet } from "react-router-dom";
import { appViewportClassName } from "@/shared/theme/appViewLayout";

export const MainLayout = () => {
  return (
    <div className={appViewportClassName}>
      <main className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col overflow-hidden px-4 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
};
