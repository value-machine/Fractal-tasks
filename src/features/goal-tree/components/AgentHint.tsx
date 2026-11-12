import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/common/Card";
import { usePointAtConnectorUrl } from "@/shared/hooks/usePointAtConnectorUrl";

/** Explains that agents change the tree, and shows the link they connect with. */
export const AgentHint = () => {
  const mcpUrl = usePointAtConnectorUrl();
  return (
    <Card hoverable={false} className="max-w-none gap-1 py-4">
      <CardContent className="flex flex-col gap-1">
        <CardTitle>Point your agent here</CardTitle>
        <CardDescription>
          Agents create and split goals. Add this link as a connector in your agent tool and log in
          once (<Link to="/agents">how to connect</Link>){mcpUrl ? ":" : "."}
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
