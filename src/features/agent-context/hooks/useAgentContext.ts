import { useQuery } from "@tanstack/react-query";
import {
  fetchAgentConnectContext,
  fetchAgentFocusPayload,
} from "@/features/agent-context/services/agentContextApiService";

export const agentContextKeys = {
  all: ["agent-context"] as const,
  connect: () => [...agentContextKeys.all, "connect"] as const,
  focus: (id: string) => [...agentContextKeys.all, "focus", id] as const,
};

/** Changes only when the function is deployed; no need to refetch often. */
const CONNECT_STALE_MS = 5 * 60_000;
/** Same staleness as the goal pages: agents change tasks elsewhere. */
const FOCUS_STALE_MS = 15_000;

export const useAgentConnectContext = () =>
  useQuery({
    queryKey: agentContextKeys.connect(),
    queryFn: fetchAgentConnectContext,
    staleTime: CONNECT_STALE_MS,
  });

export const useAgentFocusPayload = (id: string) =>
  useQuery({
    queryKey: agentContextKeys.focus(id),
    queryFn: () => fetchAgentFocusPayload(id),
    staleTime: FOCUS_STALE_MS,
  });
