import { Link } from "react-router-dom";
import { Card } from "@/components/common/Card";
import { cn } from "@/shared/utils/cn";
import type {
  GoalNodeSummary,
  GoalNodeWithChildren,
} from "@/features/goal-tree/types/goalTree.types";
import { isGoalClosed } from "@/features/goal-tree/types/goalTreeLabels";
import {
  GoalLeafPill,
  GoalProgress,
  GoalStatusDot,
  GoalStatusPill,
} from "@/features/goal-tree/components/GoalPills";

/** How many child chips a tile shows before collapsing the rest into "+N more". */
const NEST_LIMIT = 6;

const NestedChild = ({ child }: { child: GoalNodeSummary }) => (
  <li
    title={child.title}
    className="flex min-w-0 items-center gap-1.5 rounded-sm bg-card px-2 py-1 text-xs text-muted-foreground"
  >
    <GoalStatusDot status={child.status} className="size-1.5" />
    <span className="truncate">{child.title}</span>
    {child.child_count > 0 && <span className="ml-auto shrink-0">{child.child_count}</span>}
  </li>
);

/**
 * A goal as a tile: title, up to two levels (the goal and its children), status, leaf kind and
 * progress. The whole tile links to the goal's focus page.
 */
export const GoalTile = ({ node }: { node: GoalNodeWithChildren | GoalNodeSummary }) => {
  const children = "children" in node ? node.children : [];
  const closed = isGoalClosed(node.status);
  const notSplit = node.child_count === 0 && !node.leaf_type && !closed;

  return (
    <Link to={`/nodes/${encodeURIComponent(node.id)}`} className="block no-underline">
      <Card className="max-w-none gap-3 px-4 py-4">
        <div className="flex items-start gap-2.5">
          <GoalStatusDot status={node.status} className="mt-2" />
          <h3
            title={node.title}
            className={cn(
              "line-clamp-3 flex-1 text-base leading-snug font-semibold",
              node.status === "overtaken" && "text-muted-foreground line-through"
            )}
          >
            {node.title}
          </h3>
        </div>

        {children.length > 0 && (
          <ul
            aria-label="Subtasks"
            className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-1.5 rounded-md bg-muted p-2"
          >
            {children.slice(0, NEST_LIMIT).map((child) => (
              <NestedChild key={child.id} child={child} />
            ))}
            {children.length > NEST_LIMIT && (
              <li className="self-center px-1 text-xs text-muted-foreground">
                +{children.length - NEST_LIMIT} more
              </li>
            )}
          </ul>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {node.status !== "proposed" && <GoalStatusPill status={node.status} />}
          <GoalLeafPill leafType={node.leaf_type} />
          <GoalProgress closed={node.done_child_count} total={node.child_count} />
          {notSplit && <span>Not split yet</span>}
          {node.claimed_by && <span>Claimed by {node.claimed_by}</span>}
        </div>
      </Card>
    </Link>
  );
};
