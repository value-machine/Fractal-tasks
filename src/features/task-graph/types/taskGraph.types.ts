import { TASK_RELATION_TYPES, type TaskRelationType } from "@/shared/types/taskRelations";

/** One task as the graph read API returns it (`GET /api/nodes/:id/graph`). */
export interface TaskGraphNode {
  id: string;
  parent_id: string | null;
  title: string;
  status: "proposed" | "reviewed" | "in_progress" | "done" | "overtaken";
  leaf_type: "agent" | "human" | null;
  duration_minutes: number | null;
  /** Levels below the graph's root (the root is 0). */
  depth: number;
}

/** A typed relation between two tasks in the graph; reads "from <type> to". */
export interface TaskGraphEdge {
  from_id: string;
  to_id: string;
  type: TaskRelationType;
  note: string | null;
}

export interface TaskGraph {
  root_id: string;
  nodes: TaskGraphNode[];
  edges: TaskGraphEdge[];
  /** True when the subtree was cut off at the server's node limit. */
  truncated: boolean;
}

/** A kind of line the view can switch on or off: the split tree, or one relation type. */
export type TaskGraphLineType = "split" | TaskRelationType;

/** Line types in the order the switches show them: the split tree first. */
export const TASK_GRAPH_LINE_TYPES: TaskGraphLineType[] = ["split", ...TASK_RELATION_TYPES];

/** Box size of one task on the canvas; the gaps in the layout keep three-line titles readable. */
export const TASK_GRAPH_NODE_WIDTH = 220;
export const TASK_GRAPH_NODE_HEIGHT = 96;

/** Where a task sits on the canvas (top-left corner of its box). */
export interface TaskGraphPosition {
  x: number;
  y: number;
}
