import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import { cn } from "@/shared/utils/cn";
import { TASK_RELATION_WORDING } from "@/shared/types/taskRelations";
import {
  TaskGraphCard,
  type TaskGraphCardNode,
} from "@/features/task-graph/components/TaskGraphCard";
import { useTaskGraphCanvas } from "@/features/task-graph/hooks/useTaskGraphCanvas";
import {
  TASK_GRAPH_LINE_TYPES,
  type TaskGraph,
  type TaskGraphLineType,
} from "@/features/task-graph/types/taskGraph.types";

/** How each line type looks: color from the theme, dashed for relations. */
const LINE_STYLE: Record<TaskGraphLineType, { color: string; dash?: string; label: string }> = {
  split: { color: "var(--color-muted-foreground)", label: "Split into" },
  blocked_by: { color: "var(--color-destructive)", dash: "6 4", label: "Blocks" },
  also_serves: {
    color: "var(--color-success)",
    dash: "6 4",
    label: TASK_RELATION_WORDING.also_serves.name,
  },
  alternative_to: {
    color: "var(--color-info)",
    dash: "2 4",
    label: TASK_RELATION_WORDING.alternative_to.name,
  },
  replaces: {
    color: "var(--color-warning)",
    dash: "6 4",
    label: TASK_RELATION_WORDING.replaces.name,
  },
  duplicate_of: {
    color: "var(--color-warning)",
    dash: "2 4",
    label: TASK_RELATION_WORDING.duplicate_of.name,
  },
  related_to: {
    color: "var(--color-primary)",
    dash: "2 4",
    label: TASK_RELATION_WORDING.related_to.name,
  },
  overtakes: {
    color: "var(--color-foreground)",
    dash: "10 4",
    label: TASK_RELATION_WORDING.overtakes.name,
  },
};

const nodeTypes: NodeTypes = { task: TaskGraphCard };

/** One switch per line type, with its color as a swatch and how many lines it has. */
const LineSwitches = ({
  counts,
  visible,
  onToggle,
}: {
  counts: Record<TaskGraphLineType, number>;
  visible: ReadonlySet<TaskGraphLineType>;
  onToggle: (type: TaskGraphLineType) => void;
}) => (
  <div role="group" aria-label="Lines to show" className="flex flex-wrap gap-2">
    {/* Only types this graph has, so the row stays short (on a phone too). */}
    {TASK_GRAPH_LINE_TYPES.filter((type) => counts[type] > 0).map((type) => {
      const on = visible.has(type);
      const style = LINE_STYLE[type];
      return (
        <button
          key={type}
          type="button"
          aria-pressed={on}
          onClick={() => onToggle(type)}
          className={cn(
            "inline-flex items-center gap-2 rounded-button border px-3 py-1.5 text-xs font-medium transition-colors",
            on ? "border-foreground bg-card text-foreground" : "border-border text-muted-foreground"
          )}
        >
          <svg aria-hidden="true" width="22" height="6" className="shrink-0">
            <line
              x1="1"
              y1="3"
              x2="21"
              y2="3"
              stroke={style.color}
              strokeWidth="2"
              strokeDasharray={style.dash}
            />
          </svg>
          {style.label}
          <span className="text-muted-foreground">{counts[type]}</span>
        </button>
      );
    })}
  </div>
);

/**
 * The tasks under one goal as boxes, with the split tree and typed relations as lines.
 * Each line type can be switched on or off; clicking a task opens its page.
 */
export const TaskGraphView = ({ graph }: { graph: TaskGraph }) => {
  const navigate = useNavigate();
  const { positions, lines, counts, visible, toggle } = useTaskGraphCanvas(graph);

  const nodes = useMemo<TaskGraphCardNode[]>(
    () =>
      graph.nodes.map((task) => ({
        id: task.id,
        type: "task",
        position: positions.get(task.id) ?? { x: 0, y: 0 },
        data: { task, isRoot: task.id === graph.root_id },
        draggable: false,
        connectable: false,
      })),
    [graph, positions]
  );

  const edges = useMemo<Edge[]>(
    () =>
      lines.map((line) => {
        const style = LINE_STYLE[line.type];
        return {
          id: line.id,
          source: line.source,
          target: line.target,
          type: line.type === "split" ? "smoothstep" : "default",
          ...(line.type === "split"
            ? {}
            : { sourceHandle: "relation-out", targetHandle: "relation-in" }),
          // Notes are kept off the canvas (they overlap boxes); the line's hover title shows them.
          ariaLabel: line.note ? `${LINE_STYLE[line.type].label}: ${line.note}` : undefined,
          style: { stroke: style.color, strokeWidth: 2, strokeDasharray: style.dash },
          markerEnd:
            line.type === "split"
              ? undefined
              : { type: MarkerType.ArrowClosed, color: style.color },
        };
      }),
    [lines]
  );

  return (
    <div className="grid gap-3">
      <LineSwitches counts={counts} visible={visible} onToggle={toggle} />
      <div className="h-[70vh] min-h-96 overflow-hidden rounded-card border bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => navigate(`/nodes/${encodeURIComponent(node.id)}`)}
          nodesConnectable={false}
          nodesDraggable={false}
          colorMode="system"
          fitView
          minZoom={0.1}
          proOptions={{ hideAttribution: false }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
};
