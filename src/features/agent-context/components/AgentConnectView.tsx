import { Badge } from "@/components/common/Badge";
import type { AgentConnectContext } from "@/features/agent-context/types/agentContext.types";

const panelClassName = "rounded-card border bg-card p-4 sm:p-5";
const panelTitleClassName =
  "mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase";

/**
 * What every agent receives when it connects, in the order it meets it: the instructions, the
 * tools with their descriptions, and the process document it is told to read first.
 */
export const AgentConnectView = ({ context }: { context: AgentConnectContext }) => (
  <div className="grid gap-4">
    <section className={panelClassName}>
      <h2 className={panelTitleClassName}>1. Instructions, sent on connect</h2>
      <p className="text-sm whitespace-pre-wrap">{context.instructions}</p>
    </section>

    <section className={panelClassName}>
      <h2 className={panelTitleClassName}>2. Tools ({context.tools.length})</h2>
      <ul className="m-0 grid list-none gap-3 p-0">
        {context.tools.map((tool) => (
          <li key={tool.name} className="grid gap-1 border-l-2 pl-3 text-sm">
            <span className="flex flex-wrap items-center gap-2">
              <code className="font-semibold">{tool.name}</code>
              {tool.title && <span className="text-muted-foreground">{tool.title}</span>}
              <Badge variant="outline">{tool.read_only ? "reads" : "writes"}</Badge>
            </span>
            <span className="text-muted-foreground">{tool.description}</span>
          </li>
        ))}
      </ul>
    </section>

    <section className={panelClassName}>
      <details>
        <summary className="cursor-pointer text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          3. Process document, read first through read_process (
          {Math.round(context.process_doc.length / 1000)}k characters)
        </summary>
        <pre className="mt-3 max-h-[60vh] overflow-auto text-xs whitespace-pre-wrap">
          {context.process_doc}
        </pre>
      </details>
    </section>
  </div>
);
