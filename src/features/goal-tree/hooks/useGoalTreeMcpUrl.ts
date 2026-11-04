import { useMemo } from "react";
import { getGoalTreeMcpUrl } from "@/features/goal-tree/services/goalTreeApiService";

/** MCP URL agents connect to, or null when Supabase is not configured. */
export const useGoalTreeMcpUrl = (): string | null => useMemo(() => getGoalTreeMcpUrl(), []);
