import type { Db } from "./db.ts";
import { ProcessError } from "./processError.ts";

/**
 * Typed relations between two tasks, beside the split-from tree (nodes.parent_id).
 * A row reads "from <type> to". Adding a type needs only the list below and the table's check.
 */
export const RELATION_TYPES = [
  "blocked_by",
  "also_serves",
  "alternative_to",
  "replaces",
  "duplicate_of",
  "related_to",
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

/** What each type means, for agents and the website. Read as "this task <phrase> the other". */
export const RELATION_MEANING: Record<RelationType, { out: string; in: string; rule: string }> = {
  blocked_by: {
    out: "is blocked by",
    in: "blocks",
    rule: "The task is left out of the work lists until the other is done or overtaken. Loops are refused.",
  },
  also_serves: {
    out: "also serves",
    in: "is also served by",
    rule: "Credit across goals; never drives splitting.",
  },
  alternative_to: {
    out: "is an alternative to",
    in: "is an alternative to",
    rule: "Either one reaches the same result; once one is done, the other can be marked overtaken.",
  },
  replaces: {
    out: "replaces",
    in: "is replaced by",
    rule: "A re-plan: the newer task takes over.",
  },
  duplicate_of: {
    out: "is a duplicate of",
    in: "has duplicate",
    rule: "The same task created twice; mark the duplicate overtaken and keep the other.",
  },
  related_to: { out: "is related to", in: "is related to", rule: "A loose link without rules." },
};

/** Types where "A to B" means the same as "B to A". */
const SYMMETRIC: ReadonlySet<RelationType> = new Set(["alternative_to", "related_to"]);

export interface Relation {
  type: RelationType;
  /** "out": this task is the subject ("this task is blocked by ..."); "in": the other one is. */
  direction: "out" | "in";
  id: string;
  title: string;
  status: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

/** A relation row as stored, for graph views. */
export interface RelationEdge {
  from_id: string;
  to_id: string;
  type: RelationType;
  note: string | null;
}

/** Every typed relation of one task, both directions, oldest first. */
export function relationsOf(db: Db, id: string): Promise<Relation[]> {
  return db.query<Relation>(
    `select r.type, 'out' as direction, n.id, n.title, n.status, r.note, r.created_by, r.created_at
       from node_relations r join nodes n on n.id = r.to_id where r.from_id = $1
     union all
     select r.type, 'in' as direction, n.id, n.title, n.status, r.note, r.created_by, r.created_at
       from node_relations r join nodes n on n.id = r.from_id where r.to_id = $1
     order by created_at`,
    [id]
  );
}

/** Relations among a set of tasks (both ends in the set), optionally of some types only. */
export function edgesAmong(db: Db, ids: string[], types?: RelationType[]): Promise<RelationEdge[]> {
  return db.query<RelationEdge>(
    `select from_id, to_id, type, note from node_relations
     where from_id = any($1::uuid[]) and to_id = any($1::uuid[])
       and ($2::text[] is null or type = any($2::text[]))
     order by created_at`,
    [ids, types ?? null]
  );
}

async function wouldBlockLoop(db: Db, fromId: string, toId: string): Promise<boolean> {
  const [row] = await db.query<{ found: boolean }>(
    `with recursive chain as (
       select to_id from node_relations where from_id = $1 and type = 'blocked_by'
       union
       select r.to_id from node_relations r join chain c on r.from_id = c.to_id
       where r.type = 'blocked_by'
     )
     select exists (select 1 from chain where to_id = $2) as found`,
    [toId, fromId]
  );
  return Boolean(row?.found);
}

async function existingSymmetric(db: Db, input: RelationInput): Promise<boolean> {
  if (!SYMMETRIC.has(input.type)) return false;
  const [row] = await db.query<{ found: boolean }>(
    `select exists (select 1 from node_relations where from_id = $1 and to_id = $2 and type = $3) as found`,
    [input.toId, input.fromId, input.type]
  );
  return Boolean(row?.found);
}

export interface RelationInput {
  fromId: string;
  toId: string;
  type: RelationType;
  note?: string;
}

/**
 * Record "from <type> to". Refuses a self-relation and a blocked_by loop (such tasks could never
 * become ready). A symmetric type already recorded the other way round is kept as it is.
 */
export async function addRelation(db: Db, input: RelationInput, actor: string): Promise<void> {
  if (!RELATION_TYPES.includes(input.type)) {
    throw new ProcessError(`Unknown relation type "${input.type}".`);
  }
  if (input.fromId === input.toId) throw new ProcessError("A task cannot relate to itself.");
  if (input.type === "blocked_by" && (await wouldBlockLoop(db, input.fromId, input.toId))) {
    throw new ProcessError(
      "The other task is already (indirectly) blocked by this one; this would be a loop."
    );
  }
  if (await existingSymmetric(db, input)) return;
  await db.query(
    `insert into node_relations (from_id, to_id, type, note, created_by) values ($1, $2, $3, $4, $5)
     on conflict (from_id, to_id, type) do update set note = excluded.note`,
    [input.fromId, input.toId, input.type, input.note ?? null, actor]
  );
}

/** Remove a relation; for symmetric types either direction. Returns whether one was removed. */
export async function removeRelation(db: Db, input: Omit<RelationInput, "note">): Promise<boolean> {
  const rows = await db.query<{ id: string }>(
    `delete from node_relations
     where type = $3 and ((from_id = $1 and to_id = $2) or ($4 and from_id = $2 and to_id = $1))
     returning id`,
    [input.fromId, input.toId, input.type, SYMMETRIC.has(input.type)]
  );
  return rows.length > 0;
}

/** SQL condition: task `alias` has a blocked_by relation to a task that is still open. */
export const blockedSql = (alias: string) => `exists (
  select 1 from node_relations br join nodes bn on bn.id = br.to_id
  where br.from_id = ${alias}.id and br.type = 'blocked_by' and bn.status not in ('done','overtaken'))`;
