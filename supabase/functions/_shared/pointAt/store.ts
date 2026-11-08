import type { Db } from "./db.ts";

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
  claimed_by: string | null;
  claimed_at: string | null;
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

export class ProcessError extends Error {}

const NODE_COLUMNS = `
  n.id, n.parent_id, n.title, n.done_check, n.next_action, n.status, n.leaf_type,
  n.leaf_who, n.leaf_what, n.leaf_how, n.split_hypothesis, n.split_prediction,
  n.split_assumptions, n.split_at, n.labels, n.claimed_by, n.claimed_at,
  n.verification_level, n.overtaken_note, n.unclear_reason, n.created_by,
  n.created_at, n.updated_at`;

const summarySelect = (extraColumns = "") => `
  select ${NODE_COLUMNS},
    (select count(*)::int from nodes c where c.parent_id = n.id) as child_count,
    (select count(*)::int from nodes c where c.parent_id = n.id and c.status in ('done','overtaken')) as done_child_count
    ${extraColumns}
  from nodes n`;
const SUMMARY_SELECT = summarySelect();

const CLOSED: Status[] = ["done", "overtaken"];

export interface NewNodeInput {
  title: string;
  done_check?: string | null;
  next_action?: string | null;
  labels?: string[];
}

/** What a split records on its parent (PROCESS.md 6). */
export interface SplitRecord {
  hypothesis: string;
  prediction?: string;
  assumptions?: string;
}

export class Store {
  constructor(private db: Db) {}

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
         from nodes where id = $1
         union all
         select p.id, p.parent_id, p.title, p.status, p.split_hypothesis, p.split_prediction, up.up_steps + 1
         from nodes p join up on p.id = up.parent_id
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
         select n.id, n.title, n.split_at from nodes n
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

  async links(id: string) {
    const serves = await this.db.query<{ id: string; title: string; note: string | null }>(
      `select n.id, n.title, l.note from node_links l join nodes n on n.id = l.to_id where l.from_id = $1`,
      [id]
    );
    const servedBy = await this.db.query<{ id: string; title: string; note: string | null }>(
      `select n.id, n.title, l.note from node_links l join nodes n on n.id = l.from_id where l.to_id = $1`,
      [id]
    );
    return { also_serves: serves, served_by: servedBy };
  }

  /** Everything needed to focus on a node: the node, where it sits, its children and history. */
  async focus(id: string) {
    const [node, ancestors, children, events, links] = await Promise.all([
      this.getNode(id),
      this.ancestors(id),
      this.children(id),
      this.events(id),
      this.links(id),
    ]);
    const [siblings, split, dependencies] = await Promise.all([
      node.parent_id
        ? this.db.query<Pick<Node, "id" | "title" | "status" | "leaf_type">>(
            `select id, title, status, leaf_type from nodes
             where parent_id = $1 and id <> $2 order by created_at`,
            [node.parent_id, id]
          )
        : Promise.resolve([]),
      this.splitReview(id, node.split_at),
      this.dependencies(id),
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
      needs: dependencies.needs,
      needed_by: dependencies.needed_by,
      children: children.map((c) => ({
        ...c,
        children: grandchildren.filter((g) => g.parent_id === c.id),
      })),
      events,
      links,
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
    opts: { label?: string; query?: string; limit?: number; kind?: DonorKind } = {}
  ): Promise<(NodeSummary & { why?: string; kind?: DonorKind })[]> {
    const limit = opts.limit ?? 25;
    const params: unknown[] = [];
    const filters: string[] = [];
    if (opts.label) {
      params.push(opts.label);
      filters.push(`$${params.length} = any(n.labels)`);
    }
    if (opts.query) {
      params.push(opts.query);
      filters.push(
        `(n.search @@ websearch_to_tsquery('simple', $${params.length}) or n.title ilike '%' || $${params.length} || '%')`
      );
    }
    const extra = filters.length ? `and ${filters.join(" and ")}` : "";
    let kindFilter = "";
    if (opts.kind && role === "donor") {
      params.push(opts.kind);
      kindFilter = `where v.kind = $${params.length}`;
    }
    params.push(limit);
    const lim = `$${params.length}`;

    if (role === "executor") {
      const rows = await this.db.query<NodeSummary>(
        `${SUMMARY_SELECT}
         where n.leaf_type = 'human' and n.status not in ('done','overtaken')
           and n.claimed_by is null and n.unclear_reason is null ${extra}
           and not exists (
             select 1 from node_dependencies d join nodes dn on dn.id = d.needs_id
             where d.node_id = n.id and dn.status not in ('done','overtaken'))
         order by n.created_at limit ${lim}`,
        params
      );
      return rows;
    }

    // Token donors: open thinking work.
    const rejected = `(
               select e.verdict from node_events e
               where e.node_id = n.id and e.type = 'review' and e.created_at > n.split_at
               order by e.created_at desc, e.id desc limit 1
             ) = 'reject'`;
    const rows = await this.db.query<NodeSummary & { why: string; kind: DonorKind }>(
      `select * from (
         ${summarySelect(`,
           case
             when n.leaf_type = 'human' and n.unclear_reason is not null then 'refine'
             when n.leaf_type = 'agent' then 'run'
             when n.status = 'proposed' and n.split_at is not null and ${rejected} then 'replan'
             when n.status = 'proposed' and n.split_at is not null then 'review'
             else 'split'
           end as kind,
           case
             when n.leaf_type = 'human' and n.unclear_reason is not null then 'Bounced back by a human: refine the instruction'
             when n.leaf_type = 'agent' then 'Agent leaf ready to run'
             when n.status = 'proposed' and n.split_at is not null and ${rejected} then 'Split rejected in review: re-plan it'
             when n.status = 'proposed' and n.split_at is not null then 'Split awaiting adversarial review'
             else 'Open: confirm as a leaf or split it'
           end as why`)}
         where n.status not in ('done','overtaken') and n.claimed_by is null ${extra}
           and (
             (n.leaf_type = 'human' and n.unclear_reason is not null)
             or (n.leaf_type = 'agent' and not exists (
             select 1 from node_dependencies d join nodes dn on dn.id = d.needs_id
             where d.node_id = n.id and dn.status not in ('done','overtaken')))
             or (n.leaf_type is null and not exists (select 1 from nodes c where c.parent_id = n.id))
             or (n.status = 'proposed' and n.split_at is not null)
           )
       ) v
       ${kindFilter}
       order by case when v.unclear_reason is not null then 0 when v.leaf_type = 'agent' then 1 else 2 end, v.created_at
       limit ${lim}`,
      params
    );
    return rows;
  }

  // ---------------------------------------------------------------- writing

  async createRoot(input: NewNodeInput, actor: string): Promise<NodeSummary> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.query<{ id: string }>(
        `insert into nodes (title, done_check, next_action, labels, created_by)
         values ($1, $2, $3, $4, $5) returning id`,
        [
          input.title,
          input.done_check ?? null,
          input.next_action ?? null,
          input.labels ?? [],
          actor,
        ]
      );
      await logEvent(tx, row.id, actor, "created", "Root created");
      return new Store(tx).getNode(row.id);
    });
  }

  /** Decompose on focus (PROCESS.md 4.1 and 6). Adds children and records the split's hypothesis. */
  async split(parentId: string, input: SplitRecord & { children: NewNodeInput[] }, actor: string) {
    if (!input.children.length) throw new ProcessError("A split needs at least one child.");
    return this.db.transaction(async (tx) => {
      const parent = await new Store(tx).startSplit(parentId, input);
      const ids: string[] = [];
      for (const child of input.children) {
        const [row] = await tx.query<{ id: string }>(
          `insert into nodes (parent_id, title, done_check, next_action, labels, created_by)
           values ($1, $2, $3, $4, $5, $6) returning id`,
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
        await logEvent(tx, row.id, actor, "created", `Split from "${parent.title}"`);
      }
      await logEvent(
        tx,
        parentId,
        actor,
        "split",
        `${ids.length} children. Hypothesis: ${input.hypothesis}`
      );
      return {
        parent: await new Store(tx).getNode(parentId),
        children: await new Store(tx).children(parentId),
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
      const store = new Store(tx);
      const parent = await store.startSplit(parentId, input);
      const adopted: NodeSummary[] = [];
      for (const rootId of input.rootIds) {
        const root = await store.getNode(rootId);
        if (root.parent_id) throw new ProcessError(`"${root.title}" is not a root.`);
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
    input: { type: LeafType; done_check?: string; who?: string; what?: string; how?: string },
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
    await logEvent(this.db, id, actor, "note", `Marked as ${input.type} leaf`);
    return this.getNode(id);
  }

  async update(
    id: string,
    patch: Partial<Pick<Node, "title" | "done_check" | "next_action" | "labels">> & {
      leaf_type?: null;
    },
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
         ${unmark ? ", leaf_type = null, leaf_who = null, leaf_what = null, leaf_how = null" : ""}
       where id = $1`,
      [id, next.title, next.done_check, next.next_action, next.labels]
    );
    await logEvent(this.db, id, actor, "note", `Updated: ${Object.keys(patch).join(", ")}`);
    return this.getNode(id);
  }

  async claim(id: string, actor: string) {
    const node = await this.getNode(id);
    if (CLOSED.includes(node.status)) throw new ProcessError(`Node is ${node.status}.`);
    if (node.claimed_by && node.claimed_by !== actor) {
      throw new ProcessError(`Already claimed by ${node.claimed_by} since ${node.claimed_at}.`);
    }
    await this.db.query(
      `update nodes set claimed_by = $2, claimed_at = now(),
         status = case when status in ('proposed','reviewed') then 'in_progress' else status end
       where id = $1`,
      [id, actor]
    );
    await logEvent(this.db, id, actor, "claimed");
    return this.getNode(id);
  }

  async release(id: string, actor: string, note?: string) {
    await this.db.query(
      `update nodes set claimed_by = null, claimed_at = null,
         status = case when status = 'in_progress' then 'proposed' else status end
       where id = $1`,
      [id]
    );
    await logEvent(this.db, id, actor, "released", note);
    return this.getNode(id);
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
    // Claims are exclusive (PROCESS.md 9): only the claimer reports on a claimed node.
    if (node.claimed_by && node.claimed_by !== actor) {
      throw new ProcessError(
        `Claimed by ${node.claimed_by}; only they can report on it. Ask them, or wait for a release.`
      );
    }

    if (input.outcome === "unclear") {
      if (!input.note) throw new ProcessError("Say what is unclear (note).");
      await this.db.query(
        `update nodes set unclear_reason = $2, claimed_by = null, claimed_at = null,
           status = case when status = 'in_progress' then 'proposed' else status end where id = $1`,
        [id, input.note]
      );
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
    await this.db.query(
      `update nodes set status = 'done', verification_level = $2, claimed_by = null, claimed_at = null where id = $1`,
      [id, level]
    );
    await logEvent(this.db, id, actor, "report", input.note ?? "Done", input.evidence, level);

    return { node: await this.getNode(id), parent_check: await this.parentCheck(node.parent_id) };
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
      `update nodes set status = 'overtaken', overtaken_note = $2, claimed_by = null, claimed_at = null where id = $1`,
      [id, reason]
    );
    await logEvent(this.db, id, actor, "overtaken", reason);
    return { node: await this.getNode(id), parent_check: await this.parentCheck(node.parent_id) };
  }

  /** Adversarial review of a split (PROCESS.md 8). The reviewer must not be its author. */
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

  /** What this node needs first, and what waits for it. */
  async dependencies(id: string) {
    const needs = await this.db.query<{
      id: string;
      title: string;
      status: Status;
      note: string | null;
    }>(
      `select n.id, n.title, n.status, d.note from node_dependencies d
       join nodes n on n.id = d.needs_id where d.node_id = $1 order by d.created_at`,
      [id]
    );
    const neededBy = await this.db.query<{
      id: string;
      title: string;
      status: Status;
      note: string | null;
    }>(
      `select n.id, n.title, n.status, d.note from node_dependencies d
       join nodes n on n.id = d.node_id where d.needs_id = $1 order by d.created_at`,
      [id]
    );
    return { needs, needed_by: neededBy };
  }

  /**
   * Record that `nodeId` needs `needsId` closed first. Refuses a dependency that would close
   * a loop (A needs B needs ... needs A), since such leaves could never become ready.
   */
  async addDependency(input: { nodeId: string; needsId: string; note?: string }, actor: string) {
    const node = await this.getNode(input.nodeId);
    const needed = await this.getNode(input.needsId);
    if (CLOSED.includes(node.status)) throw new ProcessError(`Node is ${node.status}.`);
    if (node.id === needed.id) throw new ProcessError("A node cannot need itself.");
    const [loop] = await this.db.query<{ found: boolean }>(
      `with recursive chain as (
         select needs_id from node_dependencies where node_id = $1
         union
         select d.needs_id from node_dependencies d join chain c on d.node_id = c.needs_id
       )
       select exists (select 1 from chain where needs_id = $2) as found`,
      [input.needsId, input.nodeId]
    );
    if (loop?.found) {
      throw new ProcessError(
        `"${needed.title}" already (indirectly) needs "${node.title}"; this would be a loop.`
      );
    }
    await this.db.query(
      `insert into node_dependencies (node_id, needs_id, note, created_by) values ($1, $2, $3, $4)
       on conflict (node_id, needs_id) do update set note = excluded.note`,
      [input.nodeId, input.needsId, input.note ?? null, actor]
    );
    await logEvent(
      this.db,
      input.nodeId,
      actor,
      "link",
      `Needs first: ${needed.title}${input.note ? ` (${input.note})` : ""}`
    );
    return this.dependencies(input.nodeId);
  }

  async link(fromId: string, toId: string, note: string | undefined, actor: string) {
    await this.getNode(fromId);
    await this.getNode(toId);
    await this.db.query(
      `insert into node_links (from_id, to_id, note, created_by) values ($1, $2, $3, $4)
       on conflict (from_id, to_id) do update set note = excluded.note`,
      [fromId, toId, note ?? null, actor]
    );
    await logEvent(this.db, fromId, actor, "link", `Also serves ${toId}${note ? `: ${note}` : ""}`);
    return this.links(fromId);
  }
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
