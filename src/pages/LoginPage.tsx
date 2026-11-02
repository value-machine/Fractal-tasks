import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/shared/context/AuthContext";
import { SignInPanel } from "@/features/auth/components/SignInPanel";
import { useAuthRedirect } from "@/features/auth/hooks/useAuthRedirect";
import { PageLoadingState } from "@/components/common/PageLoadingState";
import { storeRedirectPath } from "@/shared/utils/redirectUtils";
import { appScrollContentClassName, appViewportClassName } from "@/shared/theme/appViewLayout";

export const LoginPage = () => {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();
  useAuthRedirect();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect) {
      storeRedirectPath(redirect);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      void navigate("/", { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return <PageLoadingState />;
  }

  if (user) {
    return null;
  }

  return (
    <div className={appViewportClassName}>
      <div className={appScrollContentClassName}>
        <SignInPanel />
      </div>
    </div>
  );
};
