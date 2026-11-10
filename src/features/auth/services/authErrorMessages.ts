import type { AuthError } from "@/shared/services/supabaseService";
import { getErrorMessage } from "@/shared/utils/errorUtils";
import { GENERIC_AUTH_ERROR_MESSAGE } from "@/features/auth/types/authMessages";

// Supabase's built-in mailer only delivers to the project's team addresses until custom SMTP is set up.
const EMAIL_NOT_AUTHORIZED_MESSAGES = ["email address not authorized"];

const EMAIL_RATE_LIMIT_MESSAGES = ["email rate limit", "over_email_send_rate_limit"];

const RATE_LIMIT_MESSAGES = ["rate limit", "too many requests", "over_request_rate_limit"];

const NETWORK_MESSAGES = ["failed to fetch", "network", "networkerror", "connection", "timeout"];

const containsAny = (message: string, fragments: string[]): boolean =>
  fragments.some((fragment) => message.includes(fragment));

const getErrorCode = (error: unknown): string | undefined => {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as AuthError).code;
    return typeof code === "string" ? code.toLowerCase() : undefined;
  }
  return undefined;
};

/**
 * Maps Supabase and client auth errors to safe English user-facing strings.
 */
export const mapAuthError = (error: unknown): string => {
  const message = getErrorMessage(error).toLowerCase();
  const code = getErrorCode(error);

  if (
    code === "email_address_not_authorized" ||
    containsAny(message, EMAIL_NOT_AUTHORIZED_MESSAGES)
  ) {
    return "Sign-in emails can't be sent to this address yet. Continue with GitHub or Google.";
  }

  if (code === "over_email_send_rate_limit" || containsAny(message, EMAIL_RATE_LIMIT_MESSAGES)) {
    return "Too many sign-in emails were sent. Please wait up to an hour, or continue with GitHub or Google.";
  }

  if (code === "over_request_rate_limit" || containsAny(message, RATE_LIMIT_MESSAGES)) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  if (containsAny(message, NETWORK_MESSAGES)) {
    return "Network error. Please check your connection and try again.";
  }

  if (message.includes("supabase") && message.includes("configured")) {
    return "Authentication requires Supabase to be configured.";
  }

  const originalMessage = getErrorMessage(error);
  if (originalMessage) {
    return originalMessage;
  }

  return GENERIC_AUTH_ERROR_MESSAGE;
};
