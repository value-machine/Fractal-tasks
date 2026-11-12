// Point At: read-only JSON API for the browser UI, the signed-in person's agent tokens under
// /api/me/tokens, and the MCP server over HTTP at /mcp.
// Contract and test procedure: README.md in this folder.
import {
  createAgentToken,
  listAgentTokens,
  resolveAgentToken,
  revokeAgentToken,
} from "../_shared/pointAt/contributors.ts";
import type { Db } from "../_shared/pointAt/db.ts";
import { connectPostgres } from "../_shared/pointAt/postgresDb.ts";
import { PROCESS_DOC } from "../_shared/pointAt/processDoc.ts";
import { ProcessError, Store, type Role } from "../_shared/pointAt/store.ts";

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "apikey, authorization, content-type, x-point-at-actor",
  "access-control-max-age": "86400",
  "access-control-expose-headers": "www-authenticate, mcp-session-id",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let db: Db | undefined;
let store: Store | undefined;

/** One connection pool per isolate, created on first use. */
function getDb(): Db {
  if (db) return db;
  const url = Deno.env.get("SUPABASE_DB_URL");
  if (!url) throw new Error("SUPABASE_DB_URL is not set");
  db = connectPostgres(url);
  return db;
}

function getStore(): Store {
  store ??= new Store(getDb());
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
    return json(await s.rootsWithChildren());
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

  if (path === "/api/stats/reviews") {
    return json(await s.reviewStats({ label: url.searchParams.get("label") || undefined }));
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

const bearer = (req: Request): string =>
  (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();

interface SignedInUser {
  id: string;
  displayName: string;
}

/**
 * The person behind a browser request, from their Supabase session token. Asks Supabase Auth
 * itself, so an expired or forged token is refused. Null when not signed in.
 */
async function signedInUser(req: Request): Promise<SignedInUser | null> {
  const token = bearer(req);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!token || !supabaseUrl || !anonKey) return null;
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  if (!user?.id || user.is_anonymous) return null;
  const meta = user.user_metadata ?? {};
  const displayName =
    meta.user_name || meta.full_name || meta.name || String(user.email ?? "").split("@")[0];
  return { id: user.id, displayName: String(displayName).slice(0, 80) };
}

/** The signed-in person's agent tokens: list (GET), create (POST {name}), revoke (DELETE /:id). */
async function handleMyTokens(req: Request, path: string): Promise<Response> {
  try {
    return await myTokens(req, path);
  } catch (err: unknown) {
    // A refused request (no name, too many tokens, unknown token) is the caller's to fix.
    if (err instanceof ProcessError) {
      return json({ error: err.message }, err.message === "No such token." ? 404 : 400);
    }
    throw err;
  }
}

async function myTokens(req: Request, path: string): Promise<Response> {
  const user = await signedInUser(req);
  if (!user) return json({ error: "Sign in first" }, 401);
  if (path === "/api/me/tokens" && req.method === "GET") {
    return json(await listAgentTokens(getDb(), user.id));
  }
  if (path === "/api/me/tokens" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const created = await createAgentToken(getDb(), {
      userId: user.id,
      displayName: user.displayName,
      name: String(body?.name ?? ""),
    });
    return json(created, 201);
  }
  const revoke = path.match(/^\/api\/me\/tokens\/([^/]+)$/);
  if (revoke && req.method === "DELETE") {
    const tokenId = decodeURIComponent(revoke[1]);
    if (!UUID_PATTERN.test(tokenId)) throw new ProcessError("No such token.");
    return json(await revokeAgentToken(getDb(), { userId: user.id, tokenId }));
  }
  return json({ error: "Method not allowed" }, 405);
}

/**
 * Writes go through MCP, so every MCP call must say whose agent it is: an access token from agent
 * login (OAuth via Supabase Auth), or a personal agent token for tools that cannot log in.
 */
async function authenticateMcp(req: Request): Promise<{ contributor?: string } | Response> {
  const given = bearer(req);
  // The header tells MCP clients where to log in (agent login, OAuth via Supabase Auth).
  const unauthorized = () =>
    json({ error: "Unauthorized" }, 401, {
      "www-authenticate": `Bearer resource_metadata="${functionUrl()}/.well-known/oauth-protected-resource"`,
    });
  if (!given) return unauthorized();
  if (given.startsWith("pa_")) {
    const owner = await resolveAgentToken(getDb(), given);
    return owner ? { contributor: owner.displayName } : unauthorized();
  }
  // Agent login: an access token Supabase Auth issued after the person approved the agent tool.
  const user = await signedInUser(req);
  return user ? { contributor: user.displayName } : unauthorized();
}

/** This function's public URL, e.g. https://<ref>.supabase.co/functions/v1/point-at. */
function functionUrl(): string {
  return `${(Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "")}/functions/v1/point-at`;
}

/**
 * OAuth protected resource metadata (RFC 9728): tells an MCP client that Supabase Auth is the
 * login server for this MCP endpoint, so it can register, send the person to approve, and get
 * tokens on its own. The person only pastes the MCP URL.
 */
function protectedResourceMetadata(): Response {
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  return json({
    resource: `${functionUrl()}/mcp`,
    authorization_servers: [`${supabaseUrl}/auth/v1`],
    bearer_methods_supported: ["header"],
    resource_name: "Point At",
  });
}

/** MCP over streamable HTTP, stateless: a fresh server and transport per request. */
async function handleMcp(req: Request): Promise<Response> {
  const caller = await authenticateMcp(req);
  if (caller instanceof Response) return caller;
  // Loaded on first MCP request only: the MCP SDK and zod are the heaviest imports, and the web
  // view's /api calls never need them, so a cold start for the browser stays light.
  const [{ WebStandardStreamableHTTPServerTransport }, { createMcpServer }] = await Promise.all([
    import("npm:@modelcontextprotocol/sdk@1.32.2/server/webStandardStreamableHttp.js"),
    import("../_shared/pointAt/mcpServer.ts"),
  ]);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createMcpServer(getStore(), {
    contributor: caller.contributor,
    defaultActor: req.headers.get("x-point-at-actor") || undefined,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = routePath(url);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

  try {
    if (path === "/mcp") return await handleMcp(req);
    if (path.startsWith("/.well-known/oauth-protected-resource")) return protectedResourceMetadata();
    if (path.startsWith("/api/me/")) return await handleMyTokens(req, path);
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
