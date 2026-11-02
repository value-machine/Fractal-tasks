import {
  getSupabase,
  isSupabaseConfigured,
  type SupabaseAuth,
  type SupabaseUser,
} from "@/shared/services/supabaseService";
import { queryClient } from "@/shared/utils/queryClient";
import { getAppUrl } from "@/shared/utils/appOrigin";
import type { User, LoginCredentials, SignUpCredentials } from "@/features/auth/types/auth.types";
import { mapProviderUserToAppUser } from "@/shared/utils/userUtils";
import { DUPLICATE_SIGNUP_MESSAGE, mapAuthError } from "./authErrorMessages";

type AuthResult = { error: Error | null };
type AuthUserResult = { user: User | null; error: Error | null };

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

/** `runAuth` for calls that return a user; `user` is null whenever `error` is set. */
const runAuthForUser = async (
  call: (auth: SupabaseAuth) => Promise<{ data: { user: SupabaseUser | null }; error: unknown }>,
  validate?: (user: SupabaseUser | null) => Error | null
): Promise<AuthUserResult> => {
  let providerUser: SupabaseUser | null = null;
  const { error } = await runAuth(async (auth) => {
    const result = await call(auth);
    providerUser = result.data.user;
    return result;
  });
  const validationError = error ?? validate?.(providerUser) ?? null;
  return validationError
    ? { user: null, error: validationError }
    : { user: mapProviderUserToAppUser(providerUser), error: null };
};

export const login = (credentials: LoginCredentials): Promise<AuthUserResult> =>
  runAuthForUser((auth) =>
    auth.signInWithPassword({ email: credentials.email.trim(), password: credentials.password })
  );

export const signUp = (credentials: SignUpCredentials): Promise<AuthUserResult> =>
  runAuthForUser(
    (auth) => auth.signUp({ email: credentials.email.trim(), password: credentials.password }),
    // Supabase returns a user without identities when the email is already registered
    (user) =>
      user && (!user.identities || user.identities.length === 0)
        ? new Error(DUPLICATE_SIGNUP_MESSAGE)
        : null
  );

export const logout = (): Promise<AuthResult> =>
  runAuth(
    (auth) => {
      queryClient.clear();
      return auth.signOut();
    },
    { requireConfig: false }
  );

/**
 * The return address ends with "/" so allow-list patterns like `https://host/**` match it
 * (a bare origin does not match them, and Supabase then sends the user to the Site URL).
 */
export const signInWithGoogle = (): Promise<AuthResult> =>
  runAuth((auth) =>
    auth.signInWithOAuth({ provider: "google", options: { redirectTo: getAppUrl("/") } })
  );

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

export const requestPasswordReset = (email: string): Promise<AuthResult> =>
  runAuth((auth) =>
    auth.resetPasswordForEmail(email.trim(), { redirectTo: getAppUrl("/reset-password") })
  );

export const updatePassword = (password: string): Promise<AuthResult> =>
  runAuth((auth) => auth.updateUser({ password }));

/** Sign in anonymously (for visitors who haven't logged in) */
export const signInAnonymously = (): Promise<AuthResult> =>
  runAuth((auth) => auth.signInAnonymously(), { requireConfig: false });

/** Exchange authorization code for session (used in OAuth PKCE callback) */
export const exchangeCodeForSession = (code: string): Promise<AuthResult> =>
  runAuth((auth) => auth.exchangeCodeForSession(code));
