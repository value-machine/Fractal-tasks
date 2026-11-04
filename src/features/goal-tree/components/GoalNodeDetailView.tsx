import type { ReactNode } from "react";
import type { GoalNodeDetail } from "@/features/goal-tree/types/goalTree.types";
import { isGoalClosed } from "@/features/goal-tree/types/goalTreeLabels";
import { Link } from "react-router-dom";
import type { GoalAncestor } from "@/features/goal-tree/types/goalTree.types";
import { GoalNodeFrame } from "@/features/goal-tree/components/GoalNodeFrame";
import { GoalEventLog, GoalLinkList } from "@/features/goal-tree/components/GoalSidePanels";
import { GoalTile } from "@/features/goal-tree/components/GoalTile";

const crumbClassName =
  "max-w-64 truncate rounded-sm px-2 py-0.5 text-muted-foreground no-underline hover:bg-accent hover:text-foreground";

/** Path from "All goals" through the ancestors to the focused goal's parent. */
const GoalBreadcrumbs = ({ ancestors }: { ancestors: GoalAncestor[] }) => (
  <nav aria-label="Where this sits" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
    <Link to="/" className={crumbClassName}>
      All goals
    </Link>
    {ancestors.map((ancestor) => (
      <span key={ancestor.id} className="flex min-w-0 items-center gap-1.5">
        <span aria-hidden="true" className="text-muted-foreground/60">
          /
        </span>
        <Link
          to={`/nodes/${encodeURIComponent(ancestor.id)}`}
          title={ancestor.title}
          className={crumbClassName}
        >
          {ancestor.title}
        </Link>
      </span>
    ))}
  </nav>
);

const EmptyNote = ({ children }: { children: ReactNode }) => (
  <div className="mt-6 rounded-card border-2 border-dashed p-5 text-muted-foreground">
    {children}
  </div>
);

const SubtaskSection = ({ detail }: { detail: GoalNodeDetail }) => {
  const { node, children } = detail;
  if (children.length > 0) {
    return (
      <>
        <div className="mt-7 mb-3 flex items-baseline justify-between">
          <h2 className="font-heading text-xl font-semibold">Subtasks</h2>
          <span className="text-sm text-muted-foreground">
            {node.done_child_count} of {node.child_count} closed
          </span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4">
          {children.map((child) => (
            <GoalTile key={child.id} node={child} />
          ))}
        </div>
      </>
    );
  }
  if (node.leaf_type) {
    return (
      <EmptyNote>
        This is a <b>{node.leaf_type === "agent" ? "agent leaf" : "human action"}</b>: it can be
        done in one turn, so it is not split further.
      </EmptyNote>
    );
  }
  if (isGoalClosed(node.status)) return null;
  return (
    <EmptyNote>
      <b>Not split yet.</b> Tasks appear here when someone focuses on this goal. Point your agent at
      it to decide: can it be done in one turn, or should it be split?
    </EmptyNote>
  );
};

/** Focus page body: breadcrumbs, the goal, its subtask tiles, links and history. */
export const GoalNodeDetailView = ({ detail }: { detail: GoalNodeDetail }) => (
  <>
    <GoalBreadcrumbs ancestors={detail.ancestors} />
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <GoalNodeFrame node={detail.node} />
        <SubtaskSection detail={detail} />
      </div>
      <aside className="grid gap-4">
        <GoalLinkList links={detail.links} />
        <GoalEventLog events={detail.events} />
      </aside>
    </div>
  </>
);
