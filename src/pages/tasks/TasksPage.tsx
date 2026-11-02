import { Link as RouterLink } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { TasksBacklogPanel } from "@/features/tasks/components/TasksBacklogPanel";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";

export const TasksPage = () => {
  const isDev = import.meta.env.DEV;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-5 shrink-0">
          <Button asChild variant="ghost" size="sm">
            <RouterLink to="/">
              <ArrowLeft />
              Back to app
            </RouterLink>
          </Button>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Dev task backlog</h1>
        </div>

        {!isDev ? (
          <Alert variant="info">
            Dev-only — task management is not available in production builds. The backlog files live
            in the repo at <code>src/config/app-tasks.json</code> and{" "}
            <code>src/config/app-tasks-archive.json</code> for local development and coding agents.
          </Alert>
        ) : (
          <div className="flex min-h-[60dvh] flex-1 flex-col overflow-hidden rounded-lg border bg-card sm:min-h-0">
            <TasksBacklogPanel />
          </div>
        )}
      </div>
    </div>
  );
};
