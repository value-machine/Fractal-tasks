import { useMemo } from "react";
import { getPointAtConnectorUrl } from "@/shared/services/pointAtFunctionService";

/** The URL people add as a connector for agent login, or null when Supabase is not configured. */
export const usePointAtConnectorUrl = (): string | null =>
  useMemo(() => getPointAtConnectorUrl(), []);
