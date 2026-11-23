import { useMemo } from "react";
import { agentContextScope } from "@/features/agent-context/services/agentContextScope";
import type {
  AgentContextScope,
  AgentFocusPayload,
} from "@/features/agent-context/types/agentContext.types";

/**
 * Which tasks an agent sees for this payload. `treeNodes` are the tasks of the tree being drawn
 * (the graph read's node list, a stable reference from the query cache).
 */
export const useAgentContextScope = (
  payload: AgentFocusPayload | undefined,
  treeNodes: readonly { id: string }[] | undefined
): AgentContextScope | null =>
  useMemo(
    () =>
      payload ? agentContextScope(payload, new Set((treeNodes ?? []).map((n) => n.id))) : null,
    [payload, treeNodes]
  );
