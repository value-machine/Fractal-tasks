import { Link } from "react-router-dom";
import { formatRelativeTime } from "@/shared/utils/formatRelativeTime";
import type { GoalEvent, GoalRelation } from "@/features/goal-tree/types/goalTree.types";
import {
  describeGoalEvent,
  describeGoalRelation,
  GOAL_STATUS_LABELS,
} from "@/features/goal-tree/types/goalTreeLabels";

const panelClassName = "rounded-card border bg-card p-4";
const panelTitleClassName =
  "mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase";

export const GoalEventLog = ({ events }: { events: GoalEvent[] }) => (
  <section className={panelClassName}>
    <h2 className={panelTitleClassName}>History</h2>
    {events.length === 0 ? (
      <p className="text-sm text-muted-foreground">Nothing yet.</p>
    ) : (
      <ol className="m-0 grid list-none gap-3 p-0">
        {events.map((event) => (
          <li key={event.id} className="grid gap-0.5 border-l-2 pl-3.5 text-sm">
            <span>
              <span className="font-medium">{event.actor}</span> ·{" "}
              {describeGoalEvent(event.type, event.verdict)}
            </span>
            {event.body && <span className="text-muted-foreground">{event.body}</span>}
            {event.evidence && (
              <span className="text-muted-foreground">Evidence: {event.evidence}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(event.created_at)}
            </span>
          </li>
        ))}
      </ol>
    )}
  </section>
);

/** Typed relations to other goals (blocked by, also serves, ...); nothing when there are none. */
export const GoalRelationList = ({ relations }: { relations: GoalRelation[] }) => {
  if (relations.length === 0) return null;
  return (
    <section className={panelClassName}>
      <h2 className={panelTitleClassName}>Related goals</h2>
      <ul className="m-0 grid list-none gap-2 p-0 text-sm">
        {relations.map((relation) => (
          <li key={`${relation.type}-${relation.direction}-${relation.id}`}>
            <small className="block text-muted-foreground">
              {describeGoalRelation(relation)} · {GOAL_STATUS_LABELS[relation.status]}
            </small>
            <Link
              to={`/nodes/${encodeURIComponent(relation.id)}`}
              className="font-medium text-primary no-underline hover:underline"
            >
              {relation.title}
            </Link>
            {relation.note && (
              <small className="block text-muted-foreground">{relation.note}</small>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
