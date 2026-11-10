import { useMemo } from "react";
import { getPointAtMcpUrl } from "@/shared/services/pointAtFunctionService";

/** MCP URL agents connect to, or null when Supabase is not configured. */
export const usePointAtMcpUrl = (): string | null => useMemo(() => getPointAtMcpUrl(), []);
