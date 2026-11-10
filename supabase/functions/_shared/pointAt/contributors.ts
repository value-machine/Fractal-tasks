import type { Db } from "./db.ts";
import { ProcessError } from "./store.ts";

/**
 * Contributor identity: personal agent tokens that tie an MCP write to a signed-in person.
 * Tokens are random, shown once, stored only as SHA-256 hashes, and revocable by their owner.
 */

/** Enough for any one person's agents; stops a runaway script from minting tokens forever. */
export const MAX_ACTIVE_TOKENS = 20;
const TOKEN_PREFIX_LENGTH = 10;

export interface AgentTokenRecord {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** "pa_" plus 32 random bytes, base64url: recognisable in configs, unguessable. */
function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const b64 = btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  return `pa_${b64}`;
}

const TOKEN_COLUMNS = "id, name, token_prefix, created_at, last_used_at, revoked_at";

/** Create the contributor on first use, then a named token for them. Returns the token once. */
export async function createAgentToken(
  db: Db,
  input: { userId: string; displayName: string; name: string }
): Promise<{ token: string; record: AgentTokenRecord }> {
  const name = input.name.trim();
  if (!name) throw new ProcessError("Give the token a name, such as the agent or device it is for.");
  return db.transaction(async (tx) => {
    await tx.query(
      `insert into contributors (user_id, display_name) values ($1, $2)
       on conflict (user_id) do nothing`,
      [input.userId, input.displayName.trim() || "Contributor"]
    );
    const [{ active }] = await tx.query<{ active: number }>(
      `select count(*)::int as active from agent_tokens where user_id = $1 and revoked_at is null`,
      [input.userId]
    );
    if (active >= MAX_ACTIVE_TOKENS) {
      throw new ProcessError(
        `You already have ${MAX_ACTIVE_TOKENS} active tokens. Revoke one you no longer use first.`
      );
    }
    const token = newToken();
    const [record] = await tx.query<AgentTokenRecord>(
      `insert into agent_tokens (user_id, name, token_hash, token_prefix)
       values ($1, $2, $3, $4) returning ${TOKEN_COLUMNS}`,
      [input.userId, name, await sha256Hex(token), token.slice(0, TOKEN_PREFIX_LENGTH)]
    );
    return { token, record };
  });
}

/** The signed-in person's tokens, newest first, without the secrets. */
export function listAgentTokens(db: Db, userId: string): Promise<AgentTokenRecord[]> {
  return db.query<AgentTokenRecord>(
    `select ${TOKEN_COLUMNS} from agent_tokens where user_id = $1 order by created_at desc`,
    [userId]
  );
}

/** Revoke one of the caller's own tokens; someone else's token is reported as not found. */
export async function revokeAgentToken(
  db: Db,
  input: { userId: string; tokenId: string }
): Promise<AgentTokenRecord> {
  const [record] = await db.query<AgentTokenRecord>(
    `update agent_tokens set revoked_at = coalesce(revoked_at, now())
     where id = $1 and user_id = $2 returning ${TOKEN_COLUMNS}`,
    [input.tokenId, input.userId]
  );
  if (!record) throw new ProcessError("No such token.");
  return record;
}

/** Who a bearer token belongs to, or null when it is unknown or revoked. */
export async function resolveAgentToken(
  db: Db,
  token: string
): Promise<{ userId: string; displayName: string; tokenId: string } | null> {
  if (!token.startsWith("pa_")) return null;
  const [row] = await db.query<{ user_id: string; display_name: string; id: string }>(
    `update agent_tokens t set last_used_at = now()
     from contributors c
     where t.token_hash = $1 and t.revoked_at is null and c.user_id = t.user_id
     returning t.id, t.user_id, c.display_name`,
    [await sha256Hex(token)]
  );
  return row ? { userId: row.user_id, displayName: row.display_name, tokenId: row.id } : null;
}

/** The actor recorded on a write: the person, plus the agent they say is acting for them. */
export function actorFor(displayName: string, agentLabel: string | undefined): string {
  const label = agentLabel?.trim();
  return label ? `${displayName} via ${label}` : displayName;
}
