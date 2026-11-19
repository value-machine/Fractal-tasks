import { fetchPointAtJson } from "@/shared/services/pointAtFunctionService";
import type { TaskGraph } from "@/features/task-graph/types/taskGraph.types";

/** A task, everything split from it, and the typed relations among them. */
export const fetchTaskGraph = (id: string): Promise<TaskGraph> =>
  fetchPointAtJson<TaskGraph>(`/api/nodes/${encodeURIComponent(id)}/graph`);
