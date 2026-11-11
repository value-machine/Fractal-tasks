import { useMutation, useQuery } from "@tanstack/react-query";
import {
  decideAgentApproval,
  fetchAgentApproval,
} from "@/features/agent-login/services/agentApprovalService";

const agentApprovalKeys = {
  request: (authorizationId: string, userId: string) =>
    ["agent-approval", authorizationId, userId] as const,
};

/** The pending agent login for a signed-in person. A request is single-use, so no retries. */
export const useAgentApproval = (authorizationId: string, userId: string | null) =>
  useQuery({
    queryKey: agentApprovalKeys.request(authorizationId, userId ?? ""),
    queryFn: () => fetchAgentApproval(authorizationId),
    enabled: Boolean(authorizationId && userId),
    retry: false,
    staleTime: Infinity,
  });

/** Approve or deny, then hand the browser back to the agent tool. */
export const useDecideAgentApproval = (authorizationId: string) =>
  useMutation({
    mutationFn: (approve: boolean) => decideAgentApproval(authorizationId, approve),
    onSuccess: (redirectUrl) => {
      window.location.assign(redirectUrl);
    },
  });
