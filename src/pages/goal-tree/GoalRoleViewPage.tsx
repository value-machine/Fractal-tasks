import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Input } from "@/components/common/Input";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { GOAL_DURATION_OPTIONS, GOAL_ROLE_COPY } from "@/features/goal-tree/types/goalTreeLabels";
import { GoalQueryState } from "@/features/goal-tree/components/GoalQueryState";
import { GoalRow } from "@/features/goal-tree/components/GoalRow";
import { GoalTreeShell } from "@/features/goal-tree/components/GoalTreeNav";
import { useGoalRoleView } from "@/features/goal-tree/hooks/useGoalTreeQueries";
import type {
  GoalDuration,
  GoalRole,
  GoalWorkFilters,
} from "@/features/goal-tree/types/goalTree.types";

const isGoalRole = (value: string | undefined): value is GoalRole =>
  value === "donor" || value === "executor";

type DurationChoice = GoalDuration | "any";
type CostChoice = "any" | "free";

/** The shorter buckets are enough to filter on; "a day" and longer stay under "Any time". */
const DURATION_CHOICES: { value: DurationChoice; label: string }[] = [
  { value: "any", label: "Any time" },
  ...GOAL_DURATION_OPTIONS.filter((o) => o.minutes <= 240).map((o) => ({
    value: o.value,
    label: `≤ ${o.label.toLowerCase()}`,
  })),
];

const COST_CHOICES: { value: CostChoice; label: string }[] = [
  { value: "any", label: "Any cost" },
  { value: "free", label: "No money needed" },
];

/** The "needs" text box applies on Enter or when it loses focus, like the site search. */
const RequirementInput = ({
  value,
  onApply,
}: {
  value: string;
  onApply: (next: string) => void;
}) => {
  const [draft, setDraft] = useState(value);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft.trim());
      }}
    >
      <Input
        type="search"
        aria-label="Needs a skill, place or language"
        placeholder="Needs… e.g. Dutch, Utrecht"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onApply(draft.trim())}
      />
    </form>
  );
};

/** Narrow the list by what the work takes: time, money, and a needed skill, place or language. */
const GoalWorkFilterBar = ({
  filters,
  onChange,
}: {
  filters: GoalWorkFilters;
  onChange: (next: GoalWorkFilters) => void;
}) => (
  <div className="mb-5 grid gap-3 sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:items-center">
    <SegmentedControl<DurationChoice>
      options={DURATION_CHOICES}
      value={filters.maxDuration ?? "any"}
      onValueChange={(value) =>
        onChange({ ...filters, maxDuration: value === "any" ? undefined : value })
      }
    />
    <SegmentedControl<CostChoice>
      options={COST_CHOICES}
      value={filters.maxCost === 0 ? "free" : "any"}
      onValueChange={(value) => onChange({ ...filters, maxCost: value === "free" ? 0 : undefined })}
    />
    <RequirementInput
      value={filters.requirement ?? ""}
      onApply={(next) => onChange({ ...filters, requirement: next || undefined })}
    />
  </div>
);

const GoalRoleViewContent = ({ role }: { role: GoalRole }) => {
  const [filters, setFilters] = useState<GoalWorkFilters>({});
  const rows = useGoalRoleView(role, filters);
  const copy = GOAL_ROLE_COPY[role];
  const filtered = Object.values(filters).some((value) => value !== undefined);

  return (
    <GoalTreeShell>
      <section className="mb-5">
        <h1 className="mb-1.5 font-heading text-3xl font-semibold">{copy.title}</h1>
        <p className="max-w-[70ch] text-muted-foreground">{copy.description}</p>
      </section>
      <GoalWorkFilterBar filters={filters} onChange={setFilters} />
      <GoalQueryState query={rows}>
        {(items) =>
          items.length === 0 ? (
            <div className="rounded-card border-2 border-dashed p-5 text-muted-foreground">
              {filtered
                ? "Nothing matches these filters. Steps without a time estimate are left out when you filter on time."
                : "Nothing waiting here right now."}
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
