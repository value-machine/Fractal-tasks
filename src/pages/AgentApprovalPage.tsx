import { useLocation, useSearchParams } from "react-router-dom";
import { useAuthContext } from "@/shared/context/AuthContext";
import { AgentApprovalPanel } from "@/features/agent-login/components/AgentApprovalPanel";
import { SignInPanel } from "@/features/auth/components/SignInPanel";
import { Alert } from "@/components/common/Alert";
import { PageLoadingState } from "@/components/common/PageLoadingState";

/**
 * Agent login: Supabase sends people here (via inventhor.com/oauth/consent) when an agent tool
 * asks to act as them. Signed out, they sign in first and come back to this same page.
 */
export const AgentApprovalPage = () => {
  const { user, loading } = useAuthContext();
  const { pathname, search } = useLocation();
  const [searchParams] = useSearchParams();
  const authorizationId = searchParams.get("authorization_id") ?? "";

  if (loading) return <PageLoadingState />;
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
      <h1 className="font-heading text-3xl font-semibold">Connect your agent</h1>
      {!authorizationId ? (
        <Alert variant="destructive">
          This page opens from your agent tool. Start the connection there again.
        </Alert>
      ) : user ? (
        <AgentApprovalPanel
          authorizationId={authorizationId}
          userId={user.id}
          userLabel={user.email ?? "you"}
        />
      ) : (
        <>
          <p className="text-muted-foreground">
            Sign in first. You come back here to finish connecting your agent.
          </p>
          <SignInPanel returnPath={`${pathname}${search}`} />
        </>
      )}
    </div>
  );
};
