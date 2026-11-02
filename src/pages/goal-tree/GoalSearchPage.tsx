import { useSearchParams } from "react-router-dom";
import { GoalQueryState } from "@/features/goal-tree/components/GoalQueryState";
import { GoalRow } from "@/features/goal-tree/components/GoalRow";
import { GoalTreeShell } from "@/features/goal-tree/components/GoalTreeNav";
import { useGoalSearch } from "@/features/goal-tree/hooks/useGoalTreeQueries";

/** Search results (/search?q=). */
export const GoalSearchPage = () => {
  const [params] = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const results = useGoalSearch(query);

  return (
    <GoalTreeShell key={query} initialQuery={query}>
      <section className="mb-5">
        <h1 className="mb-1.5 font-heading text-3xl font-semibold">Search</h1>
        {query && results.data && (
          <p className="text-muted-foreground">
            {results.data.length} result{results.data.length === 1 ? "" : "s"} for “{query}”
          </p>
        )}
      </section>
      {query ? (
        <GoalQueryState query={results}>
          {(items) =>
            items.length === 0 ? (
              <div className="rounded-card border-2 border-dashed p-5 text-muted-foreground">
                No tasks match.
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
      ) : (
        <p className="text-muted-foreground">Type something in the search box above.</p>
      )}
    </GoalTreeShell>
  );
};
