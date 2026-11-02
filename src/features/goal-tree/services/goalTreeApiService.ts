import { getEdgeFunctionConfig } from "@/shared/services/supabaseService";
import type {
  GoalNodeDetail,
  GoalNodeSummary,
  GoalNodeWithChildren,
  GoalRole,
  GoalRoleViewItem,
} from "@/features/goal-tree/types/goalTree.types";

const POINT_AT_FUNCTION = "point-at";

/** Raised when the Supabase env vars are missing, so the UI can show a setup state. */
export class GoalTreeNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured");
    this.name = "GoalTreeNotConfiguredError";
  }
}

/** URL agents connect their MCP client to, or null when Supabase is not configured. */
export const getGoalTreeMcpUrl = (): string | null => {
  const config = getEdgeFunctionConfig(POINT_AT_FUNCTION);
  return config ? `${config.baseUrl}/mcp` : null;
};

const readErrorMessage = async (response: Response): Promise<string> => {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return `Request failed (${response.status})`;
};

const request = async <T>(path: string): Promise<T> => {
  const config = getEdgeFunctionConfig(POINT_AT_FUNCTION);
  if (!config) throw new GoalTreeNotConfiguredError();

  const response = await fetch(`${config.baseUrl}${path}`, { headers: config.headers });
  if (!response.ok) throw new Error(await readErrorMessage(response));
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
