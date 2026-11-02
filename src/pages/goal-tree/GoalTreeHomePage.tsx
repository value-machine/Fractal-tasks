import { AgentHint } from "@/features/goal-tree/components/AgentHint";
import { GoalQueryState } from "@/features/goal-tree/components/GoalQueryState";
import { GoalTile } from "@/features/goal-tree/components/GoalTile";
import { GoalTreeShell } from "@/features/goal-tree/components/GoalTreeNav";
import { useGoalRoots } from "@/features/goal-tree/hooks/useGoalTreeQueries";

/** Home: every root goal as a zoomable tile. */
export const GoalTreeHomePage = () => {
  const roots = useGoalRoots();

  return (
    <GoalTreeShell>
      <section className="mb-6">
        <h1 className="mb-2 max-w-[22ch] font-heading text-4xl leading-tight font-semibold">
          Point your agent at something that matters.
        </h1>
        <p className="max-w-[62ch] text-muted-foreground">
          Every goal here is split, only when someone focuses on it, until it reaches a step an
          agent or a person can do in one turn. Click a goal to zoom in.
        </p>
      </section>
      <GoalQueryState query={roots}>
        {(data) =>
          data.length === 0 ? (
            <div className="rounded-card border-2 border-dashed p-5 text-muted-foreground">
              <b>No goals yet.</b> Ask your agent to create one with <code>create_root</code>.
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-heading text-xl font-semibold">Goals</h2>
                <span className="text-sm text-muted-foreground">
                  {data.length} root{data.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4">
                {data.map((root) => (
                  <GoalTile key={root.id} node={root} />
                ))}
              </div>
            </>
          )
        }
      </GoalQueryState>
      <div className="mt-8">
        <AgentHint />
      </div>
    </GoalTreeShell>
  );
};
