#!/usr/bin/env bash
# Fixture for this case: sources the shared scaffold (meta-write-skill/scripts/eval-scaffold.sh,
# copied into the eval plugin by run-evals.sh), then sets up the situation the prompt assumes.
source "$(dirname "$0")/../../lib/eval-scaffold.sh"
mkdir -p "$(dirname 'src/features/tasks/hooks/useOpenTasks.ts')"
cat > 'src/features/tasks/hooks/useOpenTasks.ts' <<'SRC'
import { useMemo } from "react";

import type { AppTask } from "@/features/tasks/types/appTask.types";

/** Open tasks matching the search query. */
export function useOpenTasks(tasks: AppTask[], query: string): AppTask[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => t.status !== "done")
      .filter((t) => q === "" || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }, [tasks, query]);
}
SRC
mkdir -p "$(dirname 'src/features/tasks/hooks/useDoneTasks.ts')"
cat > 'src/features/tasks/hooks/useDoneTasks.ts' <<'SRC'
import { useMemo } from "react";

import type { AppTask } from "@/features/tasks/types/appTask.types";

/** Done tasks matching the search query. */
export function useDoneTasks(tasks: AppTask[], query: string): AppTask[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => t.status === "done")
      .filter((t) => q === "" || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }, [tasks, query]);
}
SRC
mkdir -p "$(dirname 'src/features/tasks/hooks/useInProgressTasks.ts')"
cat > 'src/features/tasks/hooks/useInProgressTasks.ts' <<'SRC'
import { useMemo } from "react";

import type { AppTask } from "@/features/tasks/types/appTask.types";

/** In-progress tasks matching the search query. */
export function useInProgressTasks(tasks: AppTask[], query: string): AppTask[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => t.status === "in-progress")
      .filter((t) => q === "" || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }, [tasks, query]);
}
SRC
mkdir -p "$(dirname 'src/features/tasks/components/TasksFilterCounts.tsx')"
cat > 'src/features/tasks/components/TasksFilterCounts.tsx' <<'SRC'
import { useDoneTasks } from "@/features/tasks/hooks/useDoneTasks";
import { useInProgressTasks } from "@/features/tasks/hooks/useInProgressTasks";
import { useOpenTasks } from "@/features/tasks/hooks/useOpenTasks";
import type { AppTask } from "@/features/tasks/types/appTask.types";

/** Shows how many tasks match the search in each status group. */
export function TasksFilterCounts({ tasks, query }: { tasks: AppTask[]; query: string }): JSX.Element {
  const open = useOpenTasks(tasks, query);
  const done = useDoneTasks(tasks, query);
  const active = useInProgressTasks(tasks, query);
  return <p className="text-xs text-muted-foreground">{open.length} open · {active.length} in progress · {done.length} done</p>;
}
SRC
commit_all "feat(tasks): filtered task hooks and counts"
git push -q origin main
git checkout -q -b feat/tasks-csv-export
csv_brief M
commit_all "docs(tasks): brief for tasks-csv-export"
