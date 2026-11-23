import { fetchPointAtJson } from "@/shared/services/pointAtFunctionService";
import type {
  AgentConnectContext,
  AgentFocusPayload,
} from "@/features/agent-context/types/agentContext.types";

/** Instructions, tools and process document, read from a real MCP server instance. */
export const fetchAgentConnectContext = (): Promise<AgentConnectContext> =>
  fetchPointAtJson<AgentConnectContext>("/api/agent-context");

/** Exactly what `focus_node` returns to an agent for this task. */
export const fetchAgentFocusPayload = (id: string): Promise<AgentFocusPayload> =>
  fetchPointAtJson<AgentFocusPayload>(`/api/nodes/${encodeURIComponent(id)}/agent-view`);
