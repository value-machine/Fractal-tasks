import { AgentConnectView } from "@/features/agent-context/components/AgentConnectView";
import { useAgentConnectContext } from "@/features/agent-context/hooks/useAgentContext";
import { GoalQueryState } from "@/features/goal-tree/components/GoalQueryState";
import { GoalTreeShell } from "@/features/goal-tree/components/GoalTreeNav";

/** What every agent receives when it connects (/agents/context), read from the live server. */
export const AgentConnectContextPage = () => {
  const context = useAgentConnectContext();
  return (
    <GoalTreeShell>
      <section className="mb-5">
        <h1 className="mb-1.5 font-heading text-3xl font-semibold">What agents get on connect</h1>
        <p className="max-w-[70ch] text-muted-foreground">
          Read from a live Point At agent server, so this is exactly what an agent receives. When it
          then focuses a task it also gets that task's context: open "What an agent sees" on any
          task.
        </p>
      </section>
      <GoalQueryState query={context}>
        {(data) => <AgentConnectView context={data} />}
      </GoalQueryState>
    </GoalTreeShell>
  );
};
