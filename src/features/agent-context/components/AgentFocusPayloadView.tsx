import { Link } from "react-router-dom";
import { CopyableBlock } from "@/components/common/CopyableBlock";
import type { AgentFocusPayload } from "@/features/agent-context/types/agentContext.types";

const panelClassName = "rounded-card border bg-card p-4";
const panelTitleClassName =
  "mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase";

/**
 * What an agent receives when it focuses this task: the planning hints first (what the system
 * tells it to watch), related tasks outside the drawn tree, then the full payload as JSON.
 */
export const AgentFocusPayloadView = ({
  payload,
  elsewhere,
}: {
  payload: AgentFocusPayload;
  elsewhere: { id: string; title: string }[];
}) => (
  <div className="grid gap-4">
    <section className={panelClassName}>
      <h2 className={panelTitleClassName}>Hints the agent gets</h2>
      {payload.hints?.length ? (
        <ul className="m-0 grid list-disc gap-1.5 pl-5 text-sm">
          {payload.hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No planning hints for this task.</p>
      )}
    </section>
    {elsewhere.length > 0 && (
      <section className={panelClassName}>
        <h2 className={panelTitleClassName}>Also in its context, from other goals</h2>
        <ul className="m-0 grid list-none gap-1.5 p-0 text-sm">
          {elsewhere.map((task) => (
            <li key={task.id}>
              <Link
                to={`/nodes/${encodeURIComponent(task.id)}/agent-view`}
                className="text-primary no-underline hover:underline"
              >
                {task.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    )}
    <CopyableBlock
      label="Exactly what focus_node returns"
      value={JSON.stringify(payload, null, 2)}
    />
  </div>
);
