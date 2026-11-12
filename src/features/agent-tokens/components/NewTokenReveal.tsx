import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { CopyableBlock } from "@/components/common/CopyableBlock";
import { useMcpClientSnippets } from "@/features/agent-tokens/hooks/useMcpClientSnippets";

interface NewTokenRevealProps {
  name: string;
  token: string;
  onDone: () => void;
}

/** The one moment a token is visible: the secret plus ready-to-paste agent settings. */
export const NewTokenReveal = ({ name, token, onDone }: NewTokenRevealProps) => {
  const snippets = useMcpClientSnippets(token);
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="warning">
        Copy this now: the token for “{name}” is shown only once. Treat it like a password.
      </Alert>
      <CopyableBlock label="Token" value={token} />
      {snippets && (
        <>
          <CopyableBlock label="Claude Code: run this in a terminal" value={snippets.claudeCode} />
          <CopyableBlock label="Other agents (Cursor, .mcp.json)" value={snippets.json} />
        </>
      )}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          I have saved it
        </Button>
      </div>
    </div>
  );
};
