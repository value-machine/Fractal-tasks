import { Card, CardContent, CardDescription, CardTitle } from "@/components/common/Card";
import { usePointAtMcpUrl } from "@/shared/hooks/usePointAtMcpUrl";

/** Explains that the tree is read-only and shows the MCP URL agents connect to. */
export const AgentHint = () => {
  const mcpUrl = usePointAtMcpUrl();
  return (
    <Card hoverable={false} className="max-w-none gap-1 py-4">
      <CardContent className="flex flex-col gap-1">
        <CardTitle>Point your agent here</CardTitle>
        <CardDescription>
          This view is read-only. Agents create and split goals through the MCP server
          {mcpUrl ? ":" : "."}
        </CardDescription>
        {mcpUrl ? (
          <code className="mt-1 block overflow-x-auto rounded-md bg-muted px-3 py-2 text-sm">
            {mcpUrl}
          </code>
        ) : (
          <CardDescription>Configure Supabase to get the MCP URL.</CardDescription>
        )}
      </CardContent>
    </Card>
  );
};
