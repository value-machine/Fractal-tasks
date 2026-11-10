import { useMemo } from "react";
import { usePointAtMcpUrl } from "@/shared/hooks/usePointAtMcpUrl";
import { claudeCodeCommand, mcpJsonConfig } from "@/features/agent-tokens/services/mcpClientConfig";

/** Ready-to-paste agent settings for a token, or null when Supabase is not configured. */
export const useMcpClientSnippets = (
  token: string
): { claudeCode: string; json: string } | null => {
  const mcpUrl = usePointAtMcpUrl();
  return useMemo(
    () =>
      mcpUrl
        ? { claudeCode: claudeCodeCommand(mcpUrl, token), json: mcpJsonConfig(mcpUrl, token) }
        : null,
    [mcpUrl, token]
  );
};
