import { Link } from "react-router-dom";
import { formatRelativeTime } from "@/shared/utils/formatRelativeTime";
import type { GoalEvent, GoalNodeDetail } from "@/features/goal-tree/types/goalTree.types";
import { describeGoalEvent } from "@/features/goal-tree/types/goalTreeLabels";

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

/** "Also serves" / "Served by" links to other goals; nothing when there are none. */
export const GoalLinkList = ({ links }: { links: GoalNodeDetail["links"] }) => {
  const entries = [
    ...links.also_serves.map((link) => ({ ...link, direction: "Also serves" })),
    ...links.served_by.map((link) => ({ ...link, direction: "Served by" })),
  ];
  if (entries.length === 0) return null;
  return (
    <section className={panelClassName}>
      <h2 className={panelTitleClassName}>Connected goals</h2>
      <ul className="m-0 grid list-none gap-2 p-0 text-sm">
        {entries.map((entry) => (
          <li key={`${entry.direction}-${entry.id}`}>
            <small className="block text-muted-foreground">{entry.direction}</small>
            <Link
              to={`/nodes/${encodeURIComponent(entry.id)}`}
              className="font-medium text-primary no-underline hover:underline"
            >
              {entry.title}
            </Link>
            {entry.note && <small className="block text-muted-foreground">{entry.note}</small>}
          </li>
        ))}
      </ul>
    </section>
  );
};
