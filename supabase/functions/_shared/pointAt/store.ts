import {
  assignmentHistory,
  endClaim,
  OPEN_CLAIM_JOIN,
  openClaim,
  type ClaimEndReason,
} from "./assignments.ts";
import type { Db } from "./db.ts";
import { HYPERLINKS_COLUMN, saveHyperlinks, type Hyperlink } from "./hyperlinks.ts";
import { overlapCandidates, type OverlapCandidate } from "./overlapCandidates.ts";
import { ProcessError } from "./processError.ts";
import {
  addRelation,
  blockedSql,
  edgesAmong,
  openOvertakenBy,
  type RelationEdge,
  relationsOf,
  removeRelation,
  type RelationInput,
} from "./relations.ts";
import {
  estimateBelow,
  REQUIREMENTS_COLUMN,
  saveTaskDetails,
  taskDetailConditions,
  type Requirement,
  type TaskDetailFilters,
  type TaskDetailsInput,
} from "./taskDetails.ts";

export { ProcessError };

/**
 * Domain operations shared by the MCP server and the web API.
 * The rules here are only the ones PROCESS.md says must be shared for coordination:
 * node format, leaf rule, statuses, claiming, verification levels and review.
 * Judgement (what to split, what to work on next) stays with the agents.
 */

export type Status = "proposed" | "reviewed" | "in_progress" | "done" | "overtaken";
export type LeafType = "agent" | "human";
/** What kind of thinking work a donor-view row is. */
export type DonorKind = "refine" | "run" | "replan" | "review" | "split";
export type Role = "donor" | "executor";
/** Who can see a goal tree: everyone, or only its owner and the owner's agents. */
export type Visibility = "public" | "private";

export interface Node {
  id: string;
  parent_id: string | null;
  title: string;
  done_check: string | null;
  next_action: string | null;
  status: Status;
  leaf_type: LeafType | null;
  leaf_who: string | null;
  leaf_what: string | null;
  leaf_how: string | null;
  split_hypothesis: string | null;
  split_prediction: string | null;
  split_assumptions: string | null;
  split_at: string | null;
  labels: string[];
  visibility: Visibility;
  /** The open claim (node_assignments), read into the node. */
  claimed_by: string | null;
  claimed_at: string | null;
  /** Estimated time, as the upper bound of its bucket (taskDetails.ts DURATIONS). */
  duration_minutes: number | null;
  requirements: Requirement[];
  /** Context the task needs, as links only (hyperlinks.ts). */
  links: Hyperlink[];
  verification_level: number | null;
  overtaken_note: string | null;
  unclear_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NodeSummary extends Node {
  child_count: number;
  done_child_count: number;
}

export interface NodeEvent {
  id: number;
  node_id: string;
  actor: string;
  type: string;
  body: string | null;
  evidence: string | null;
  verification_level: number | null;
  verdict: string | null;
  created_at: string;
}

const NODE_COLUMNS = `
  n.id, n.parent_id, n.title, n.done_check, n.next_action, n.status, n.leaf_type,
  n.leaf_who, n.leaf_what, n.leaf_how, n.split_hypothesis, n.split_prediction,
  n.split_assumptions, n.split_at, n.labels, n.visibility, claim.claimed_by, claim.claimed_at,
  n.duration_minutes, ${REQUIREMENTS_COLUMN}, ${HYPERLINKS_COLUMN}, n.verification_level, n.overtaken_note, n.unclear_reason, n.created_by,
  n.created_at, n.updated_at`;

const summarySelect = (extraColumns = "") => `
  select ${NODE_COLUMNS},
    (select count(*)::int from nodes c where c.parent_id = n.id) as child_count,
    (select count(*)::int from nodes c where c.parent_id = n.id and c.status in ('done','overtaken')) as done_child_count
    ${extraColumns}
  from visible_nodes n ${OPEN_CLAIM_JOIN}`;
const SUMMARY_SELECT = summarySelect();

const CLOSED: Status[] = ["done", "overtaken"];

/**
 * Unmarking turns a leaf back into a node to split. Whoever claimed it was going to do the leaf,
 * not split it, so the claim is released with it.
 */
const UNMARK_LEAF = `, leaf_type = null, leaf_who = null, leaf_what = null, leaf_how = null,
  status = case when status = 'in_progress' then 'proposed' else status end`;

export interface NewNodeInput extends TaskDetailsInput {
  title: string;
  /** Root goals only: "private" keeps the goal and everything under it to its owner. */
  visibility?: Visibility;
  /** Replaces the task's links when given. */
  links?: Hyperlink[];
  done_check?: string | null;
  next_action?: string | null;
  labels?: string[];
}

/** One task in the graph view: enough to draw and colour it, and to place it in the tree. */
export type GraphNode = Pick<
  Node,
  "id" | "parent_id" | "title" | "status" | "leaf_type" | "duration_minutes"
> & { depth: number };

/** Enough to read a branch at a glance; bigger trees are opened from a lower node. */
export const GRAPH_NODE_LIMIT = 400;

/** Role-view filters: lens label, text, and what the work takes (duration, requirements). */
export interface ViewOptions extends TaskDetailFilters {
  label?: string;
  query?: string;
  limit?: number;
  kind?: DonorKind;
}

/** What a split records on its parent (PROCESS.md 6). */
export interface SplitRecord {
  hypothesis: string;
  prediction?: string;
  assumptions?: string;
}

/** One recorded split or adoption of a node. */
export interface SplitHistoryEntry {
  kind: "split" | "adopt";
  hypothesis: string;
  prediction: string | null;
  assumptions: string | null;
  child_ids: string[];
  created_by: string | null;
  created_at: string;
}

/** The latest review of the node's current split rejected it. */
const REJECTED = `(
  select e.verdict from node_events e
  where e.node_id = n.id and e.type = 'review' and e.created_at > n.split_at
  order by e.created_at desc, e.id desc limit 1
) = 'reject'`;

/** Donor-view kinds, first match wins; anything else open is "split". */
const DONOR_CASES: [string, DonorKind, string][] = [
  [
    "n.leaf_type = 'human' and n.unclear_reason is not null",
    "refine",
    "Bounced back by a human: refine the instruction",
  ],
  ["n.leaf_type = 'agent'", "run", "Agent leaf ready to run"],
  [
    `n.status = 'proposed' and n.split_at is not null and ${REJECTED}`,
    "replan",
    "Split rejected in review: re-plan it",
  ],
  [
    "n.status = 'proposed' and n.split_at is not null",
    "review",
    "Split awaiting adversarial review",
  ],
];
const donorCase = (pick: (c: [string, DonorKind, string]) => string, fallback: string) =>
  `case ${DONOR_CASES.map((c) => `when ${c[0]} then '${pick(c)}'`).join(" ")} else '${fallback}' end`;
const DONOR_KIND = donorCase((c) => c[1], "split");
const DONOR_WHY = donorCase((c) => c[2], "Open: confirm as a leaf or split it");

/** Label, text and task-detail filters shared by both role views. */
function viewConditions(opts: ViewOptions, params: unknown[]): string[] {
  const conditions = taskDetailConditions(opts, params);
  if (opts.label) {
    params.push(opts.label);
    conditions.push(`$${params.length} = any(n.labels)`);
  }
  if (opts.query) {
    params.push(opts.query);
    const p = `$${params.length}`;
    conditions.push(
      `(n.search @@ websearch_to_tsquery('simple', ${p}) or n.title ilike '%' || ${p} || '%')`
    );
  }
  return conditions;
}

export class Store {
  /**
   * `viewer` is the signed-in person behind the request (null for anonymous reads). Which private
   * goals a read can see is set on the database transaction (`Store.as`); the store also needs
   * the id to record who owns a new goal.
   */
  constructor(
    private db: Db,
    readonly viewer: string | null = null
  ) {}

  /**
   * Run `fn` with a store that sees public goals plus `viewer`'s private ones (visible_nodes).
   * Everything in `fn` shares one transaction, so the viewer setting holds for all its queries.
   */
  static as<T>(db: Db, viewer: string | null, fn: (store: Store) => Promise<T>): Promise<T> {
    return db.transaction(async (tx) => {
      await tx.query(`select set_config('point_at.viewer', $1, true)`, [viewer ?? ""]);
      return fn(new Store(tx, viewer));
    });
  }

  // ---------------------------------------------------------------- reading

  async getNode(id: string): Promise<NodeSummary> {
    const rows = await this.db.query<NodeSummary>(`${SUMMARY_SELECT} where n.id = $1`, [id]);
    if (!rows[0]) throw new ProcessError(`No node with id ${id}`);
    return rows[0];
  }

  async listRoots(): Promise<NodeSummary[]> {
    return this.db.query<NodeSummary>(
      `${SUMMARY_SELECT} where n.parent_id is null order by n.created_at`
    );
  }

  /** Root goals with their children, in two queries instead of one per root. */
  async rootsWithChildren(): Promise<(NodeSummary & { children: NodeSummary[] })[]> {
    const roots = await this.listRoots();
    if (!roots.length) return [];
    const children = await this.db.query<NodeSummary>(
      `${SUMMARY_SELECT} where n.parent_id = any($1::uuid[]) order by n.created_at`,
      [roots.map((r) => r.id)]
    );
    return roots.map((r) => ({ ...r, children: children.filter((c) => c.parent_id === r.id) }));
  }

  async children(id: string): Promise<NodeSummary[]> {
    return this.db.query<NodeSummary>(
      `${SUMMARY_SELECT} where n.parent_id = $1 order by n.created_at`,
      [id]
    );
  }

  /** Ancestors from the root down to (not including) the node. */
  /**
   * Ancestors from the root down to (not including) the node, each with its split's reasoning,
   * so an agent entering mid-tree can see why every level exists.
   */
  async ancestors(id: string): Promise<
    (Pick<Node, "id" | "title" | "status" | "split_hypothesis" | "split_prediction"> & {
      depth: number;
    })[]
  > {
    return this.db.query(
      `with recursive up as (
         select id, parent_id, title, status, split_hypothesis, split_prediction, 0 as up_steps
         from visible_nodes where id = $1
         union all
         select p.id, p.parent_id, p.title, p.status, p.split_hypothesis, p.split_prediction, up.up_steps + 1
         from visible_nodes p join up on p.id = up.parent_id
       )
       select id, title, status, split_hypothesis, split_prediction,
         ((select max(up_steps) from up) - up_steps)::int as depth
       from up where up_steps > 0 order by up_steps desc`,
      [id]
    );
  }

  /** Who split the node last, and the latest review of that split, if any. */
  async splitReview(id: string, splitAt: string | null) {
    if (!splitAt) return null;
    const [author] = await this.db.query<{ actor: string }>(
      `select actor from node_events where node_id = $1 and type = 'split' order by created_at desc, id desc limit 1`,
      [id]
    );
    const [review] = await this.db.query<{
      actor: string;
      verdict: string;
      body: string;
      created_at: string;
    }>(
      `select actor, verdict, body, created_at from node_events
       where node_id = $1 and type = 'review' and created_at > $2
       order by created_at desc, id desc limit 1`,
      [id, splitAt]
    );
    return {
      author: author?.actor ?? null,
      state: review ? (review.verdict === "accept" ? "accepted" : "rejected") : "awaiting review",
      last_review: review ?? null,
    };
  }

  async events(id: string, limit = 20): Promise<NodeEvent[]> {
    return this.db.query<NodeEvent>(
      `select * from node_events where node_id = $1 order by created_at desc, id desc limit $2`,
      [id, limit]
    );
  }

  /**
   * Review timing, measured from the event log (step 1 of the review-gate plan in
   * documentation/jobs/temp_job_first-tests/RESULTS.md): how often work on a split's children
   * starts before anyone reviewed the split, how much of that work sits under a rejected split,
   * how long the first review takes, and how often splits are rejected. Read-only.
   */
  async reviewStats(opts: { label?: string } = {}) {
    const params: unknown[] = [];
    let labelFilter = "";
    if (opts.label) {
      params.push(opts.label);
      labelFilter = `and $${params.length} = any(n.labels)`;
    }
    const rows = await this.db.query<{
      id: string;
      title: string;
      split_at: string;
      first_review_at: string | null;
      verdict: string | null;
      verdict_reason: string | null;
      first_work_at: string | null;
      work_events: number;
    }>(
      `with splits as (
         select n.id, n.title, n.split_at from visible_nodes n
         where n.split_at is not null ${labelFilter}
       ),
       reviews as (
         select e.node_id, min(e.created_at) as first_review_at from node_events e
         join splits s on s.id = e.node_id
         where e.type = 'review' and e.created_at > s.split_at group by e.node_id
       ),
       latest as (
         select distinct on (e.node_id) e.node_id, e.verdict, e.body from node_events e
         join splits s on s.id = e.node_id
         where e.type = 'review' and e.created_at > s.split_at
         order by e.node_id, e.created_at desc, e.id desc
       ),
       work as (
         select c.parent_id as node_id, min(e.created_at) as first_work_at, count(*)::int as work_events
         from nodes c join splits s on s.id = c.parent_id
         join node_events e on e.node_id = c.id
         where e.type in ('claimed', 'report', 'split') and e.created_at > s.split_at
         group by c.parent_id
       )
       select s.id, s.title, s.split_at, r.first_review_at, l.verdict, l.body as verdict_reason,
         w.first_work_at, coalesce(w.work_events, 0) as work_events
       from splits s
       left join reviews r on r.node_id = s.id
       left join latest l on l.node_id = s.id
       left join work w on w.node_id = s.id
       order by s.split_at desc`,
      params
    );

    const minutes = (from: string, to: string) =>
      (new Date(to).getTime() - new Date(from).getTime()) / 60000;
    const reviewed = rows.filter((r) => r.first_review_at);
    const waits = reviewed
      .map((r) => minutes(r.split_at, r.first_review_at as string))
      .sort((a, b) => a - b);
    const median = waits.length ? waits[Math.floor(waits.length / 2)] : null;
    const workedBeforeReview = rows.filter(
      (r) => r.first_work_at && (!r.first_review_at || r.first_work_at < r.first_review_at)
    );
    const rejected = rows.filter((r) => r.verdict === "reject");
    const rejectedWithWork = rejected.filter((r) => r.work_events > 0);
    const round = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

    return {
      splits: rows.length,
      reviewed: reviewed.length,
      awaiting_review: rows.length - reviewed.length,
      work_started_before_review: workedBeforeReview.length,
      rejected: rejected.length,
      rejected_share: reviewed.length ? round(rejected.length / reviewed.length) : null,
      rejected_with_work_on_children: rejectedWithWork.length,
      work_events_under_rejected_splits: rejectedWithWork.reduce(
        (sum, r) => sum + r.work_events,
        0
      ),
      minutes_to_first_review: { median: round(median), max: round(waits.at(-1) ?? null) },
      rejected_splits: rejected.map((r) => ({
        id: r.id,
        title: r.title,
        work_events_on_children: r.work_events,
        reason: r.verdict_reason,
      })),
    };
  }

  /** Visibility of a new root: public unless the signed-in creator asks for private. */
  private newGoalVisibility(requested: Visibility | undefined): Visibility {
    if (requested !== "private") return "public";
    if (!this.viewer) {
      throw new ProcessError("Sign in (agent login or a personal token) to keep a goal private.");
    }
    return "private";
  }

  /** Whether two nodes have the same visibility and, when private, the same owner. */
  async sameTreeOwnership(a: string, b: string): Promise<boolean> {
    const [row] = await this.db.query<{ same: boolean }>(
      `select (x.visibility = y.visibility
               and (x.visibility = 'public' or x.owner_user_id = y.owner_user_id)) as same
       from nodes x, nodes y where x.id = $1 and y.id = $2`,
      [a, b]
    );
    return Boolean(row?.same);
  }

  /**
   * Make a goal and everything under it public or private. Only for roots, and only by the
   * account that owns the goal (owner decision 2026-11-23: public by default).
   */
  async setVisibility(id: string, visibility: Visibility, actor: string): Promise<NodeSummary> {
    const node = await this.getNode(id);
    if (node.parent_id) {
      throw new ProcessError("Only a root goal sets visibility; its whole tree follows it.");
    }
    const [owner] = await this.db.query<{ owner_user_id: string | null }>(
      `select owner_user_id from nodes where id = $1`,
      [id]
    );
    if (!this.viewer || owner?.owner_user_id !== this.viewer) {
      throw new ProcessError(
        "Only the goal's owner can change who sees it. Goals created before sign-in existed have no owner and stay public."
      );
    }
    await this.db.query(
      `with recursive below as (
         select id from nodes where id = $1
         union all
         select c.id from nodes c join below b on c.parent_id = b.id
       )
       update nodes set visibility = $2 where id in (select id from below)`,
      [id, visibility]
    );
    await logEvent(this.db, id, actor, "note", `Made ${visibility}`);
    return this.getNode(id);
  }

  /** How many private steps of other people "also serve" this task: a count, never who or what. */
  async privateSupport(id: string): Promise<number> {
    const [row] = await this.db.query<{ n: number }>(
      `select count(*)::int as n from node_relations r join nodes f on f.id = r.from_id
       where r.to_id = $1 and r.type = 'also_serves' and f.visibility = 'private'
         and not exists (select 1 from visible_nodes v where v.id = f.id)`,
      [id]
    );
    return row?.n ?? 0;
  }

  /**
   * The signed-in person's own list: their private goals and the open tasks they claimed
   * (public or private), newest first.
   */
  async myTasks(): Promise<{ private_goals: NodeSummary[]; claimed: NodeSummary[] }> {
    if (!this.viewer) throw new ProcessError("Sign in to see your own tasks.");
    const privateGoals = await this.db.query<NodeSummary>(
      `${SUMMARY_SELECT} where n.parent_id is null and n.visibility = 'private'
         and n.owner_user_id = $1 order by n.updated_at desc`,
      [this.viewer]
    );
    const claimed = await this.db.query<NodeSummary>(
      `${SUMMARY_SELECT} where n.status not in ('done','overtaken') and exists (
         select 1 from node_assignments a where a.node_id = n.id and a.role = 'claimed'
           and a.ended_at is null and a.user_id = $1)
       order by n.updated_at desc`,
      [this.viewer]
    );
    return { private_goals: privateGoals, claimed };
  }

  /** Typed relations of the task (blocked by, also serves, ...), both directions. */
  relations(id: string) {
    return relationsOf(this.db, id);
  }

  /**
   * A task and everything split from it, with the typed relations among them, for the graph
   * view. Capped at GRAPH_NODE_LIMIT nodes, nearest levels first; `truncated` says so.
   */
  async graph(rootId: string): Promise<{
    root_id: string;
    nodes: GraphNode[];
    edges: RelationEdge[];
    truncated: boolean;
  }> {
    await this.getNode(rootId);
    const rows = await this.db.query<GraphNode>(
      `with recursive below as (
         select id, 0 as depth from nodes where id = $1
         union all
         select c.id, b.depth + 1 from nodes c join below b on c.parent_id = b.id
       )
       select n.id, n.parent_id, n.title, n.status, n.leaf_type, n.duration_minutes, b.depth
       from below b join visible_nodes n on n.id = b.id
       order by b.depth, n.created_at, n.id
       limit $2`,
      [rootId, GRAPH_NODE_LIMIT + 1]
    );
    const nodes = rows.slice(0, GRAPH_NODE_LIMIT);
    const edges = await edgesAmong(
      this.db,
      nodes.map((n) => n.id)
    );
    return { root_id: rootId, nodes, edges, truncated: rows.length > GRAPH_NODE_LIMIT };
  }

  /** Every split of this node, oldest first; the node's split_* fields hold only the latest. */
  async splits(id: string): Promise<SplitHistoryEntry[]> {
    return this.db.query<SplitHistoryEntry>(
      `select kind, hypothesis, prediction, assumptions, child_ids, created_by, created_at
       from node_splits where node_id = $1 order by created_at, id`,
      [id]
    );
  }

  /** Everything needed to focus on a node: the node, where it sits, its children and history. */
  async focus(id: string) {
    const [node, ancestors, children, events, relations] = await Promise.all([
      this.getNode(id),
      this.ancestors(id),
      this.children(id),
      this.events(id),
      this.relations(id),
    ]);
    const [siblings, split, splits, claims, estimate, served_privately] = await Promise.all([
      node.parent_id
        ? this.db.query<Pick<Node, "id" | "title" | "status" | "leaf_type">>(
            `select id, title, status, leaf_type from visible_nodes
             where parent_id = $1 and id <> $2 order by created_at`,
            [node.parent_id, id]
          )
        : Promise.resolve([]),
      this.splitReview(id, node.split_at),
      this.splits(id),
      assignmentHistory(this.db, id),
      node.child_count ? estimateBelow(this.db, id) : Promise.resolve(null),
      this.privateSupport(id),
    ]);
    const grandchildren = children.length
      ? await this.db.query<NodeSummary>(
          `${SUMMARY_SELECT} where n.parent_id = any($1::uuid[]) order by n.created_at`,
          [children.map((c) => c.id)]
        )
      : [];
    return {
      node,
      depth: ancestors.length,
      root: ancestors[0] ? { id: ancestors[0].id, title: ancestors[0].title } : null,
      ancestors,
      siblings,
      split,
      splits,
      relations,
      estimate,
      claims,
      hints: focusHints(node, relations),
      served_privately,
      children: children.map((c) => ({
        ...c,
        children: grandchildren.filter((g) => g.parent_id === c.id),
      })),
      events,
    };
  }

  async search(query: string, limit = 20): Promise<NodeSummary[]> {
    return this.db.query<NodeSummary>(
      `${SUMMARY_SELECT}
       where n.search @@ websearch_to_tsquery('simple', $1)
          or n.title ilike '%' || $1 || '%'
       order by ts_rank(n.search, websearch_to_tsquery('simple', $1)) desc, n.updated_at desc
       limit $2`,
      [query, limit]
    );
  }

  /**
   * Role views (PROCESS.md 2.3). Saved queries over fields every node carries.
   * Which of these is the "next best" task is left to the person's agent.
   */
  async view(
    role: Role,
    opts: ViewOptions = {}
  ): Promise<(NodeSummary & { why?: string; kind?: DonorKind })[]> {
    const params: unknown[] = [];
    const extra = viewConditions(opts, params)
      .map((c) => `and ${c}`)
      .join(" ");
    let kindFilter = "";
    if (opts.kind && role === "donor") {
      params.push(opts.kind);
      kindFilter = `where v.kind = $${params.length}`;
    }
    params.push(opts.limit ?? 25);
    const lim = `$${params.length}`;

    if (role === "executor") {
      return this.db.query<NodeSummary>(
        `${SUMMARY_SELECT}
         where n.leaf_type = 'human' and n.status not in ('done','overtaken')
           and claim.claimed_by is null and n.unclear_reason is null ${extra}
           and not ${blockedSql("n")}
         order by n.created_at limit ${lim}`,
        params
      );
    }

    // Token donors: open thinking work. Blocked tasks are not ready to run or to split yet:
    // how to split them usually depends on what the blocking task finds.
    return this.db.query<NodeSummary & { why: string; kind: DonorKind }>(
      `select * from (
         ${summarySelect(`, ${DONOR_KIND} as kind, ${DONOR_WHY} as why`)}
         where n.status not in ('done','overtaken') and claim.claimed_by is null ${extra}
           and (
             (n.leaf_type = 'human' and n.unclear_reason is not null)
             or (n.leaf_type = 'agent' and not ${blockedSql("n")})
             or (n.leaf_type is null and not exists (select 1 from nodes c where c.parent_id = n.id)
                 and not ${blockedSql("n")})
             or (n.status = 'proposed' and n.split_at is not null)
           )
       ) v
       ${kindFilter}
       order by case when v.unclear_reason is not null then 0 when v.leaf_type = 'agent' then 1 else 2 end, v.created_at
       limit ${lim}`,
      params
    );
  }

  // ---------------------------------------------------------------- writing

  async createRoot(
    input: NewNodeInput,
    actor: string
  ): Promise<NodeSummary & { check_overlap: OverlapCandidate[] }> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.query<{ id: string }>(
        `insert into nodes (title, done_check, next_action, labels, created_by, owner_user_id, visibility)
         values ($1, $2, $3, $4, $5, $6, $7) returning id`,
        [
          input.title,
          input.done_check ?? null,
          input.next_action ?? null,
          input.labels ?? [],
          actor,
          this.viewer,
          this.newGoalVisibility(input.visibility),
        ]
      );
      await saveNodeDetails(tx, { nodeId: row.id, input, actor });
      await logEvent(tx, row.id, actor, "created", "Root created");
      const node = await new Store(tx, this.viewer).getNode(row.id);
      return { ...node, check_overlap: await overlapCandidates(tx, [node]) };
    });
  }

  /** Decompose on focus (PROCESS.md 4.1 and 6). Adds children and records the split's hypothesis. */
  async split(parentId: string, input: SplitRecord & { children: NewNodeInput[] }, actor: string) {
    if (!input.children.length) throw new ProcessError("A split needs at least one child.");
    return this.db.transaction(async (tx) => {
      const parent = await new Store(tx, this.viewer).startSplit(parentId, input);
      const ids: string[] = [];
      for (const child of input.children) {
        const [row] = await tx.query<{ id: string }>(
          `insert into nodes (parent_id, title, done_check, next_action, labels, created_by,
             owner_user_id, visibility)
           select $1, $2, $3, $4, $5, $6, p.owner_user_id, p.visibility from nodes p where p.id = $1
           returning id`,
          [
            parentId,
            child.title,
            child.done_check ?? null,
            child.next_action ?? null,
            child.labels ?? parent.labels,
            actor,
          ]
        );
        ids.push(row.id);
        await saveNodeDetails(tx, { nodeId: row.id, input: child, actor });
        await logEvent(tx, row.id, actor, "created", `Split from "${parent.title}"`);
      }
      await recordSplit(tx, {
        nodeId: parentId,
        kind: "split",
        split: input,
        childIds: ids,
        actor,
      });
      await logEvent(
        tx,
        parentId,
        actor,
        "split",
        `${ids.length} children. Hypothesis: ${input.hypothesis}`
      );
      const children = await new Store(tx, this.viewer).children(parentId);
      return {
        parent: await new Store(tx, this.viewer).getNode(parentId),
        children,
        check_overlap: await overlapCandidates(
          tx,
          children.filter((c) => ids.includes(c.id))
        ),
      };
    });
  }

  /**
   * Adopt existing roots as children (PROCESS.md 2.1): investigation showed they are part of
   * this node's goal. Recorded as a new split with its own hypothesis, so it is reviewed like
   * one. Only roots can be adopted; the database refuses any adoption that would make a loop.
   */
  async adopt(
    parentId: string,
    input: SplitRecord & { rootIds: string[] },
    actor: string
  ): Promise<{ parent: NodeSummary; adopted: NodeSummary[] }> {
    if (!input.rootIds.length) throw new ProcessError("Name at least one root to adopt.");
    return this.db.transaction(async (tx) => {
      const store = new Store(tx, this.viewer);
      const parent = await store.startSplit(parentId, input);
      const adopted: NodeSummary[] = [];
      for (const rootId of input.rootIds) {
        const root = await store.getNode(rootId);
        if (root.parent_id) throw new ProcessError(`"${root.title}" is not a root.`);
        if (!(await store.sameTreeOwnership(rootId, parentId))) {
          throw new ProcessError(
            `"${root.title}" and "${parent.title}" differ in who can see them (private or public, or another owner); only goals with the same visibility can be adopted.`
          );
        }
        try {
          await tx.query(`update nodes set parent_id = $2 where id = $1`, [rootId, parentId]);
        } catch (error: unknown) {
          if (String((error as Error)?.message).includes("loop")) {
            throw new ProcessError(
              `"${root.title}" already contains "${parent.title}"; adopting it would make a loop.`
            );
          }
          throw error;
        }
        await logEvent(tx, rootId, actor, "adopted", `Adopted under "${parent.title}"`);
        adopted.push(await store.getNode(rootId));
      }
      await recordSplit(tx, {
        nodeId: parentId,
        kind: "adopt",
        split: input,
        childIds: adopted.map((n) => n.id),
        actor,
      });
      await logEvent(
        tx,
        parentId,
        actor,
        "split",
        `Adopted ${adopted.length} root(s): ${adopted.map((n) => n.title).join("; ")}. Hypothesis: ${input.hypothesis}`
      );
      return { parent: await store.getNode(parentId), adopted };
    });
  }

  /** Check a node can take children and record the split's hypothesis on it. */
  private async startSplit(parentId: string, input: SplitRecord): Promise<NodeSummary> {
    const parent = await this.getNode(parentId);
    if (CLOSED.includes(parent.status))
      throw new ProcessError(`Node is ${parent.status}; it cannot be split.`);
    if (parent.leaf_type) {
      throw new ProcessError(
        "Node is marked as a leaf. Unmark it with update_node (leaf_type: null) before splitting."
      );
    }
    const [blocker] = await this.db.query<{ title: string }>(
      `select bn.title from node_relations br join nodes bn on bn.id = br.to_id
       where br.from_id = $1 and br.type = 'blocked_by' and bn.status not in ('done','overtaken')
       limit 1`,
      [parentId]
    );
    if (blocker) {
      throw new ProcessError(
        `Not yet: this task is blocked by "${blocker.title}", which is still open. ` +
          "How to split it depends on what that task finds, so splitting now would plan past an open decision (PROCESS.md 4.4). " +
          "Refine its title or done check instead, and split it once the blocker is done."
      );
    }
    await this.db.query(
      `update nodes set split_hypothesis = $2, split_prediction = $3, split_assumptions = $4,
         split_at = now(), status = 'proposed' where id = $1`,
      [parentId, input.hypothesis, input.prediction ?? null, input.assumptions ?? null]
    );
    return parent;
  }

  /** Confirm a node as a leaf for an agent or a human (PROCESS.md 3). */
  async markLeaf(
    id: string,
    input: {
      type: LeafType;
      done_check?: string;
      who?: string;
      what?: string;
      how?: string;
      links?: Hyperlink[];
    } & TaskDetailsInput,
    actor: string
  ) {
    const node = await this.getNode(id);
    if (node.child_count > 0) throw new ProcessError("A node with children is not a leaf.");
    if (CLOSED.includes(node.status)) throw new ProcessError(`Node is ${node.status}.`);
    const doneCheck = input.done_check ?? node.done_check;
    if (!doneCheck) throw new ProcessError("A leaf needs a yes/no done check (done_check).");
    if (input.type === "human" && !(input.who && input.what && input.how)) {
      throw new ProcessError("A human leaf needs who, what and how (PROCESS.md 3.3).");
    }
    await this.db.query(
      `update nodes set leaf_type = $2, done_check = $3, leaf_who = $4, leaf_what = $5, leaf_how = $6,
         unclear_reason = null where id = $1`,
      [id, input.type, doneCheck, input.who ?? null, input.what ?? null, input.how ?? null]
    );
    await saveNodeDetails(this.db, { nodeId: id, input, actor });
    await logEvent(this.db, id, actor, "note", `Marked as ${input.type} leaf`);
    return this.getNode(id);
  }

  async update(
    id: string,
    patch: Partial<Pick<Node, "title" | "done_check" | "next_action" | "labels">> & {
      leaf_type?: null;
      links?: Hyperlink[];
    } & TaskDetailsInput,
    actor: string
  ) {
    const node = await this.getNode(id);
    const next = {
      title: patch.title ?? node.title,
      done_check: patch.done_check === undefined ? node.done_check : patch.done_check,
      next_action: patch.next_action === undefined ? node.next_action : patch.next_action,
      labels: patch.labels ?? node.labels,
    };
    const unmark = patch.leaf_type === null;
    // Editing the node's words is the refinement a bounce-back asks for (PROCESS.md 3.3).
    const refines =
      patch.title !== undefined ||
      patch.done_check !== undefined ||
      patch.next_action !== undefined;
    await this.db.query(
      `update nodes set title = $2, done_check = $3, next_action = $4, labels = $5
         ${refines ? ", unclear_reason = null" : ""}
         ${unmark ? UNMARK_LEAF : ""}
       where id = $1`,
      [id, next.title, next.done_check, next.next_action, next.labels]
    );
    // A claimer was going to do the leaf, not split it (PROCESS.md 0.5), so unmarking ends the claim.
    if (unmark) await endClaim(this.db, id, "unmarked");
    await saveNodeDetails(this.db, { nodeId: id, input: patch, actor });
    await logEvent(this.db, id, actor, "note", `Updated: ${Object.keys(patch).join(", ")}`);
    return this.getNode(id);
  }

  /** Claim a task (PROCESS.md 8). `userId` ties the claim to the signed-in contributor. */
  async claim(id: string, actor: string, userId?: string | null) {
    const node = await this.getNode(id);
    if (CLOSED.includes(node.status)) throw new ProcessError(`Node is ${node.status}.`);
    return this.db.transaction(async (tx) => {
      await openClaim(tx, { nodeId: id, actor, userId });
      await tx.query(
        `update nodes set
           status = case when status in ('proposed','reviewed') then 'in_progress' else status end
         where id = $1`,
        [id]
      );
      await logEvent(tx, id, actor, "claimed");
      return new Store(tx, this.viewer).getNode(id);
    });
  }

  async release(id: string, actor: string, note?: string) {
    return this.db.transaction(async (tx) => {
      await this.closeClaim(tx, id, "released");
      await logEvent(tx, id, actor, "released", note);
      return new Store(tx, this.viewer).getNode(id);
    });
  }

  /** End the claim and move an in-progress task back to proposed. */
  private async closeClaim(db: Db, id: string, reason: ClaimEndReason) {
    await endClaim(db, id, reason);
    await db.query(
      `update nodes set status = case when status = 'in_progress' then 'proposed' else status end
       where id = $1`,
      [id]
    );
  }

  /**
   * Report back what happened (PROCESS.md 3.3 and 3.4).
   * done: closes the node at a verification level. unclear: bounce-back to the agents.
   * progress: a note while the work continues.
   */
  async report(
    id: string,
    input: {
      outcome: "done" | "unclear" | "progress";
      note?: string;
      evidence?: string;
      verification_level?: number;
    },
    actor: string
  ) {
    const node = await this.getNode(id);
    if (CLOSED.includes(node.status)) throw new ProcessError(`Node is already ${node.status}.`);
    // Claims are exclusive (PROCESS.md 8): only the claimer reports on a claimed node.
    if (node.claimed_by && node.claimed_by !== actor) {
      throw new ProcessError(
        `Claimed by ${node.claimed_by}; only they can report on it. Ask them, or wait for a release.`
      );
    }

    if (input.outcome === "unclear") {
      if (!input.note) throw new ProcessError("Say what is unclear (note).");
      await this.closeClaim(this.db, id, "unclear");
      await this.db.query(`update nodes set unclear_reason = $2 where id = $1`, [id, input.note]);
      await logEvent(this.db, id, actor, "unclear", input.note);
      return { node: await this.getNode(id) };
    }

    if (input.outcome === "progress") {
      await logEvent(this.db, id, actor, "report", input.note, input.evidence);
      return { node: await this.getNode(id) };
    }

    if (node.child_count > node.done_child_count) {
      throw new ProcessError(
        "This node still has open children. Finish or mark them overtaken first."
      );
    }
    const level = input.verification_level ?? (input.evidence ? 2 : 1);
    await this.db.query(`update nodes set status = 'done', verification_level = $2 where id = $1`, [
      id,
      level,
    ]);
    await endClaim(this.db, id, "done");
    const overtaken = await this.closeOvertakenBy(node, actor);
    await logEvent(this.db, id, actor, "report", input.note ?? "Done", input.evidence, level);

    return {
      node: await this.getNode(id),
      parent_check: await this.parentCheck(node.parent_id),
      ...(overtaken.length ? { overtaken } : {}),
    };
  }

  /**
   * A done task closes the tasks it overtakes, and everything open below them, as overtaken
   * (PROCESS.md 2.4; owner decision 2026-11-20). Returns what it closed.
   */
  private async closeOvertakenBy(
    done: NodeSummary,
    actor: string
  ): Promise<{ id: string; title: string }[]> {
    const hits = await openOvertakenBy(this.db, done.id);
    const note = `Overtaken by "${done.title}", which is done.`;
    for (const hit of hits) {
      await this.db.query(
        `update nodes set status = 'overtaken', overtaken_note = $2 where id = $1`,
        [hit.id, note]
      );
      await endClaim(this.db, hit.id, "overtaken");
      await logEvent(this.db, hit.id, actor, "overtaken", note);
    }
    return hits;
  }

  /**
   * The split hypothesis is tested by results (PROCESS.md 6): once the last child closes, done or
   * overtaken, point the agent at the parent.
   */
  private async parentCheck(parentId: string | null): Promise<string | undefined> {
    if (!parentId) return undefined;
    const parent = await this.getNode(parentId);
    if (parent.child_count !== parent.done_child_count) return undefined;
    return (
      `All children of "${parent.title}" are now closed. Test the split's hypothesis: ` +
      `is the parent's done check met${parent.split_prediction ? ` and did "${parent.split_prediction}" happen` : ""}? ` +
      "If so report it done; if not, re-plan it."
    );
  }

  /** Close a node that reality has overtaken (PROCESS.md 4.3). */
  async overtake(id: string, note: string, actor: string) {
    const reason = note?.trim();
    if (!reason) throw new ProcessError("Explain why the node is overtaken (note).");
    const node = await this.getNode(id);
    if (CLOSED.includes(node.status)) throw new ProcessError(`Node is already ${node.status}.`);
    await this.db.query(
      `update nodes set status = 'overtaken', overtaken_note = $2 where id = $1`,
      [id, reason]
    );
    await endClaim(this.db, id, "overtaken");
    await logEvent(this.db, id, actor, "overtaken", reason);
    return { node: await this.getNode(id), parent_check: await this.parentCheck(node.parent_id) };
  }

  /** Adversarial review of a split (PROCESS.md 7). The reviewer must not be its author. */
  async review(
    id: string,
    input: { verdict: "accept" | "reject"; reasoning: string },
    actor: string
  ) {
    const node = await this.getNode(id);
    const [author] = await this.db.query<{ actor: string }>(
      `select actor from node_events where node_id = $1 and type = 'split' order by created_at desc, id desc limit 1`,
      [id]
    );
    const splitAuthor = author?.actor ?? node.created_by;
    if (splitAuthor === actor)
      throw new ProcessError("A split must be reviewed by someone other than its author.");
    await this.db.query(
      `insert into node_events (node_id, actor, type, body, verdict) values ($1, $2, 'review', $3, $4)`,
      [id, actor, input.reasoning, input.verdict]
    );
    if (input.verdict === "accept" && node.status === "proposed") {
      await this.db.query(`update nodes set status = 'reviewed' where id = $1`, [id]);
    }
    return this.getNode(id);
  }

  /**
   * Relate two tasks with a typed relation (relations.ts). blocked_by keeps the task out of the
   * work lists until the other is closed; a blocked_by loop is refused.
   */
  async relate(input: RelationInput, actor: string) {
    const from = await this.getNode(input.fromId);
    const to = await this.getNode(input.toId);
    await addRelation(this.db, input, actor);
    await logEvent(
      this.db,
      from.id,
      actor,
      "link",
      `${input.type}: ${to.title}${input.note ? ` (${input.note})` : ""}`
    );
    return this.relations(from.id);
  }

  /** Remove a typed relation. */
  async unrelate(input: Omit<RelationInput, "note">, actor: string) {
    const to = await this.getNode(input.toId);
    if (!(await removeRelation(this.db, input))) {
      throw new ProcessError(`No ${input.type} relation between these tasks.`);
    }
    await logEvent(this.db, input.fromId, actor, "link", `Removed ${input.type}: ${to.title}`);
    return this.relations(input.fromId);
  }
}

/**
 * Planning reminders shown when an agent focuses a task: the rules agents most often need at
 * that moment, so they meet them even without rereading the process document.
 */
function focusHints(
  node: NodeSummary,
  relations: Awaited<ReturnType<typeof relationsOf>>
): string[] {
  const hints: string[] = [];
  const openBlockers = relations.filter(
    (r) =>
      r.type === "blocked_by" &&
      r.direction === "out" &&
      r.status !== "done" &&
      r.status !== "overtaken"
  );
  if (openBlockers.length && !node.leaf_type && node.child_count === 0) {
    hints.push(
      `Blocked by "${openBlockers[0].title}": do not split this yet. Its subtasks depend on what that task finds (PROCESS.md 4.4).`
    );
  }
  if (node.child_count === 0 && !node.leaf_type && !openBlockers.length) {
    hints.push(
      "Before splitting: does a later step depend on the outcome of an earlier one? Split only up to that decision, and record the later steps as blocked by it (PROCESS.md 4.4)."
    );
  }
  return hints;
}

/** Duration, requirements and links, for whichever of them the input carries. */
async function saveNodeDetails(
  db: Db,
  input: { nodeId: string; input: TaskDetailsInput & { links?: Hyperlink[] }; actor: string }
): Promise<void> {
  await saveTaskDetails(db, input.nodeId, input.input);
  if (input.input.links !== undefined) {
    await saveHyperlinks(db, { nodeId: input.nodeId, links: input.input.links, actor: input.actor });
  }
}

async function recordSplit(
  db: Db,
  entry: {
    nodeId: string;
    kind: SplitHistoryEntry["kind"];
    split: SplitRecord;
    childIds: string[];
    actor: string;
  }
) {
  await db.query(
    `insert into node_splits (node_id, kind, hypothesis, prediction, assumptions, child_ids, created_by)
     values ($1, $2, $3, $4, $5, $6::uuid[], $7)`,
    [
      entry.nodeId,
      entry.kind,
      entry.split.hypothesis,
      entry.split.prediction ?? null,
      entry.split.assumptions ?? null,
      entry.childIds,
      entry.actor,
    ]
  );
}

async function logEvent(
  db: Db,
  nodeId: string,
  actor: string,
  type: string,
  body?: string | null,
  evidence?: string | null,
  level?: number | null
) {
  await db.query(
    `insert into node_events (node_id, actor, type, body, evidence, verification_level) values ($1, $2, $3, $4, $5, $6)`,
    [nodeId, actor, type, body ?? null, evidence ?? null, level ?? null]
  );
}
