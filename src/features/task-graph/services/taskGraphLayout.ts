import { hierarchy, tree } from "d3-hierarchy";
import {
  TASK_GRAPH_LINE_TYPES,
  TASK_GRAPH_NODE_HEIGHT,
  TASK_GRAPH_NODE_WIDTH,
  type TaskGraph,
  type TaskGraphEdge,
  type TaskGraphLineType,
  type TaskGraphNode,
  type TaskGraphPosition,
} from "@/features/task-graph/types/taskGraph.types";

const COLUMN_GAP = 40;
const ROW_GAP = 70;

interface TreeDatum {
  node: TaskGraphNode;
  children: TreeDatum[];
}

/** The split-from tree under the graph's root; nodes whose parent is missing hang off the root. */
const buildTree = (graph: TaskGraph): TreeDatum => {
  const data = new Map<string, TreeDatum>(
    graph.nodes.map((node) => [node.id, { node, children: [] }])
  );
  const root = data.get(graph.root_id);
  if (!root) throw new Error("The graph does not contain its root task.");
  for (const datum of data.values()) {
    if (datum === root) continue;
    const parent = (datum.node.parent_id && data.get(datum.node.parent_id)) || root;
    parent.children.push(datum);
  }
  return root;
};

/**
 * Top-down tree layout of the split-from tree (tidy tree, d3-hierarchy). Relations are drawn
 * on top of it, so tasks keep their place whichever line types are switched on.
 */
export const layoutTaskGraph = (graph: TaskGraph): Map<string, TaskGraphPosition> => {
  const root = hierarchy(buildTree(graph), (d) => d.children);
  tree<TreeDatum>().nodeSize([
    TASK_GRAPH_NODE_WIDTH + COLUMN_GAP,
    TASK_GRAPH_NODE_HEIGHT + ROW_GAP,
  ])(root);
  const positions = new Map<string, TaskGraphPosition>();
  root.each((point) => {
    positions.set(point.data.node.id, {
      x: (point.x ?? 0) - TASK_GRAPH_NODE_WIDTH / 2,
      y: point.y ?? 0,
    });
  });
  return positions;
};

/** A line to draw: from `source` to `target`, of one line type. */
export interface TaskGraphLine {
  id: string;
  source: string;
  target: string;
  type: TaskGraphLineType;
  note: string | null;
}

/**
 * The lines to draw for the switched-on types. Split lines run parent to child. A blocked_by
 * relation is drawn from the blocking task to the blocked one, so arrows follow the order of
 * work; other relations run from the task that is the subject to the other.
 */
export const taskGraphLines = (
  graph: TaskGraph,
  visible: ReadonlySet<TaskGraphLineType>
): TaskGraphLine[] => {
  const ids = new Set(graph.nodes.map((n) => n.id));
  const lines: TaskGraphLine[] = [];
  if (visible.has("split")) {
    for (const node of graph.nodes) {
      if (node.parent_id && ids.has(node.parent_id) && node.id !== graph.root_id) {
        lines.push({
          id: `split-${node.id}`,
          source: node.parent_id,
          target: node.id,
          type: "split",
          note: null,
        });
      }
    }
  }
  const relationLine = (edge: TaskGraphEdge): TaskGraphLine => {
    const reversed = edge.type === "blocked_by";
    return {
      id: `${edge.type}-${edge.from_id}-${edge.to_id}`,
      source: reversed ? edge.to_id : edge.from_id,
      target: reversed ? edge.from_id : edge.to_id,
      type: edge.type,
      note: edge.note,
    };
  };
  return lines.concat(graph.edges.filter((edge) => visible.has(edge.type)).map(relationLine));
};

/** How many lines each type has in the graph, for the switches. */
export const countTaskGraphLines = (graph: TaskGraph): Record<TaskGraphLineType, number> => {
  const counts = Object.fromEntries(TASK_GRAPH_LINE_TYPES.map((t) => [t, 0])) as Record<
    TaskGraphLineType,
    number
  >;
  counts.split = taskGraphLines(graph, new Set(["split"])).length;
  for (const edge of graph.edges) counts[edge.type] += 1;
  return counts;
};
