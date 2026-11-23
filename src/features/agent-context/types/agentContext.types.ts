/** What an agent receives when it connects (`GET /api/agent-context`). */
export interface AgentConnectContext {
  instructions: string;
  tools: { name: string; title: string | null; description: string; read_only: boolean }[];
  process_doc: string;
}

interface PayloadTask {
  id: string;
  title: string;
}

/**
 * What `focus_node` returns to an agent for one task (`GET /api/nodes/:id/agent-view`), with
 * empty fields left out exactly as the agent gets them. Only the fields this view reads are
 * typed; the raw payload is shown in full.
 */
export interface AgentFocusPayload {
  node: PayloadTask & { parent_id?: string };
  root?: PayloadTask;
  ancestors?: PayloadTask[];
  siblings?: PayloadTask[];
  children?: (PayloadTask & { children?: PayloadTask[] })[];
  relations?: (PayloadTask & { type: string; direction: "out" | "in" })[];
  hints?: string[];
  [field: string]: unknown;
}

/** The tasks an agent's focus payload mentions, and where to draw them. */
export interface AgentContextScope {
  /** The tree the focused task belongs to; the graph is drawn from here. */
  rootId: string;
  /** Every task the payload names: the focus, ancestors, siblings, children, grandchildren, relations. */
  inContext: Set<string>;
  /** Related tasks that are named in the payload but sit in another tree. */
  elsewhere: PayloadTask[];
}
