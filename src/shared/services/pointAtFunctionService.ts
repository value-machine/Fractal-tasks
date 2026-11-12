import { getEdgeFunctionConfig } from "@/shared/services/supabaseService";

/**
 * Shared client details for the point-at Edge Function, used by every feature that calls it
 * (the goal tree, agent tokens). Keeps the function name and region pin in one place.
 */
const POINT_AT_FUNCTION = "point-at";

/**
 * Run the function next to its database (Supabase project kyzhhofupypwmfjpbyfc, eu-west-1).
 * Without it the function runs near the caller and every query crosses to Ireland: measured
 * 2026-11-08, a goal page took about 1.0 s that way and about 0.25 s pinned. Supabase's
 * forceFunctionRegion query parameter is the CORS-safe form of the x-region header.
 */
const POINT_AT_FUNCTION_REGION = "eu-west-1";

/** Append the region pin to a function path that may already carry a query string. */
const inDatabaseRegion = (path: string): string =>
  `${path}${path.includes("?") ? "&" : "?"}forceFunctionRegion=${POINT_AT_FUNCTION_REGION}`;

/** Raised when the Supabase env vars are missing, so the UI can show a setup state. */
export class PointAtNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured");
    this.name = "PointAtNotConfiguredError";
  }
}

/** Full URL and default headers for a point-at path, or null when Supabase is not configured. */
export const getPointAtRequest = (
  path: string
): { url: string; headers: Record<string, string> } | null => {
  const config = getEdgeFunctionConfig(POINT_AT_FUNCTION);
  return config
    ? { url: `${config.baseUrl}${inDatabaseRegion(path)}`, headers: config.headers }
    : null;
};

/** URL agents connect their MCP client to, or null when Supabase is not configured. */
export const getPointAtMcpUrl = (): string | null => getPointAtRequest("/mcp")?.url ?? null;

/**
 * The URL people add as a connector in their agent tool for agent login. Plain (no region pin)
 * because it must equal the resource the login server issues tokens for.
 */
export const getPointAtConnectorUrl = (): string | null => {
  const config = getEdgeFunctionConfig(POINT_AT_FUNCTION);
  return config ? `${config.baseUrl}/mcp` : null;
};

/** The function's `{ error }` message, or a generic one with the status. */
export const readPointAtError = async (response: Response): Promise<string> => {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return `Request failed (${response.status})`;
};
