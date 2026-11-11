import {
  getSupabase,
  isSupabaseConfigured,
  type SupabaseAuth,
} from "@/shared/services/supabaseService";
import { queryClient } from "@/shared/utils/queryClient";
import { getAppUrl } from "@/shared/utils/appOrigin";
import type { OAuthProvider } from "@/features/auth/types/auth.types";
import { mapAuthError } from "./authErrorMessages";
import { validateEmail } from "./authValidation";

type AuthResult = { error: Error | null };

interface RunAuthOptions {
  /** When Supabase is not configured: fail with a configuration error (default) or no-op. */
  requireConfig?: boolean;
}

/**
 * Runs one Supabase auth call with the shared guards: configuration check,
 * provider error mapping, and thrown-error mapping.
 */
const runAuth = async (
  call: (auth: SupabaseAuth) => Promise<{ error: unknown }>,
  { requireConfig = true }: RunAuthOptions = {}
): Promise<AuthResult> => {
  if (!isSupabaseConfigured()) {
    return {
      error: requireConfig ? new Error("Authentication requires Supabase to be configured.") : null,
    };
  }

  try {
    const { error } = await call(getSupabase().auth);
    return { error: error ? new Error(mapAuthError(error)) : null };
  } catch (error) {
    return { error: new Error(mapAuthError(error)) };
  }
};

export const logout = (): Promise<AuthResult> =>
  runAuth(
    (auth) => {
      queryClient.clear();
      return auth.signOut();
    },
    { requireConfig: false }
  );

/**
 * Every sign-in returns to `<origin>/`, where the PKCE `?code=` is exchanged. The address ends with
 * "/" so allow-list patterns like `https://host/**` match it (a bare origin does not match them, and
 * Supabase then sends the user to the Site URL).
 */
const signInReturnUrl = (returnPath = "/"): string => getAppUrl(returnPath);

/**
 * Starts an OAuth redirect to the given provider (Google, GitHub). `returnPath` is the in-app page
 * to come back to (default the home page), for sign-ins started from a page such as agent approval.
 */
export const signInWithOAuthProvider = (
  provider: OAuthProvider,
  returnPath?: string
): Promise<AuthResult> =>
  runAuth((auth) =>
    auth.signInWithOAuth({ provider, options: { redirectTo: signInReturnUrl(returnPath) } })
  );

/**
 * Emails a one-time sign-in link (no password). New addresses get an account on first use, so
 * sign-in and sign-up are the same step. The link returns through the same PKCE path as OAuth.
 */
export const sendEmailSignInLink = (email: string, returnPath?: string): Promise<AuthResult> => {
  const emailError = validateEmail(email);
  if (emailError) {
    return Promise.resolve({ error: new Error(emailError) });
  }
  return runAuth((auth) =>
    auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: signInReturnUrl(returnPath), shouldCreateUser: true },
    })
  );
};

/**
 * True when a signed-in (non-anonymous) session exists. Reading the session waits for the client's
 * initialization, which includes the library's own exchange of a `?code=` found in the URL, so this
 * tells the callback whether that exchange already succeeded.
 */
export const hasSignedInSession = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }
  try {
    const { data } = await getSupabase().auth.getSession();
    return Boolean(data.session && !data.session.user.is_anonymous);
  } catch {
    return false;
  }
};

/** Exchange authorization code for session (PKCE return from OAuth and email sign-in links) */
export const exchangeCodeForSession = (code: string): Promise<AuthResult> =>
  runAuth((auth) => auth.exchangeCodeForSession(code));
