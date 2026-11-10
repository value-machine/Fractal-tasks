import { useState } from "react";
import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/common/Alert";
import { useAuthContext } from "@/shared/context/AuthContext";
import { EMAIL_SIGN_IN_LINK_SENT_MESSAGE } from "@/features/auth/types/authMessages";
import { formInlineAlertClassName, formStackSpacing } from "@/shared/theme/appViewLayout";
import { cn } from "@/shared/utils/cn";

interface EmailLinkFormProps {
  authDisabled?: boolean;
}

/** Passwordless sign-in: asks for an email and sends a one-time sign-in link to it. */
export const EmailLinkForm = ({ authDisabled = false }: EmailLinkFormProps) => {
  const { sendEmailSignInLink, clearAuthError } = useAuthContext();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (authDisabled || sending) {
      return;
    }
    setSending(true);
    const wasSent = await sendEmailSignInLink(email);
    setSending(false);
    setSent(wasSent);
  };

  const handleUseDifferentEmail = () => {
    setSent(false);
    clearAuthError();
  };

  if (sent) {
    return (
      <div className="w-full">
        <Alert variant="success" className={formInlineAlertClassName}>
          {EMAIL_SIGN_IN_LINK_SENT_MESSAGE}
        </Alert>
        <button
          type="button"
          onClick={handleUseDifferentEmail}
          className="text-xs text-primary hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <FormField
        label="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        autoComplete="email"
      />
      <Button
        type="submit"
        className={cn("w-full", formStackSpacing.sectionAbove)}
        disabled={sending || authDisabled}
      >
        {sending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
};
