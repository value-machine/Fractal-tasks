import type { Db } from "./db.ts";

/**
 * Open tasks a new task may overtake, duplicate or relate to, found deterministically: they share
 * a lens label (a place, a topic) or words in the title. Deciding whether one is really overtaken
 * stays with the agent; this only makes sure it looks (PROCESS.md 2.4).
 */
export interface OverlapCandidate {
  id: string;
  title: string;
  shared_labels: string[];
  /** The new task this candidate was found for. */
  for_id: string;
}

const PER_TASK = 5;
/** Words this short say little about what a task is about. */
const MIN_WORD_LENGTH = 4;

/** Title words as an OR query for websearch_to_tsquery ("plot or plants or water"). */
function titleQuery(title: string): string {
  const words = title
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= MIN_WORD_LENGTH);
  return [...new Set(words)].join(" or ");
}

/**
 * For each new task, up to five open tasks elsewhere in the tree that share a label or title
 * words with it, best first. Leaves out the new tasks themselves and their own ancestors.
 */
export async function overlapCandidates(
  db: Db,
  tasks: { id: string; title: string; labels: string[] }[]
): Promise<OverlapCandidate[]> {
  const newIds = tasks.map((t) => t.id);
  const found: OverlapCandidate[] = [];
  for (const task of tasks) {
    const query = titleQuery(task.title);
    const rows = await db.query<{ id: string; title: string; shared_labels: string[] }>(
      `with recursive up as (
         select id, parent_id from nodes where id = $1
         union
         select n.id, n.parent_id from nodes n join up on n.id = up.parent_id
       )
       select n.id, n.title,
         array(select unnest(n.labels) intersect select unnest($2::text[])) as shared_labels
       from visible_nodes n
       where n.status not in ('done','overtaken')
         and n.id <> all($3::uuid[])
         and n.id not in (select id from up)
         and (n.labels && $2::text[]
              or ($4 <> '' and n.search @@ websearch_to_tsquery('simple', $4)))
       order by
         cardinality(array(select unnest(n.labels) intersect select unnest($2::text[]))) desc,
         case when $4 <> '' then ts_rank(n.search, websearch_to_tsquery('simple', $4)) else 0 end desc,
         n.updated_at desc
       limit $5`,
      [task.id, task.labels, newIds, query, PER_TASK]
    );
    found.push(...rows.map((r) => ({ ...r, for_id: task.id })));
  }
  return found;
}
