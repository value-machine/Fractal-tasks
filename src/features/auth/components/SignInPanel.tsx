import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Separator } from "@/components/common/Separator";
import { useAuthContext } from "@/shared/context/AuthContext";
import { useAuthBackendConfigured } from "@/shared/hooks/useAuthBackendConfigured";
import {
  formContentWidthClassName,
  formInlineAlertClassName,
  formStackSpacing,
} from "@/shared/theme/appViewLayout";
import { cn } from "@/shared/utils/cn";
import { PRIVACY_URL, TERMS_URL } from "@/config/legal";
import { GoogleIcon } from "./GoogleIcon";
import { EmailAuthForm } from "./EmailAuthForm";

const SUPABASE_CONFIG_MESSAGE =
  "Authentication requires Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in your environment.";

const footerLinkClassName = "text-foreground hover:text-primary";

export const SignInPanel = () => {
  const { signInWithGoogle, loading, error } = useAuthContext();
  const { isConfigured: authBackendConfigured } = useAuthBackendConfigured();
  const authDisabled = !authBackendConfigured;

  return (
    <div className={cn(formContentWidthClassName, "shrink-0")}>
      {authDisabled && (
        <Alert variant="info" className={cn(formInlineAlertClassName, "text-xs sm:text-sm")}>
          {SUPABASE_CONFIG_MESSAGE}
        </Alert>
      )}

      <Button
        variant="outline"
        className={cn("w-full", formStackSpacing.sectionBelow)}
        onClick={() => void signInWithGoogle()}
        disabled={loading || authDisabled}
      >
        <GoogleIcon />
        Sign in with Google
      </Button>

      {error && (
        <Alert variant="destructive" className={formInlineAlertClassName}>
          {error}
        </Alert>
      )}

      <div className={cn("flex items-center gap-4", formStackSpacing.divider)}>
        <Separator className="flex-1" />
        <span className="text-sm text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <EmailAuthForm authDisabled={authDisabled} />

      <p className={cn("text-center text-xs text-muted-foreground", formStackSpacing.sectionAbove)}>
        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={footerLinkClassName}
        >
          Privacy
        </a>
        {" · "}
        <a
          href={TERMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={footerLinkClassName}
        >
          Terms
        </a>
      </p>
    </div>
  );
};
