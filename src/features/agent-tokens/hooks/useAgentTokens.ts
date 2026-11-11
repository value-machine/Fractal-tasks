import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAgentToken,
  fetchAgentTokens,
  revokeAgentToken,
} from "@/features/agent-tokens/services/agentTokenApiService";
import type { AgentToken } from "@/features/agent-tokens/types/agentToken.types";

/** Keyed by user, so a sign-out or switch of account never shows someone else's tokens. */
export const agentTokenKeys = {
  all: ["agent-tokens"] as const,
  list: (userId: string) => [...agentTokenKeys.all, "list", userId] as const,
};

export const useAgentTokens = (userId: string) =>
  useQuery({ queryKey: agentTokenKeys.list(userId), queryFn: fetchAgentTokens });

/** Create a token; the server's record goes to the top of the cached list (no refetch). */
export const useCreateAgentToken = (userId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAgentToken,
    onSuccess: ({ record }) => {
      queryClient.setQueryData<AgentToken[]>(agentTokenKeys.list(userId), (tokens = []) => [
        record,
        ...tokens,
      ]);
    },
  });
};

/** Revoke a token; the server's updated record replaces the cached one (no refetch). */
export const useRevokeAgentToken = (userId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeAgentToken,
    onSuccess: (revoked) => {
      queryClient.setQueryData<AgentToken[]>(agentTokenKeys.list(userId), (tokens = []) =>
        tokens.map((token) => (token.id === revoked.id ? revoked : token))
      );
    },
  });
};
