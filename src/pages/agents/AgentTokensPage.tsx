import { useAuthContext } from "@/shared/context/AuthContext";
import { ConnectAgentGuide } from "@/features/agent-login/components/ConnectAgentGuide";
import { AgentTokensPanel } from "@/features/agent-tokens/components/AgentTokensPanel";
import { SignInPanel } from "@/features/auth/components/SignInPanel";
import { PageLoadingState } from "@/components/common/PageLoadingState";

/** "Connect your agent": one link with agent login; personal tokens only as a fallback. */
export const AgentTokensPage = () => {
  const { user, loading } = useAuthContext();
  if (loading) return <PageLoadingState />;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="mb-1.5 font-heading text-3xl font-semibold">Connect your agent</h1>
        <p className="text-muted-foreground">
          Let your AI agent split goals, review and do agent steps in Point At. Everything it does
          is recorded in your name.
        </p>
      </div>
      <ConnectAgentGuide />
      <details className="rounded-card border bg-card p-5">
        <summary className="cursor-pointer font-medium">
          Your tool cannot log in? Use a personal token instead
        </summary>
        <div className="mt-4">
          {user ? <AgentTokensPanel userId={user.id} /> : <SignInPanel returnPath="/agents" />}
        </div>
      </details>
    </div>
  );
};
