import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getOAuthErrorMessage,
  handleCodeExchange,
} from "@/features/auth/services/authCallbackService";
import { isSupabaseConfigured } from "@/shared/services/supabaseService";
import { useAuthContext } from "@/shared/context/AuthContext";

interface AuthCallbackState {
  isProcessing: boolean;
  error: string | null;
}

/**
 * Handles PKCE returns (OAuth and email sign-in links) on the app root.
 */
export const useAuthCallbackHandler = (): AuthCallbackState => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { error, setAuthError } = useAuthContext();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const oauthError = searchParams.get("error");
    const code = searchParams.get("code");

    if (!oauthError && !code) {
      return;
    }

    const processCallback = async () => {
      setIsProcessing(true);

      if (oauthError) {
        setAuthError(getOAuthErrorMessage(searchParams));
        setIsProcessing(false);
        return;
      }

      if (code) {
        const exchangeError = await handleCodeExchange(code, navigate);
        if (exchangeError) {
          setAuthError(exchangeError);
        }
        setIsProcessing(false);
      }
    };

    void processCallback();
  }, [navigate, searchParams, setAuthError]);

  return { isProcessing, error };
};
