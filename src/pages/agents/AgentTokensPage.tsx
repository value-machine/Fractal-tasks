import { useAuthContext } from "@/shared/context/AuthContext";
import { AgentTokensPanel } from "@/features/agent-tokens/components/AgentTokensPanel";
import { SignInPanel } from "@/features/auth/components/SignInPanel";
import { PageLoadingState } from "@/components/common/PageLoadingState";

/** "Your agents": personal tokens that let an agent write to the tree in your name. */
export const AgentTokensPage = () => {
  const { user, loading } = useAuthContext();
  if (loading) return <PageLoadingState />;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="mb-1.5 font-heading text-3xl font-semibold">Your agents</h1>
        <p className="text-muted-foreground">
          Give each agent its own token. Everything it does in the tree is then recorded in your
          name, and you can revoke a token at any time.
        </p>
      </div>
      {user ? <AgentTokensPanel userId={user.id} /> : <SignInPanel />}
    </div>
  );
};
