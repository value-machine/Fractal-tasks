import {
  getPointAtRequest,
  PointAtNotConfiguredError,
  readPointAtError,
} from "@/shared/services/pointAtFunctionService";
import type {
  GoalNodeDetail,
  GoalNodeSummary,
  GoalNodeWithChildren,
  GoalRole,
  GoalRoleViewItem,
} from "@/features/goal-tree/types/goalTree.types";

const request = async <T>(path: string): Promise<T> => {
  const target = getPointAtRequest(path);
  if (!target) throw new PointAtNotConfiguredError();
  const response = await fetch(target.url, { headers: target.headers });
  if (!response.ok) throw new Error(await readPointAtError(response));
  return (await response.json()) as T;
};

/** Root goals, each with its children (two visible levels). */
export const fetchGoalRoots = (): Promise<GoalNodeWithChildren[]> =>
  request<GoalNodeWithChildren[]>("/api/roots");

/** One goal with ancestors, children, events and links. */
export const fetchGoalNode = (id: string): Promise<GoalNodeDetail> =>
  request<GoalNodeDetail>(`/api/nodes/${encodeURIComponent(id)}`);

/** Full-text style search over goal titles and checks. */
export const searchGoals = (query: string): Promise<GoalNodeSummary[]> =>
  request<GoalNodeSummary[]>(`/api/search?q=${encodeURIComponent(query)}`);

/** Work waiting for a role: thinking work (donor) or concrete actions (executor). */
export const fetchGoalRoleView = (role: GoalRole): Promise<GoalRoleViewItem[]> =>
  request<GoalRoleViewItem[]>(`/api/views/${role}`);
