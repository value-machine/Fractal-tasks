import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { useAuthContext } from "@/shared/context/AuthContext";
import { HarnessOverviewCard } from "@/features/harness-overview/components/HarnessOverviewCard";
import { SignInPanel } from "@/features/auth/components/SignInPanel";
import { useAuthCallbackHandler } from "@/features/auth/hooks/useAuthCallbackHandler";
import { PageLoadingState } from "@/components/common/PageLoadingState";
import { appScrollContentClassName, formContentWidthClassName } from "@/shared/theme/appViewLayout";
import { cn } from "@/shared/utils/cn";

export const HomePage = () => {
  const { user, loading, error, clearAuthError } = useAuthContext();
  const { isProcessing } = useAuthCallbackHandler();

  if (loading || isProcessing) {
    return <PageLoadingState message="Signing in…" />;
  }

  const showInlineLogin = !user;

  return (
    <div className={cn(appScrollContentClassName, "text-center")}>
      <HarnessOverviewCard />

      {error && (
        <Alert
          variant="destructive"
          className={cn(formContentWidthClassName, "mb-2 sm:mb-3")}
          action={
            <Button variant="ghost" size="sm" className="-my-1.5 h-8" onClick={clearAuthError}>
              Dismiss
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {user ? (
        <div className="flex flex-1 items-center justify-center">
          <p>Welcome back, {user.email}!</p>
        </div>
      ) : showInlineLogin ? (
        <SignInPanel />
      ) : null}
    </div>
  );
};
