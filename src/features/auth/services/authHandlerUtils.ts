import * as authService from "@/features/auth/services/authService";
import type { User } from "@/features/auth/types/auth.types";

interface AuthHandlerState {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const handleLogout = async (state: AuthHandlerState): Promise<void> => {
  state.setLoading(true);
  state.setError(null);
  const { error: logoutError } = await authService.logout();
  if (logoutError) {
    state.setError(logoutError.message);
  } else {
    state.setUser(null);
  }
  state.setLoading(false);
};

/**
 * Sends an email sign-in link. Leaves the global `loading` flag alone: pages that swap to a loading
 * screen while `loading` is true would unmount the form and lose its "check your inbox" state.
 */
export const handleSendEmailSignInLink = async (
  request: { email: string; returnPath?: string },
  state: Pick<AuthHandlerState, "setError">
): Promise<boolean> => {
  state.setError(null);
  const { error } = await authService.sendEmailSignInLink(request.email, request.returnPath);
  if (error) {
    state.setError(error.message);
    return false;
  }
  return true;
};
