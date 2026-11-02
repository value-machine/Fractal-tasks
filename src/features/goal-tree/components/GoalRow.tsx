import { Link } from "react-router-dom";
import type { GoalRoleViewItem } from "@/features/goal-tree/types/goalTree.types";
import { GoalLeafPill, GoalStatusDot } from "@/features/goal-tree/components/GoalPills";

const rowSubtitle = (item: GoalRoleViewItem): string => {
  if (item.leaf_type === "human" && item.leaf_who) {
    return `For: ${item.leaf_who}${item.leaf_how ? ` · ${item.leaf_how}` : ""}`;
  }
  return item.done_check ?? "";
};

/** One line in a role view or search result list. */
export const GoalRow = ({ item }: { item: GoalRoleViewItem }) => {
  const subtitle = rowSubtitle(item);
  return (
    <Link
      to={`/nodes/${encodeURIComponent(item.id)}`}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3.5 rounded-card border bg-card px-4 py-3.5 no-underline transition-colors hover:border-primary"
    >
      <GoalStatusDot status={item.status} />
      <div className="min-w-0">
        <h3 className="text-[0.9375rem] leading-snug font-semibold">{item.title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {item.why && <span className="text-xs font-semibold text-primary">{item.why}</span>}
        <GoalLeafPill leafType={item.leaf_type} />
      </div>
    </Link>
  );
};
