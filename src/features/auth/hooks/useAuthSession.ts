import { getSupabase, isSupabaseConfigured } from "@/shared/services/supabaseService";
import { mapProviderUserToAppUser } from "@/shared/utils/userUtils";
import type { User } from "@/features/auth/types/auth.types";
import type { SupabaseUser } from "@/shared/services/supabaseService";

/**
 * Visitors without a session stay signed out: the app does not create anonymous sessions
 * (owner decision, 2026-11-06; the Point At tree is public and read-only).
 */
const handleSessionResult = (session: { user: SupabaseUser } | null): User | null =>
  session?.user ? mapProviderUserToAppUser(session.user) : null;

export const initializeSession = async (): Promise<{
  user: User | null;
  error: string | null;
}> => {
  if (!isSupabaseConfigured()) {
    return { user: null, error: null };
  }

  try {
    const supabase = getSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = handleSessionResult(session);
    return { user, error: null };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : "Failed to initialize authentication",
    };
  }
};

/**
 * Handle auth state change event
 */
export const handleAuthStateChange = async (
  session: { user: SupabaseUser } | null
): Promise<{ user: User | null; error: string | null }> => ({
  user: handleSessionResult(session),
  error: null,
});
