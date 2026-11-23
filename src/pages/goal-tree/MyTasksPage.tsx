import { useAuthContext } from "@/shared/context/AuthContext";
import { PageLoadingState } from "@/components/common/PageLoadingState";
import { SignInPanel } from "@/features/auth/components/SignInPanel";
import { GoalQueryState } from "@/features/goal-tree/components/GoalQueryState";
import { GoalRow } from "@/features/goal-tree/components/GoalRow";
import { GoalTreeShell } from "@/features/goal-tree/components/GoalTreeNav";
import { useMyTasks } from "@/features/goal-tree/hooks/useGoalTreeQueries";
import type { GoalNodeSummary } from "@/features/goal-tree/types/goalTree.types";

const Section = ({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: GoalNodeSummary[];
}) => (
  <section className="mb-7">
    <h2 className="mb-3 font-heading text-xl font-semibold">{title}</h2>
    {items.length === 0 ? (
      <p className="rounded-card border-2 border-dashed p-5 text-muted-foreground">{empty}</p>
    ) : (
      <div className="grid gap-2.5">
        {items.map((item) => (
          <GoalRow key={item.id} item={item} />
        ))}
      </div>
    )}
  </section>
);

/** The signed-in person's own list (/me): private goals and the tasks they claimed. */
export const MyTasksPage = () => {
  const { user, loading } = useAuthContext();
  const tasks = useMyTasks(user?.id ?? null);
  if (loading) return <PageLoadingState />;

  return (
    <GoalTreeShell>
      <section className="mb-5">
        <h1 className="mb-1.5 font-heading text-3xl font-semibold">My tasks</h1>
        <p className="max-w-[70ch] text-muted-foreground">
          Your private goals, which only you and your agents see, and the tasks you claimed. Ask
          your agent to create a private goal, for example "make a private goal: battle my own
          loneliness".
        </p>
      </section>
      {user ? (
        <GoalQueryState query={tasks}>
          {(data) => (
            <>
              <Section
                title="Private goals"
                empty="No private goals yet."
                items={data.private_goals}
              />
              <Section title="Claimed by you" empty="Nothing claimed." items={data.claimed} />
            </>
          )}
        </GoalQueryState>
      ) : (
        <SignInPanel returnPath="/me" />
      )}
    </GoalTreeShell>
  );
};
