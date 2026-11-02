import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { PageLoadingState } from "@/components/common/PageLoadingState";
import { useAuthContext } from "@/shared/context/AuthContext";
import { getSupabase, isSupabaseConfigured } from "@/shared/services/supabaseService";
import { validatePasswordConfirmation } from "@/features/auth/services/authValidation";
import {
  appScrollContentClassName,
  appViewportClassName,
  centeredFormSurfaceClassName,
} from "@/shared/theme/appViewLayout";

/** Viewport + scroll column + centered form surface shared by every state of this page. */
const ResetPasswordLayout = ({ children }: { children: ReactNode }) => (
  <div className={appViewportClassName}>
    <div className={appScrollContentClassName}>
      <div className={centeredFormSurfaceClassName}>{children}</div>
    </div>
  </div>
);

export const ResetPasswordPage = () => {
  const { updatePassword, loading, error, clearAuthError } = useAuthContext();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setCheckingRecovery(false);
      return;
    }

    const supabase = getSupabase();
    const hashParams = new URLSearchParams(
      window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
    );
    const isRecoveryHash = hashParams.get("type") === "recovery";

    if (isRecoveryHash) {
      setRecoveryReady(true);
      setCheckingRecovery(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
        setCheckingRecovery(false);
      }
    });

    const timeoutId = window.setTimeout(() => {
      setCheckingRecovery(false);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);
    clearAuthError();

    const passwordError = validatePasswordConfirmation(password, confirmPassword);
    if (passwordError) {
      setValidationError(passwordError);
      return;
    }

    const updated = await updatePassword(password);
    if (updated) {
      setSuccessMessage("Your password has been updated. You can now sign in.");
      window.setTimeout(() => {
        void navigate("/login", { replace: true });
      }, 2000);
    }
  };

  if (checkingRecovery) {
    return <PageLoadingState message="Loading…" />;
  }

  if (!isSupabaseConfigured()) {
    return (
      <ResetPasswordLayout>
        <Alert variant="info">
          Authentication requires Supabase configuration before you can reset your password.
        </Alert>
      </ResetPasswordLayout>
    );
  }

  if (!recoveryReady) {
    return (
      <ResetPasswordLayout>
        <Alert variant="warning">
          This password reset link is invalid or has expired. Request a new link from the sign-in
          page.
        </Alert>
        <Button className="mt-4" onClick={() => void navigate("/login")}>
          Go to sign in
        </Button>
      </ResetPasswordLayout>
    );
  }

  return (
    <ResetPasswordLayout>
      <h1 className="mb-3 text-3xl">Reset password</h1>

      {(validationError || error) && (
        <Alert variant="destructive" className="mb-4">
          {validationError || error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="mb-4">
          {successMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField
          label="New password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="new-password"
        />
        <FormField
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          autoComplete="new-password"
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Please wait…" : "Update password"}
        </Button>
      </form>
    </ResetPasswordLayout>
  );
};
