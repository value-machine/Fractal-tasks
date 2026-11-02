import { Navigate, useParams } from "react-router-dom";
import { GOAL_ROLE_COPY } from "@/features/goal-tree/types/goalTreeLabels";
import { GoalQueryState } from "@/features/goal-tree/components/GoalQueryState";
import { GoalRow } from "@/features/goal-tree/components/GoalRow";
import { GoalTreeShell } from "@/features/goal-tree/components/GoalTreeNav";
import { useGoalRoleView } from "@/features/goal-tree/hooks/useGoalTreeQueries";
import type { GoalRole } from "@/features/goal-tree/types/goalTree.types";

const isGoalRole = (value: string | undefined): value is GoalRole =>
  value === "donor" || value === "executor";

const GoalRoleViewContent = ({ role }: { role: GoalRole }) => {
  const rows = useGoalRoleView(role);
  const copy = GOAL_ROLE_COPY[role];

  return (
    <GoalTreeShell>
      <section className="mb-5">
        <h1 className="mb-1.5 font-heading text-3xl font-semibold">{copy.title}</h1>
        <p className="max-w-[70ch] text-muted-foreground">{copy.description}</p>
      </section>
      <GoalQueryState query={rows}>
        {(items) =>
          items.length === 0 ? (
            <div className="rounded-card border-2 border-dashed p-5 text-muted-foreground">
              Nothing waiting here right now.
            </div>
          ) : (
            <div className="grid gap-2.5">
              {items.map((item) => (
                <GoalRow key={item.id} item={item} />
              ))}
            </div>
          )
        }
      </GoalQueryState>
    </GoalTreeShell>
  );
};

/** Role view (/views/:role): thinking work for donors, actions for executors. */
export const GoalRoleViewPage = () => {
  const { role } = useParams();
  return isGoalRole(role) ? <GoalRoleViewContent role={role} /> : <Navigate to="/" replace />;
};
