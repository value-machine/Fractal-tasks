import { useState, type FormEvent } from "react";
import { Alert } from "@/components/common/Alert";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { formatRelativeTime } from "@/shared/utils/formatRelativeTime";
import { NewTokenReveal } from "./NewTokenReveal";
import {
  useAgentTokens,
  useCreateAgentToken,
  useRevokeAgentToken,
} from "@/features/agent-tokens/hooks/useAgentTokens";
import type { AgentToken } from "@/features/agent-tokens/types/agentToken.types";

const errorText = (error: unknown): string | null =>
  error ? (error instanceof Error ? error.message : "Something went wrong.") : null;

const TokenRow = ({
  token,
  onRevoke,
  revoking,
}: {
  token: AgentToken;
  onRevoke: (id: string) => void;
  revoking: boolean;
}) => (
  <li className="flex flex-wrap items-center gap-3 py-3">
    <div className="min-w-0 flex-1">
      <div className="font-medium">{token.name}</div>
      <div className="text-sm text-muted-foreground">
        <code>{token.token_prefix}…</code> · created {formatRelativeTime(token.created_at)} ·{" "}
        {token.last_used_at ? `last used ${formatRelativeTime(token.last_used_at)}` : "never used"}
      </div>
    </div>
    {token.revoked_at ? (
      <Badge variant="outline">Revoked</Badge>
    ) : (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={revoking}
        onClick={() => onRevoke(token.id)}
      >
        Revoke
      </Button>
    )}
  </li>
);

/** Create, show once, list and revoke the signed-in person's agent tokens. */
export const AgentTokensPanel = ({ userId }: { userId: string }) => {
  const tokens = useAgentTokens(userId);
  const create = useCreateAgentToken(userId);
  const revoke = useRevokeAgentToken(userId);
  const [name, setName] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(name.trim(), { onSuccess: () => setName("") });
  };

  const error = errorText(tokens.error) ?? errorText(create.error) ?? errorText(revoke.error);

  return (
    <div className="flex flex-col gap-6">
      <Card hoverable={false} className="max-w-none p-5">
        {create.data ? (
          <NewTokenReveal
            name={create.data.record.name}
            token={create.data.token}
            onDone={() => create.reset()}
          />
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">
              Name this agent
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="For example: Claude Code on my laptop"
                maxLength={80}
              />
            </label>
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              Create token
            </Button>
          </form>
        )}
      </Card>

      {error && <Alert variant="destructive">{error}</Alert>}

      <section aria-label="Your agent tokens">
        <h2 className="mb-1 font-heading text-xl font-semibold">Your tokens</h2>
        {tokens.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tokens.data?.length ? (
          <ul className="divide-y">
            {tokens.data.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                revoking={revoke.isPending}
                onRevoke={(id) => revoke.mutate(id)}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No tokens yet.</p>
        )}
      </section>
    </div>
  );
};
