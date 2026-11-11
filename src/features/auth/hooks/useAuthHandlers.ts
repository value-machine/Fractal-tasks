import { useRef, useCallback, useMemo } from "react";
import * as authService from "@/features/auth/services/authService";
import type { OAuthProvider, User } from "@/features/auth/types/auth.types";
import {
  handleLogout as handleLogoutUtil,
  handleSendEmailSignInLink as handleSendEmailSignInLinkUtil,
} from "@/features/auth/services/authHandlerUtils";

interface UseAuthHandlersOptions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthHandlers = ({ setUser, setLoading, setError }: UseAuthHandlersOptions) => {
  const signInInFlightRef = useRef(false);
  const stateRef = useRef({ setUser, setLoading, setError });
  stateRef.current = { setUser, setLoading, setError };

  const signInWithOAuthProvider = useCallback(
    async (provider: OAuthProvider, returnPath?: string) => {
      if (signInInFlightRef.current) return;
      signInInFlightRef.current = true;
      const { setLoading: setLoadingState, setError: setErrorState } = stateRef.current;
      try {
        setLoadingState(true);
        setErrorState(null);
        const { error: signInError } = await authService.signInWithOAuthProvider(
          provider,
          returnPath
        );
        if (signInError) setErrorState(signInError.message);
      } catch (err) {
        setErrorState(err instanceof Error ? err.message : "Sign-in could not be started.");
      } finally {
        setLoadingState(false);
        signInInFlightRef.current = false;
      }
    },
    []
  );

  const sendEmailSignInLink = useCallback(
    (email: string, returnPath?: string) =>
      handleSendEmailSignInLinkUtil({ email, returnPath }, stateRef.current),
    []
  );
  const logout = useCallback(() => handleLogoutUtil(stateRef.current), []);

  const clearAuthError = useCallback(() => {
    stateRef.current.setError(null);
  }, []);

  return useMemo(
    () => ({ logout, signInWithOAuthProvider, sendEmailSignInLink, clearAuthError }),
    [logout, signInWithOAuthProvider, sendEmailSignInLink, clearAuthError]
  );
};
