import { useState } from "react";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/common/SegmentedControl";
import { useAuthContext } from "@/shared/context/AuthContext";
import { useAuthRedirect } from "@/features/auth/hooks/useAuthRedirect";
import { PASSWORD_RESET_SENT_MESSAGE } from "@/features/auth/types/authMessages";
import { useEmailAuthValidation } from "@/features/auth/hooks/useEmailAuthValidation";
import type { LoginCredentials, SignUpCredentials } from "@/features/auth/types/auth.types";
import { formInlineAlertClassName, formStackSpacing } from "@/shared/theme/appViewLayout";
import { cn } from "@/shared/utils/cn";

type EmailAuthMode = "sign-in" | "sign-up" | "forgot-password";

const MODE_OPTIONS: SegmentedControlOption<EmailAuthMode>[] = [
  { value: "sign-in", label: "Sign in" },
  { value: "sign-up", label: "Sign up" },
];

const textLinkClassName = "text-xs text-primary hover:underline";

interface EmailAuthFormProps {
  authDisabled?: boolean;
}

export const EmailAuthForm = ({ authDisabled = false }: EmailAuthFormProps) => {
  const { login, signUp, requestPasswordReset, loading, clearAuthError } = useAuthContext();
  const { validateEmailField, validatePasswordField } = useEmailAuthValidation();
  const resetRedirect = useAuthRedirect();
  const [mode, setMode] = useState<EmailAuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isForgotMode = mode === "forgot-password";
  const displayError = validationError;

  const handleModeChange = (newMode: EmailAuthMode) => {
    setMode(newMode);
    setValidationError(null);
    setSuccessMessage(null);
    clearAuthError();
  };

  const handleForgotPassword = () => {
    setMode("forgot-password");
    setValidationError(null);
    setSuccessMessage(null);
    clearAuthError();
  };

  const handleBackToSignIn = () => {
    setMode("sign-in");
    setValidationError(null);
    setSuccessMessage(null);
    clearAuthError();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (authDisabled) {
      return;
    }
    setValidationError(null);
    setSuccessMessage(null);
    clearAuthError();

    const emailError = validateEmailField(email);
    if (emailError) {
      setValidationError(emailError);
      return;
    }

    if (isForgotMode) {
      const sent = await requestPasswordReset(email);
      if (sent) {
        setSuccessMessage(PASSWORD_RESET_SENT_MESSAGE);
      }
      return;
    }

    const passwordError = validatePasswordField(password);
    if (passwordError) {
      setValidationError(passwordError);
      return;
    }

    resetRedirect();

    if (mode === "sign-up") {
      const credentials: SignUpCredentials = { email: email.trim(), password };
      await signUp(credentials);
      return;
    }

    const credentials: LoginCredentials = { email: email.trim(), password };
    await login(credentials);
  };

  const submitLabel = (() => {
    if (loading) return "Please wait…";
    if (isForgotMode) return "Send reset link";
    if (mode === "sign-up") return "Create account";
    return "Sign in with email";
  })();

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {!isForgotMode && (
        <SegmentedControl
          options={MODE_OPTIONS}
          value={mode}
          onValueChange={handleModeChange}
          className={formStackSpacing.sectionBelow}
        />
      )}

      {displayError && (
        <Alert variant="destructive" className={formInlineAlertClassName}>
          {displayError}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className={formInlineAlertClassName}>
          {successMessage}
        </Alert>
      )}

      <FormField
        label="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        autoComplete="email"
        containerClassName="mt-2"
      />

      {!isForgotMode && (
        <FormField
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          containerClassName="mt-3"
        />
      )}

      {mode === "sign-in" && (
        <div className="mt-1 text-right">
          <button type="button" onClick={handleForgotPassword} className={textLinkClassName}>
            Forgot password?
          </button>
        </div>
      )}

      {isForgotMode && (
        <div className="mt-1">
          <button type="button" onClick={handleBackToSignIn} className={textLinkClassName}>
            Back to sign in
          </button>
        </div>
      )}

      <Button
        type="submit"
        className={cn("w-full", formStackSpacing.sectionAbove)}
        disabled={loading || authDisabled}
      >
        {submitLabel}
      </Button>

      {mode === "sign-up" && (
        <p className="mt-2 text-xs leading-snug text-muted-foreground">
          By creating an account you agree to our terms of service.
        </p>
      )}
    </form>
  );
};
