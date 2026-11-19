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
  GoalWorkFilters,
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

/** One goal with ancestors, children, events, relations and the estimate below it. */
export const fetchGoalNode = (id: string): Promise<GoalNodeDetail> =>
  request<GoalNodeDetail>(`/api/nodes/${encodeURIComponent(id)}`);

/** Full-text style search over goal titles and checks. */
export const searchGoals = (query: string): Promise<GoalNodeSummary[]> =>
  request<GoalNodeSummary[]>(`/api/search?q=${encodeURIComponent(query)}`);

/** Query string for the work filters; empty when none is set. */
export const goalWorkFilterQuery = (filters: GoalWorkFilters): string => {
  const params = new URLSearchParams();
  if (filters.maxDuration) params.set("max_duration", filters.maxDuration);
  if (filters.maxCost !== undefined) params.set("max_cost", String(filters.maxCost));
  const requirement = filters.requirement?.trim();
  if (requirement) params.set("requirement", requirement);
  const query = params.toString();
  return query ? `?${query}` : "";
};

/** Work waiting for a role: thinking work (donor) or concrete actions (executor). */
export const fetchGoalRoleView = (
  role: GoalRole,
  filters: GoalWorkFilters = {}
): Promise<GoalRoleViewItem[]> =>
  request<GoalRoleViewItem[]>(`/api/views/${role}${goalWorkFilterQuery(filters)}`);
