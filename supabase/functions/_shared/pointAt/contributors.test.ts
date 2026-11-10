/**
 * Contributor identity rules (documentation/jobs/temp_job_contributor-identity/BRIEF.md):
 * personal agent tokens are stored hashed, shown once, revocable, and resolve writes to a person.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  actorFor,
  createAgentToken,
  listAgentTokens,
  resolveAgentToken,
  revokeAgentToken,
} from "./contributors.ts";
import type { Db } from "./db.ts";
import { createMigratedPglite } from "./pgliteDb.ts";
import { Store } from "./store.ts";

let db: Db;
let reset: () => Promise<void>;

const ALICE = "00000000-0000-4000-8000-0000000000a1";
const BOB = "00000000-0000-4000-8000-0000000000b2";

beforeAll(async () => {
  ({ db, reset } = await createMigratedPglite());
}, 60_000);
afterAll(async () => db.close());
beforeEach(async () => {
  await reset();
  await db.query("insert into auth.users (id) values ($1), ($2) on conflict do nothing", [ALICE, BOB]);
});

describe("agent tokens", () => {
  it("should show a token once and store only its hash when it is created", async () => {
    const { token, record } = await createAgentToken(db, {
      userId: ALICE,
      displayName: "Alice",
      name: "Claude Code laptop",
    });
    expect(token).toMatch(/^pa_[A-Za-z0-9_-]{40,}$/);
    expect(record.token_prefix).toBe(token.slice(0, 10));
    const [row] = await db.query<{ token_hash: string }>("select token_hash from agent_tokens");
    expect(row.token_hash).not.toContain(token);
    expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(await listAgentTokens(db, ALICE))).not.toContain(token);
  });

  it("should resolve a token to its owner's display name when it is valid", async () => {
    const { token } = await createAgentToken(db, { userId: ALICE, displayName: "Alice", name: "Laptop" });
    const resolved = await resolveAgentToken(db, token);
    expect(resolved?.displayName).toBe("Alice");
    expect((await listAgentTokens(db, ALICE))[0].last_used_at).not.toBeNull();
    expect(await resolveAgentToken(db, token + "x")).toBeNull();
    expect(await resolveAgentToken(db, "")).toBeNull();
  });

  it("should stop resolving a token when its owner revokes it", async () => {
    const { token, record } = await createAgentToken(db, { userId: ALICE, displayName: "Alice", name: "Laptop" });
    await revokeAgentToken(db, { userId: ALICE, tokenId: record.id });
    expect(await resolveAgentToken(db, token)).toBeNull();
    expect((await listAgentTokens(db, ALICE))[0].revoked_at).not.toBeNull();
  });

  it("should refuse to revoke a token when it belongs to someone else", async () => {
    const { token, record } = await createAgentToken(db, { userId: ALICE, displayName: "Alice", name: "Laptop" });
    await expect(revokeAgentToken(db, { userId: BOB, tokenId: record.id })).rejects.toThrow(/No such token/);
    expect(await resolveAgentToken(db, token)).not.toBeNull();
    expect(await listAgentTokens(db, BOB)).toEqual([]);
  });

  it("should require a token name and cap active tokens when creating", async () => {
    await expect(
      createAgentToken(db, { userId: ALICE, displayName: "Alice", name: "  " })
    ).rejects.toThrow(/name/);
    for (let i = 0; i < 20; i++) {
      await createAgentToken(db, { userId: ALICE, displayName: "Alice", name: `Agent ${i}` });
    }
    await expect(
      createAgentToken(db, { userId: ALICE, displayName: "Alice", name: "One too many" })
    ).rejects.toThrow(/20/);
  });
});

describe("actors", () => {
  it("should name the person and the agent when an agent label is given", () => {
    expect(actorFor("Alice", "Claude Code")).toBe("Alice via Claude Code");
    expect(actorFor("Alice", "  ")).toBe("Alice");
    expect(actorFor("Alice", undefined)).toBe("Alice");
  });

  it("should attribute a write to the token's owner whatever actor the agent claims", async () => {
    const { token } = await createAgentToken(db, { userId: ALICE, displayName: "Alice", name: "Laptop" });
    const resolved = await resolveAgentToken(db, token);
    const actor = actorFor(resolved!.displayName, "Bob");
    const root = await new Store(db).createRoot({ title: "A goal of Alice" }, actor);
    expect(root.created_by).toBe("Alice via Bob");
  });
});
