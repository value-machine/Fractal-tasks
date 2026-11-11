import { useEffect } from "react";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { PageLoadingState } from "@/components/common/PageLoadingState";
import {
  useAgentApproval,
  useDecideAgentApproval,
} from "@/features/agent-login/hooks/useAgentApproval";

interface AgentApprovalPanelProps {
  authorizationId: string;
  userId: string;
  userLabel: string;
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : "Something went wrong.";

/** "Allow <agent tool> to work in Point At as you?" with Allow and Cancel. */
export const AgentApprovalPanel = ({
  authorizationId,
  userId,
  userLabel,
}: AgentApprovalPanelProps) => {
  const request = useAgentApproval(authorizationId, userId);
  const decide = useDecideAgentApproval(authorizationId);

  const redirectUrl = request.data?.kind === "redirect" ? request.data.url : null;
  useEffect(() => {
    if (redirectUrl) window.location.assign(redirectUrl);
  }, [redirectUrl]);

  if (request.isPending || redirectUrl) return <PageLoadingState />;
  if (request.error) {
    return (
      <Alert variant="destructive">
        {messageOf(request.error)} Start the connection again from your agent tool.
      </Alert>
    );
  }
  if (request.data.kind !== "ask") return null;
  const { clientName } = request.data;

  return (
    <Card hoverable={false} className="max-w-none gap-4 p-6">
      <h2 className="font-heading text-2xl font-semibold">Connect {clientName}?</h2>
      <p className="text-muted-foreground">
        {clientName} will work in Point At as{" "}
        <strong className="text-foreground">{userLabel}</strong>: it can read the tree and make
        changes, and everything it does is recorded in your name.
      </p>
      {decide.error && <Alert variant="destructive">{messageOf(decide.error)}</Alert>}
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={decide.isPending} onClick={() => decide.mutate(true)}>
          Allow
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={decide.isPending}
          onClick={() => decide.mutate(false)}
        >
          Cancel
        </Button>
      </div>
    </Card>
  );
};
