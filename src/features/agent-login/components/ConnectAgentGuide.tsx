import { Card } from "@/components/common/Card";
import { CopyableBlock } from "@/components/common/CopyableBlock";
import { usePointAtConnectorUrl } from "@/shared/hooks/usePointAtConnectorUrl";

const STEPS: { tool: string; how: string }[] = [
  {
    tool: "Claude (web or desktop)",
    how: "Settings → Connectors → Add custom connector, paste the link, click Connect.",
  },
  {
    tool: "Claude Code",
    how: "Run: claude mcp add --transport http point-at <link>, then /mcp to log in.",
  },
  {
    tool: "Cursor and other MCP tools",
    how: "Add an HTTP MCP server with the link; the tool asks you to log in.",
  },
];

/** One link to paste into any agent tool; the tool then opens a browser to log in once. */
export const ConnectAgentGuide = () => {
  const url = usePointAtConnectorUrl();
  if (!url) return null;
  return (
    <Card hoverable={false} className="max-w-none gap-4 p-5">
      <CopyableBlock label="Your Point At link" value={url} />
      <p className="text-sm text-muted-foreground">
        Paste it into your agent tool once. It opens a browser where you sign in and click Allow;
        after that your agent works in Point At in your name.
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        {STEPS.map((step) => (
          <li key={step.tool}>
            <strong>{step.tool}:</strong> {step.how}
          </li>
        ))}
      </ul>
    </Card>
  );
};
