/**
 * The exact shape agents receive from the read tools: null and empty-array fields are dropped
 * so they read less noise (never the top-level value). Shared by the MCP tools and the site's
 * "What an agent sees" view, so the view shows what agents really get.
 */
export function withoutNulls(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (key, v: unknown) =>
      key !== "" && (v === null || (Array.isArray(v) && v.length === 0)) ? undefined : v
    )
  );
}
