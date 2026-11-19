import { useCallback, useMemo, useState } from "react";
import {
  countTaskGraphLines,
  layoutTaskGraph,
  taskGraphLines,
  type TaskGraphLine,
} from "@/features/task-graph/services/taskGraphLayout";
import {
  TASK_GRAPH_LINE_TYPES,
  type TaskGraph,
  type TaskGraphLineType,
  type TaskGraphPosition,
} from "@/features/task-graph/types/taskGraph.types";

export interface TaskGraphCanvas {
  positions: Map<string, TaskGraphPosition>;
  lines: TaskGraphLine[];
  counts: Record<TaskGraphLineType, number>;
  visible: ReadonlySet<TaskGraphLineType>;
  toggle: (type: TaskGraphLineType) => void;
}

/**
 * What the graph canvas draws: task positions (fixed by the split tree), the lines of the
 * switched-on types, and a count per type. Every type starts switched on.
 */
export const useTaskGraphCanvas = (graph: TaskGraph): TaskGraphCanvas => {
  const [visible, setVisible] = useState<ReadonlySet<TaskGraphLineType>>(
    () => new Set(TASK_GRAPH_LINE_TYPES)
  );
  const positions = useMemo(() => layoutTaskGraph(graph), [graph]);
  const counts = useMemo(() => countTaskGraphLines(graph), [graph]);
  const lines = useMemo(() => taskGraphLines(graph, visible), [graph, visible]);
  const toggle = useCallback(
    (type: TaskGraphLineType) =>
      setVisible((current) => {
        const next = new Set(current);
        if (next.has(type)) next.delete(type);
        else next.add(type);
        return next;
      }),
    []
  );
  return { positions, lines, counts, visible, toggle };
};
