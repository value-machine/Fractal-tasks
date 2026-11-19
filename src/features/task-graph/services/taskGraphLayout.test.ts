import { describe, expect, it } from "vitest";
import { layoutTaskGraph, taskGraphLines } from "@/features/task-graph/services/taskGraphLayout";
import {
  TASK_GRAPH_NODE_HEIGHT,
  type TaskGraph,
  type TaskGraphNode,
} from "@/features/task-graph/types/taskGraph.types";

const node = (id: string, parent_id: string | null, depth: number): TaskGraphNode => ({
  id,
  parent_id,
  title: id,
  status: "proposed",
  leaf_type: null,
  duration_minutes: null,
  depth,
});

/** root -> a, b; a -> a1. b is blocked by a; a also serves an outside goal (not in the graph). */
const graph: TaskGraph = {
  root_id: "root",
  nodes: [node("root", null, 0), node("a", "root", 1), node("b", "root", 1), node("a1", "a", 2)],
  edges: [{ from_id: "b", to_id: "a", type: "blocked_by", note: "needs the draft" }],
  truncated: false,
};

describe("layoutTaskGraph", () => {
  it("should place each level below the previous one when laying out the split tree", () => {
    const positions = layoutTaskGraph(graph);
    const y = (id: string) => positions.get(id)?.y ?? NaN;
    expect(y("a")).toBe(y("b"));
    expect(y("a") - y("root")).toBeGreaterThan(TASK_GRAPH_NODE_HEIGHT);
    expect(y("a1") - y("a")).toBe(y("a") - y("root"));
  });

  it("should keep siblings apart when they share a level", () => {
    const positions = layoutTaskGraph(graph);
    expect(positions.get("a")?.x).not.toBe(positions.get("b")?.x);
  });

  it("should hang a task under the root when its parent is not in the graph", () => {
    const cut: TaskGraph = { ...graph, nodes: [...graph.nodes, node("orphan", "missing", 3)] };
    const positions = layoutTaskGraph(cut);
    expect(positions.get("orphan")?.y).toBe(positions.get("a")?.y);
  });
});

describe("taskGraphLines", () => {
  it("should draw only the split tree when only split lines are switched on", () => {
    const lines = taskGraphLines(graph, new Set(["split"]));
    expect(lines.map((l) => [l.source, l.target])).toEqual([
      ["root", "a"],
      ["root", "b"],
      ["a", "a1"],
    ]);
  });

  it("should draw a blocked_by line from the blocking task to the blocked one", () => {
    const lines = taskGraphLines(graph, new Set(["blocked_by"]));
    expect(lines).toEqual([
      {
        id: "blocked_by-b-a",
        source: "a",
        target: "b",
        type: "blocked_by",
        note: "needs the draft",
      },
    ]);
  });

  it("should draw nothing when no line type is switched on", () => {
    expect(taskGraphLines(graph, new Set())).toEqual([]);
  });
});
