import { useQuery } from "@tanstack/react-query";
import { fetchTaskGraph } from "@/features/task-graph/services/taskGraphApiService";

export const taskGraphKeys = {
  all: ["task-graph"] as const,
  graph: (id: string) => [...taskGraphKeys.all, id] as const,
};

/** Read-only, changed by agents elsewhere: short staleness, like the goal pages. */
const TASK_GRAPH_STALE_MS = 15_000;

/** A task's subtree with the relations among its tasks; waits while `id` is still empty. */
export const useTaskGraph = (id: string) =>
  useQuery({
    queryKey: taskGraphKeys.graph(id),
    queryFn: () => fetchTaskGraph(id),
    enabled: id !== "",
    staleTime: TASK_GRAPH_STALE_MS,
  });
