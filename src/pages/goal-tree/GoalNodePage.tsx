import { useParams } from "react-router-dom";
import { GoalNodeDetailView } from "@/features/goal-tree/components/GoalNodeDetailView";
import { GoalQueryState } from "@/features/goal-tree/components/GoalQueryState";
import { GoalTreeShell } from "@/features/goal-tree/components/GoalTreeNav";
import { useGoalNode } from "@/features/goal-tree/hooks/useGoalTreeQueries";

/** Focus page for one goal (/nodes/:id). */
export const GoalNodePage = () => {
  const { id = "" } = useParams();
  const node = useGoalNode(id);

  return (
    <GoalTreeShell>
      <GoalQueryState query={node}>
        {(detail) => <GoalNodeDetailView detail={detail} />}
      </GoalQueryState>
    </GoalTreeShell>
  );
};
