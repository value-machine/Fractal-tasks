import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/shared/context/AuthContext";

interface UseAccountMenuActionsProps {
  onClose: () => void;
}

export const useAccountMenuActions = ({ onClose }: UseAccountMenuActionsProps) => {
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  const handleGoToLogin = useCallback(() => {
    onClose();
    void navigate("/login");
  }, [navigate, onClose]);

  const handleGoToAgents = useCallback(() => {
    onClose();
    void navigate("/agents");
  }, [navigate, onClose]);

  const handleSignOut = useCallback(async () => {
    onClose();
    await logout();
  }, [logout, onClose]);

  return {
    handleGoToLogin,
    handleGoToAgents,
    handleSignOut,
  };
};
