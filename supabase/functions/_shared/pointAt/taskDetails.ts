import type { Db } from "./db.ts";
import { ProcessError } from "./processError.ts";

/**
 * How long a task takes and what it needs, so people can filter on what they can do.
 * Durations are buckets, stored as their upper bound in minutes so filters compare with <=.
 */
export const DURATIONS = {
  "15m": 15,
  "1h": 60,
  half_day: 240,
  day: 480,
  days: 2400,
} as const;
export type Duration = keyof typeof DURATIONS;
export const DURATION_NAMES = Object.keys(DURATIONS) as [Duration, ...Duration[]];

export const REQUIREMENT_KINDS = [
  "skill",
  "material",
  "money",
  "location",
  "language",
  "access",
] as const;
export type RequirementKind = (typeof REQUIREMENT_KINDS)[number];

export interface Requirement {
  kind: RequirementKind;
  value: string;
  amount?: number | null;
  unit?: string | null;
}

/** Fields a writer may set beside the node's words. Omitted fields stay as they are. */
export interface TaskDetailsInput {
  duration?: Duration | null;
  requirements?: Requirement[];
}

/** Requirements as JSON on each node read (alias `n`), so lists show them without another query. */
export const REQUIREMENTS_COLUMN = `coalesce((
    select json_agg(json_build_object('kind', r.kind, 'value', r.value, 'amount', r.amount, 'unit', r.unit)
                    order by r.created_at, r.id)
    from node_requirements r where r.node_id = n.id), '[]'::json) as requirements`;

/** Save duration and/or requirements. Requirements, when given, replace the task's whole list. */
export async function saveTaskDetails(
  db: Db,
  nodeId: string,
  input: TaskDetailsInput
): Promise<void> {
  if (input.duration !== undefined) {
    const minutes = input.duration === null ? null : DURATIONS[input.duration];
    if (minutes === undefined) throw new ProcessError(`Unknown duration "${input.duration}".`);
    await db.query(`update nodes set duration_minutes = $2 where id = $1`, [nodeId, minutes]);
  }
  if (input.requirements === undefined) return;
  for (const req of input.requirements) {
    if (!REQUIREMENT_KINDS.includes(req.kind)) {
      throw new ProcessError(`Unknown requirement kind "${req.kind}".`);
    }
    if (!req.value?.trim()) throw new ProcessError("A requirement needs a value.");
  }
  await db.query(`delete from node_requirements where node_id = $1`, [nodeId]);
  for (const req of input.requirements) {
    await db.query(
      `insert into node_requirements (node_id, kind, value, amount, unit) values ($1, $2, $3, $4, $5)`,
      [nodeId, req.kind, req.value.trim(), req.amount ?? null, req.unit?.trim() || null]
    );
  }
}

/** Filters on duration and requirements for the role views. */
export interface TaskDetailFilters {
  /** Only tasks estimated at or under this bucket; tasks without an estimate are left out. */
  maxDuration?: Duration;
  /** Only tasks whose money requirements add up to at most this amount (any unit). */
  maxCost?: number;
  /** Only tasks with a requirement mentioning this text, e.g. "Utrecht" or "Dutch". */
  requirement?: string;
  /** Leave out tasks that need any of these kinds, e.g. ["money", "material"]. */
  excludeKinds?: RequirementKind[];
}

/** SQL conditions on node alias `n` for the filters; pushes their values onto `params`. */
export function taskDetailConditions(filters: TaskDetailFilters, params: unknown[]): string[] {
  const conditions: string[] = [];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (filters.maxDuration) {
    conditions.push(`n.duration_minutes <= ${add(DURATIONS[filters.maxDuration])}`);
  }
  if (filters.maxCost !== undefined) {
    conditions.push(`coalesce((select sum(r.amount) from node_requirements r
      where r.node_id = n.id and r.kind = 'money'), 0) <= ${add(filters.maxCost)}`);
  }
  if (filters.requirement) {
    conditions.push(`exists (select 1 from node_requirements r
      where r.node_id = n.id and r.value ilike '%' || ${add(filters.requirement)} || '%')`);
  }
  if (filters.excludeKinds?.length) {
    conditions.push(`not exists (select 1 from node_requirements r
      where r.node_id = n.id and r.kind = any(${add(filters.excludeKinds)}::text[]))`);
  }
  return conditions;
}

export interface Estimate {
  open_leaf_minutes: number;
  open_leaves: number;
  unestimated_leaves: number;
}

/**
 * Rough total time of a task's open leaves, so a higher node shows the sum of its parts instead of
 * its own guess. Leaves without an estimate are counted separately.
 */
export async function estimateBelow(db: Db, nodeId: string): Promise<Estimate> {
  const [row] = await db.query<Estimate>(
    `with recursive below as (
       select id from nodes where parent_id = $1
       union all
       select c.id from nodes c join below b on c.parent_id = b.id
     )
     select coalesce(sum(n.duration_minutes), 0)::int as open_leaf_minutes,
       count(*)::int as open_leaves,
       count(*) filter (where n.duration_minutes is null)::int as unestimated_leaves
     from below b join nodes n on n.id = b.id
     where n.leaf_type is not null and n.status not in ('done','overtaken')`,
    [nodeId]
  );
  return row;
}
