import type { Db } from "./db.ts";
import { ProcessError } from "./processError.ts";

/**
 * Who is attached to a task over time. A claim is an assignment with role "claimed" and no
 * ended_at; at most one per task (the table enforces it). Ending a claim keeps the row as history.
 */
export type ClaimEndReason = "released" | "done" | "overtaken" | "unclear" | "unmarked";

/** The open claim on node alias `n`, joined into node reads as claim.claimed_by / claimed_at. */
export const OPEN_CLAIM_JOIN = `left join lateral (
    select a.actor as claimed_by, a.started_at as claimed_at from node_assignments a
    where a.node_id = n.id and a.role = 'claimed' and a.ended_at is null
  ) claim on true`;

/** Open a claim for `actor`; refused when someone else holds one. Claiming twice is a no-op. */
export async function openClaim(
  db: Db,
  input: { nodeId: string; actor: string; userId?: string | null }
): Promise<void> {
  const [current] = await db.query<{ actor: string; started_at: string }>(
    `select actor, started_at from node_assignments
     where node_id = $1 and role = 'claimed' and ended_at is null`,
    [input.nodeId]
  );
  if (current?.actor === input.actor) return;
  if (current) {
    throw new ProcessError(`Already claimed by ${current.actor} since ${current.started_at}.`);
  }
  try {
    await db.query(
      // A person who only used agent login has no contributors row yet; the claim still counts.
      `insert into node_assignments (node_id, user_id, actor, role)
       values ($1, (select user_id from contributors where user_id = $2::uuid), $3, 'claimed')`,
      [input.nodeId, input.userId ?? null, input.actor]
    );
  } catch (error: unknown) {
    // Two claims at the same moment: the unique index lets only one through.
    if (String((error as Error)?.message).includes("node_assignments_open_claim_idx")) {
      throw new ProcessError("Someone else claimed this task a moment ago.");
    }
    throw error;
  }
}

/** End the open claim on a task, if any, recording why. */
export async function endClaim(db: Db, nodeId: string, reason: ClaimEndReason): Promise<void> {
  await db.query(
    `update node_assignments set ended_at = clock_timestamp(), end_reason = $2
     where node_id = $1 and role = 'claimed' and ended_at is null`,
    [nodeId, reason]
  );
}

export interface AssignmentRecord {
  actor: string;
  role: string;
  started_at: string;
  ended_at: string | null;
  end_reason: string | null;
}

/** Everyone who held the task, newest first. */
export function assignmentHistory(db: Db, nodeId: string): Promise<AssignmentRecord[]> {
  return db.query<AssignmentRecord>(
    `select actor, role, started_at, ended_at, end_reason from node_assignments
     where node_id = $1 order by started_at desc`,
    [nodeId]
  );
}
