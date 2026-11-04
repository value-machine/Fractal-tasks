// Point At: read-only JSON API for the browser UI, plus the MCP server over HTTP at /mcp.
// Contract and test procedure: README.md in this folder.
import { WebStandardStreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk@1.32.2/server/webStandardStreamableHttp.js";

import { connectPostgres } from "../_shared/pointAt/postgresDb.ts";
import { createMcpServer } from "../_shared/pointAt/mcpServer.ts";
import { PROCESS_DOC } from "../_shared/pointAt/processDoc.ts";
import { ProcessError, Store, type Role } from "../_shared/pointAt/store.ts";

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "apikey, authorization, content-type, x-point-at-actor",
  "access-control-max-age": "86400",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let store: Store | undefined;

/** One connection pool per isolate, created on first use. */
function getStore(): Store {
  if (store) return store;
  const url = Deno.env.get("SUPABASE_DB_URL");
  if (!url) throw new Error("SUPABASE_DB_URL is not set");
  store = new Store(connectPostgres(url));
  return store;
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS_HEADERS, ...extra },
  });
}

/** Requests arrive as /point-at/...; the full gateway path /functions/v1/point-at/... is accepted too. */
function routePath(url: URL): string {
  const path = url.pathname.replace(/^\/(?:functions\/v1\/)?point-at(?=\/|$)/, "");
  return path.replace(/\/+$/, "") || "/";
}

async function handleApi(path: string, url: URL): Promise<Response> {
  const s = getStore();

  if (path === "/api/roots") {
    const roots = await s.listRoots();
    return json(
      await Promise.all(roots.map(async (r) => ({ ...r, children: await s.children(r.id) })))
    );
  }

  if (path === "/api/process") {
    return new Response(PROCESS_DOC, {
      headers: { "content-type": "text/plain; charset=utf-8", ...CORS_HEADERS },
    });
  }

  const nodeMatch = path.match(/^\/api\/nodes\/([^/]+)$/);
  if (nodeMatch) {
    const id = decodeURIComponent(nodeMatch[1]);
    // A malformed id would reach Postgres as an invalid uuid and surface as a 500.
    if (!UUID_PATTERN.test(id)) throw new ProcessError(`No node with id ${id}`);
    return json(await s.focus(id));
  }

  if (path === "/api/search") {
    const q = (url.searchParams.get("q") ?? "").trim();
    return json(q ? await s.search(q, 30) : []);
  }

  const viewMatch = path.match(/^\/api\/views\/([^/]+)$/);
  if (viewMatch) {
    const role = viewMatch[1];
    if (role !== "donor" && role !== "executor") {
      return json({ error: "role must be donor or executor" }, 400);
    }
    return json(
      await s.view(role as Role, {
        label: url.searchParams.get("label") || undefined,
        query: url.searchParams.get("q") || undefined,
        limit: 50,
      })
    );
  }

  return json({ error: "Not found" }, 404);
}

/** Constant-time comparison, so response timing does not reveal how much of a token matched. */
function tokensMatch(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/**
 * Writes go through MCP, so MCP needs the shared secret POINT_AT_MCP_TOKEN as a bearer token
 * until contributor sign-in exists. Fails closed: without the secret set, MCP is refused.
 */
function mcpAuthError(req: Request): Response | null {
  const expected = Deno.env.get("POINT_AT_MCP_TOKEN");
  if (!expected) return json({ error: "MCP is not enabled on this deployment" }, 503);
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!given || !tokensMatch(given, expected)) {
    return json({ error: "Unauthorized" }, 401, { "www-authenticate": "Bearer" });
  }
  return null;
}

/** MCP over streamable HTTP, stateless: a fresh server and transport per request. */
async function handleMcp(req: Request): Promise<Response> {
  const denied = mcpAuthError(req);
  if (denied) return denied;
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createMcpServer(getStore(), req.headers.get("x-point-at-actor") || undefined);
  await server.connect(transport);
  return transport.handleRequest(req);
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = routePath(url);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

  try {
    if (path === "/mcp") return await handleMcp(req);
    if (path.startsWith("/api/")) {
      if (req.method !== "GET")
        return json({ error: "Method not allowed" }, 405, { allow: "GET, OPTIONS" });
      return await handleApi(path, url);
    }
    return json({ error: "Not found" }, 404);
  } catch (err: unknown) {
    if (err instanceof ProcessError) return json({ error: err.message }, 404);
    console.error("point-at request failed", err);
    return json({ error: "Internal error" }, 500);
  }
}

Deno.serve(handleRequest);
