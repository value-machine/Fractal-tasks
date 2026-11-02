import { Link as RouterLink, useLocation } from "react-router-dom";
import { Button } from "@/components/common/Button";

/**
 * Dev-only floating entry to /tasks (import.meta.env.DEV).
 */
export const DevTasksFab = () => {
  const location = useLocation();

  if (!import.meta.env.DEV || location.pathname === "/tasks") {
    return null;
  }

  return (
    <Button
      asChild
      variant="secondary"
      className="fixed right-6 bottom-6 z-40 elevation-lg"
      aria-label="Open dev task backlog"
    >
      <RouterLink to="/tasks">Tasks</RouterLink>
    </Button>
  );
};
