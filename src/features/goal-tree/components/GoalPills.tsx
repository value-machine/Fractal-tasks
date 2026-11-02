import { Badge } from "@/components/common/Badge";
import { cn } from "@/shared/utils/cn";
import type { GoalNode, GoalStatus } from "@/features/goal-tree/types/goalTree.types";
import { GOAL_STATUS_LABELS } from "@/features/goal-tree/types/goalTreeLabels";

const STATUS_DOT_CLASS: Record<GoalStatus, string> = {
  proposed: "bg-muted-foreground",
  reviewed: "bg-info",
  in_progress: "bg-warning",
  done: "bg-success",
  overtaken: "bg-muted-foreground/40",
};

/** Small colored dot for a status (decorative; the label carries the meaning). */
export const GoalStatusDot = ({
  status,
  className,
}: {
  status: GoalStatus;
  className?: string;
}) => (
  <span
    aria-hidden="true"
    className={cn("inline-block size-2 shrink-0 rounded-full", STATUS_DOT_CLASS[status], className)}
  />
);

export const GoalStatusPill = ({ status }: { status: GoalStatus }) => (
  <Badge variant="outline" className="gap-1.5">
    <GoalStatusDot status={status} />
    {GOAL_STATUS_LABELS[status]}
  </Badge>
);

/** "Agent leaf" / "Human action" pill; renders nothing for nodes that are not leaves. */
export const GoalLeafPill = ({ leafType }: { leafType: GoalNode["leaf_type"] }) => {
  if (leafType === "agent") {
    return (
      <Badge variant="primary" title="Can be done by an agent in one uninterrupted run">
        Agent leaf
      </Badge>
    );
  }
  if (leafType === "human") {
    return (
      <Badge
        variant="outline"
        className="border-warning text-warning"
        title="Needs a person to act"
      >
        Human action
      </Badge>
    );
  }
  return null;
};

export const GoalLabelPills = ({ labels }: { labels: string[] }) => (
  <>
    {labels.map((label) => (
      <Badge key={label} variant="outline" className="font-normal">
        {label}
      </Badge>
    ))}
  </>
);

/** Closed/total children as a thin bar plus a count; nothing when there are no children. */
export const GoalProgress = ({ closed, total }: { closed: number; total: number }) => {
  if (total === 0) return null;
  const percent = Math.round((closed / total) * 100);
  return (
    <span className="inline-flex items-center gap-2">
      <span
        role="img"
        aria-label={`${closed} of ${total} subtasks closed`}
        className="h-1 w-20 overflow-hidden rounded-full bg-muted"
      >
        <span className="block h-full bg-success" style={{ width: `${percent}%` }} />
      </span>
      <span>
        {closed}/{total}
      </span>
    </span>
  );
};
