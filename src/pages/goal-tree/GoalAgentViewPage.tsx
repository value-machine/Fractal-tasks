import { Link, useParams } from "react-router-dom";
import { AgentFocusPayloadView } from "@/features/agent-context/components/AgentFocusPayloadView";
import { useAgentFocusPayload } from "@/features/agent-context/hooks/useAgentContext";
import { useAgentContextScope } from "@/features/agent-context/hooks/useAgentContextScope";
import { GoalQueryState } from "@/features/goal-tree/components/GoalQueryState";
import { GoalTreeShell } from "@/features/goal-tree/components/GoalTreeNav";
import { TaskGraphView } from "@/features/task-graph/components/TaskGraphView";
import { useTaskGraph } from "@/features/task-graph/hooks/useTaskGraph";

/**
 * What an agent sees when it focuses one task (/nodes/:id/agent-view): the goal's graph with
 * the tasks in the agent's context highlighted, the hints it gets, and the exact payload.
 */
export const GoalAgentViewPage = () => {
  const { id = "" } = useParams();
  const payload = useAgentFocusPayload(id);
  const rootId = payload.data ? (payload.data.root?.id ?? payload.data.node.id) : "";
  const graph = useTaskGraph(rootId);
  const scope = useAgentContextScope(payload.data, graph.data?.nodes);

  return (
    <GoalTreeShell>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">What an agent sees when it focuses</p>
          <h1 className="max-w-[60ch] font-heading text-2xl font-semibold">
            {payload.data?.node.title ?? "…"}
          </h1>
        </div>
        <span className="flex gap-4 text-sm">
          <Link to="/agents/context" className="text-primary no-underline hover:underline">
            What every agent gets on connect
          </Link>
          <Link
            to={`/nodes/${encodeURIComponent(id)}`}
            className="text-primary no-underline hover:underline"
          >
            Back to the task
          </Link>
        </span>
      </div>
      <GoalQueryState query={payload}>
        {(data) => (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div>
              <p className="mb-3 text-sm text-muted-foreground">
                Highlighted tasks are in the agent's context; faded ones are not. The ringed task is
                the one it focuses.
              </p>
              <GoalQueryState query={graph}>
                {(tree) => (
                  <TaskGraphView graph={tree} highlight={scope?.inContext} focusId={data.node.id} />
                )}
              </GoalQueryState>
            </div>
            <AgentFocusPayloadView payload={data} elsewhere={scope?.elsewhere ?? []} />
          </div>
        )}
      </GoalQueryState>
    </GoalTreeShell>
  );
};
