import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/shared/utils/cn";
import {
  TASK_GRAPH_NODE_HEIGHT,
  TASK_GRAPH_NODE_WIDTH,
  type TaskGraphNode,
} from "@/features/task-graph/types/taskGraph.types";

export type TaskGraphCardNode = Node<{ task: TaskGraphNode; isRoot: boolean }, "task">;

const STATUS_TEXT: Record<TaskGraphNode["status"], string> = {
  proposed: "Proposed",
  reviewed: "Reviewed",
  in_progress: "In progress",
  done: "Done",
  overtaken: "Overtaken",
};

const STATUS_BAR: Record<TaskGraphNode["status"], string> = {
  proposed: "bg-muted-foreground",
  reviewed: "bg-info",
  in_progress: "bg-warning",
  done: "bg-success",
  overtaken: "bg-muted-foreground/40",
};

const kindOf = (task: TaskGraphNode): string | null => {
  if (task.leaf_type === "human") return "Human action";
  if (task.leaf_type === "agent") return "Agent task";
  return null;
};

/** One task on the canvas: title (three lines at most), status and leaf kind. */
export const TaskGraphCard = ({ data }: NodeProps<TaskGraphCardNode>) => {
  const { task, isRoot } = data;
  const closed = task.status === "done" || task.status === "overtaken";
  const kind = kindOf(task);
  return (
    <div
      style={{ width: TASK_GRAPH_NODE_WIDTH, height: TASK_GRAPH_NODE_HEIGHT }}
      className={cn(
        "flex cursor-pointer flex-col overflow-hidden rounded-card border bg-card text-card-foreground elevation-sm transition-colors hover:border-primary",
        isRoot && "border-primary"
      )}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      {/* Relations run side to side, so lines between siblings do not loop under the boxes. */}
      <Handle id="relation-in" type="target" position={Position.Left} className="!opacity-0" />
      <Handle id="relation-out" type="source" position={Position.Right} className="!opacity-0" />
      <span aria-hidden="true" className={cn("h-1 w-full shrink-0", STATUS_BAR[task.status])} />
      <div className="flex min-h-0 flex-1 flex-col gap-1 px-3 py-2">
        <p
          title={task.title}
          className={cn(
            "line-clamp-3 text-xs leading-snug font-semibold",
            closed && "text-muted-foreground",
            task.status === "overtaken" && "line-through"
          )}
        >
          {task.title}
        </p>
        <p className="mt-auto text-[0.6875rem] text-muted-foreground">
          {STATUS_TEXT[task.status]}
          {kind && ` · ${kind}`}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
};
