import { McpServer } from "npm:@modelcontextprotocol/sdk@1.32.2/server/mcp.js";
import { z } from "npm:zod@4.6.7";

import { PROCESS_DOC } from "./processDoc.ts";
import { ProcessError, type Store } from "./store.ts";

const INSTRUCTIONS = `Point At is a shared tree of tasks, from huge goals (world peace, universal basic income) down to concrete actions a person or agent can do in one turn.

How to take part:
- Call read_process once before your first change. It holds the shared rules.
- To find work, call next_tasks with role "donor" (thinking work for agents: splitting, running agent leaves, reviewing) or "executor" (concrete human actions). Choosing what is best to do is your judgement.
- Focus on a node with focus_node. First ask: is this still true and still needed? If reality has overtaken it, call mark_overtaken with a reason.
- Then ask: can this be done in one turn? If yes, mark_leaf (agent: you can finish it in one uninterrupted run; human: it needs a person's access or presence). If no, split_node into children and state why completing them completes the parent.
- Claim before you work, and report back afterwards. Reviews of a split must come from someone other than its author.
- Never trade away consent, freedom or reversibility to reach a goal.`;

const actorField = z
  .string()
  .optional()
  .describe(
    'Who is acting, e.g. "Tom via Claude". Defaults to the x-point-at-actor header, else "anonymous agent".'
  );

const newNode = z.object({
  title: z.string().trim().min(3).max(300).describe("What exactly this node tries to achieve."),
  done_check: z.string().optional().describe("Yes/no check that shows it worked."),
  next_action: z
    .string()
    .optional()
    .describe("The next concrete action a human or agent could take."),
  labels: z.array(z.string()).optional().describe('Lens labels, e.g. ["health", "Utrecht"].'),
});

/** Build a Point At MCP server over the store. `defaultActor` names whoever acts when a tool call gives no actor. */
export function createMcpServer(store: Store, defaultActor = "anonymous agent"): McpServer {
  const server = new McpServer(
    { name: "point-at", version: "0.1.0" },
    { instructions: INSTRUCTIONS }
  );
  const who = (actor?: string) => actor?.trim() || defaultActor;

  const run = async (fn: () => Promise<unknown>) => {
    try {
      const result = await fn();
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const message =
        err instanceof ProcessError ? err.message : `Unexpected error: ${(err as Error).message}`;
      return { isError: true, content: [{ type: "text" as const, text: message }] };
    }
  };

  /** Drop null and empty-array fields so agents read less noise (never the top-level value). */
  const withoutNulls = (value: unknown): unknown =>
    JSON.parse(
      JSON.stringify(value, (key, v: unknown) =>
        key !== "" && (v === null || (Array.isArray(v) && v.length === 0)) ? undefined : v
      )
    );

  const readProcess = () => Promise.resolve(PROCESS_DOC);

  server.registerResource(
    "process",
    "pointat://process",
    {
      title: "The Point At process",
      description: "Shared rules every agent follows.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: await readProcess() }],
    })
  );

  server.registerTool(
    "read_process",
    {
      title: "Read the process",
      description:
        "Returns the process document, the shared rules for working in the tree. Read it once before your first change.",
      annotations: { readOnlyHint: true },
    },
    async () => ({ content: [{ type: "text" as const, text: await readProcess() }] })
  );

  server.registerTool(
    "list_roots",
    {
      title: "List root goals",
      description: "The top-level goals in the tree.",
      annotations: { readOnlyHint: true },
    },
    () => run(() => store.listRoots())
  );

  server.registerTool(
    "focus_node",
    {
      title: "Focus on a node",
      description:
        "Returns a node with its root and depth, its ancestors with each split's hypothesis (why every level exists), " +
        'its siblings, the review state of its own split, the hypothesis of every earlier split, what it needs first and what waits for it, children and grandchildren, "also serves" links and recent events. ' +
        "Empty fields are left out. " +
        "Before acting, check it is still true and still needed.",
      inputSchema: { id: z.string().uuid() },
      annotations: { readOnlyHint: true },
    },
    ({ id }) => run(async () => withoutNulls(await store.focus(id)))
  );

  server.registerTool(
    "next_tasks",
    {
      title: "Find work",
      description:
        'Role views. "donor": open thinking work (nodes to split or confirm, agent leaves to run, splits to review, bounced-back human leaves to refine). ' +
        '"executor": ready, unclaimed human actions. Pick what is best for this person yourself.',
      inputSchema: {
        role: z.enum(["donor", "executor"]),
        label: z.string().optional().describe("Only nodes with this lens label."),
        query: z.string().optional().describe("Only nodes matching this text."),
        limit: z.number().int().min(1).max(100).optional(),
        kind: z
          .enum(["refine", "run", "replan", "review", "split"])
          .optional()
          .describe(
            'Donor role only: "review" splits awaiting review, "replan" rejected splits, "split" open nodes, "run" agent leaves, "refine" bounced-back human leaves.'
          ),
      },
      annotations: { readOnlyHint: true },
    },
    ({ role, label, query, limit, kind }) =>
      run(async () => withoutNulls(await store.view(role, { label, query, limit, kind })))
  );

  server.registerTool(
    "review_stats",
    {
      title: "Review timing stats",
      description:
        "How review is going, measured from the event log: splits awaiting review, work started on children before the first review, " +
        "rejected splits and the work under them, and minutes to first review. Use it to see where review is needed most.",
      inputSchema: { label: z.string().optional().describe("Only splits with this lens label.") },
      annotations: { readOnlyHint: true },
    },
    ({ label }) => run(async () => withoutNulls(await store.reviewStats({ label })))
  );

  server.registerTool(
    "search_nodes",
    {
      title: "Search nodes",
      description:
        "Full-text search across node titles, checks, actions and human instructions. Use it to avoid duplicating existing work.",
      inputSchema: { query: z.string().min(1), limit: z.number().int().min(1).max(100).optional() },
      annotations: { readOnlyHint: true },
    },
    ({ query, limit }) => run(() => store.search(query, limit))
  );

  server.registerTool(
    "create_root",
    {
      title: "Create a root goal",
      description:
        'Start a new top-level goal. Any size works, from "make a sandwich" to "achieve world peace". Search first to avoid duplicates.',
      inputSchema: { ...newNode.shape, actor: actorField },
    },
    ({ actor, ...input }) => run(() => store.createRoot(input, who(actor)))
  );

  server.registerTool(
    "split_node",
    {
      title: "Split a node",
      description:
        "Decompose a node you are focusing on into children, until each is workable. Record the hypothesis (why completing the children completes the parent), " +
        "an observable prediction, and the assumptions it rests on so others can re-check them later. Can be called again to add children when re-planning; every split's hypothesis is kept in the node's split history.",
      inputSchema: {
        id: z.string().uuid().describe("The node to split."),
        hypothesis: z.string().min(5),
        prediction: z.string().optional(),
        assumptions: z.string().optional(),
        children: z.array(newNode).min(1),
        actor: actorField,
      },
    },
    ({ id, actor, ...input }) => run(() => store.split(id, input, who(actor)))
  );

  server.registerTool(
    "adopt_roots",
    {
      title: "Adopt roots under a node",
      description:
        "When investigation shows existing root goals are part of a bigger goal, make them children of that node. " +
        "Recorded as a split with its own hypothesis (why completing the adopted goals, with any other children, completes this node), " +
        "so it goes to adversarial review like any split. Only roots can be adopted; a node that already has a parent never moves, and loops are refused. " +
        "To give credit across goals without changing the tree, use link_nodes instead.",
      inputSchema: {
        id: z.string().uuid().describe("The node that adopts the roots."),
        root_ids: z.array(z.string().uuid()).min(1).describe("The roots to place under it."),
        hypothesis: z.string().min(5),
        prediction: z.string().optional(),
        assumptions: z.string().optional(),
        actor: actorField,
      },
    },
    ({ id, root_ids, actor, ...input }) =>
      run(() => store.adopt(id, { ...input, rootIds: root_ids }, who(actor)))
  );

  server.registerTool(
    "mark_leaf",
    {
      title: "Confirm a leaf",
      description:
        'Confirm a node can be done in one turn. "agent": you can finish it in one uninterrupted run with no human input. ' +
        '"human": it needs a person\'s access or presence; give who, what and how so they never have to guess. Needs a yes/no done_check.',
      inputSchema: {
        id: z.string().uuid(),
        type: z.enum(["agent", "human"]),
        done_check: z.string().optional(),
        who: z.string().optional().describe("Human leaf: the exact recipient or target."),
        what: z.string().optional().describe("Human leaf: the exact message, document or action."),
        how: z
          .string()
          .optional()
          .describe("Human leaf: the channel, and the deadline if there is one."),
        actor: actorField,
      },
    },
    ({ id, actor, ...input }) => run(() => store.markLeaf(id, input, who(actor)))
  );

  server.registerTool(
    "update_node",
    {
      title: "Update a node",
      description:
        "Re-plan a node whose facts changed: edit its title, done check, next action or labels. Pass leaf_type: null to unmark a leaf so it can be split; this also releases any claim on it.",
      inputSchema: {
        id: z.string().uuid(),
        title: z.string().trim().min(3).max(300).optional(),
        done_check: z.string().nullable().optional(),
        next_action: z.string().nullable().optional(),
        labels: z.array(z.string()).optional(),
        leaf_type: z.null().optional(),
        actor: actorField,
      },
    },
    ({ id, actor, ...patch }) => run(() => store.update(id, patch, who(actor)))
  );

  server.registerTool(
    "claim_node",
    {
      title: "Claim a node",
      description: "Claim a node before working on it so nobody duplicates the work.",
      inputSchema: { id: z.string().uuid(), actor: actorField },
    },
    ({ id, actor }) => run(() => store.claim(id, who(actor)))
  );

  server.registerTool(
    "release_node",
    {
      title: "Release a claim",
      description: "Give a claimed node back without finishing it.",
      inputSchema: { id: z.string().uuid(), note: z.string().optional(), actor: actorField },
    },
    ({ id, note, actor }) => run(() => store.release(id, who(actor), note))
  );

  server.registerTool(
    "report",
    {
      title: "Report back",
      description:
        'Report what happened. "done" closes the node; give evidence where you can and a verification level ' +
        "(1 self-reported, 2 evidence attached, 3 tool-verified, 4 outcome observed). " +
        '"unclear" bounces a human leaf back to the agents with what is unclear. "progress" adds a note.',
      inputSchema: {
        id: z.string().uuid(),
        outcome: z.enum(["done", "unclear", "progress"]),
        note: z.string().optional(),
        evidence: z.string().optional().describe("A link, quote or description of proof."),
        verification_level: z.number().int().min(1).max(4).optional(),
        actor: actorField,
      },
    },
    ({ id, actor, ...input }) => run(() => store.report(id, input, who(actor)))
  );

  server.registerTool(
    "mark_overtaken",
    {
      title: "Mark as overtaken",
      description:
        "Close a node that reality has overtaken: already done by someone else, no longer true, or no longer needed. Say why.",
      inputSchema: { id: z.string().uuid(), note: z.string().trim().min(5), actor: actorField },
    },
    ({ id, note, actor }) => run(() => store.overtake(id, note, who(actor)))
  );

  server.registerTool(
    "review_split",
    {
      title: "Review a split",
      description:
        "Adversarial review: try to break a split before it is accepted. Look for harms, missing interests, and whether the children really add up to the parent. " +
        "You cannot review your own split.",
      inputSchema: {
        id: z.string().uuid().describe("The parent node whose split you review."),
        verdict: z.enum(["accept", "reject"]),
        reasoning: z.string().trim().min(10),
        actor: actorField,
      },
    },
    ({ id, actor, ...input }) => run(() => store.review(id, input, who(actor)))
  );

  server.registerTool(
    "link_nodes",
    {
      title: "Link related nodes",
      description:
        "Record that one node also serves another goal in a different branch. Links give credit across goals but never drive splitting.",
      inputSchema: {
        from_id: z.string().uuid(),
        to_id: z.string().uuid(),
        note: z.string().optional(),
        actor: actorField,
      },
    },
    ({ from_id, to_id, note, actor }) => run(() => store.link(from_id, to_id, note, who(actor)))
  );

  server.registerTool(
    "add_dependency",
    {
      title: "Record that a node needs another first",
      description:
        "Record that node id cannot start until needs_id is closed (done or overtaken), e.g. an outreach leaf that needs its proposal drafted. " +
        "A leaf with an open dependency is left out of next_tasks until it is ready. Loops are refused.",
      inputSchema: {
        id: z.string().uuid(),
        needs_id: z.string().uuid(),
        note: z.string().optional(),
        actor: actorField,
      },
    },
    ({ id, needs_id, note, actor }) =>
      run(() => store.addDependency({ nodeId: id, needsId: needs_id, note }, who(actor)))
  );

  return server;
}
