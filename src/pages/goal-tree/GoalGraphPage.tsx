import { Link, useParams } from "react-router-dom";
import { Alert } from "@/components/common/Alert";
import { GoalQueryState } from "@/features/goal-tree/components/GoalQueryState";
import { GoalTreeShell } from "@/features/goal-tree/components/GoalTreeNav";
import { TaskGraphView } from "@/features/task-graph/components/TaskGraphView";
import { useTaskGraph } from "@/features/task-graph/hooks/useTaskGraph";

/** Graph view of one goal and everything split from it (/nodes/:id/graph). */
export const GoalGraphPage = () => {
  const { id = "" } = useParams();
  const graph = useTaskGraph(id);
  const root = graph.data?.nodes.find((n) => n.id === id);

  return (
    <GoalTreeShell>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="max-w-[60ch] font-heading text-2xl font-semibold">
          {root ? root.title : "Graph"}
        </h1>
        <Link
          to={`/nodes/${encodeURIComponent(id)}`}
          className="text-sm text-primary no-underline hover:underline"
        >
          Back to the goal
        </Link>
      </div>
      <GoalQueryState query={graph}>
        {(data) => (
          <>
            {data.truncated && (
              <Alert variant="info" className="mb-3">
                This goal has more tasks than one graph shows. Open a task lower in the tree to see
                its part in full.
              </Alert>
            )}
            <TaskGraphView graph={data} />
          </>
        )}
      </GoalQueryState>
    </GoalTreeShell>
  );
};
