import { useCallback, useState } from "react";
import { useAuthContext } from "@/shared/context/AuthContext";
import { useAuthBackendConfigured } from "@/shared/hooks/useAuthBackendConfigured";
import { useUserProfileQuery } from "@/features/auth/hooks/useUserProfileQuery";
import { DropdownMenu, DropdownMenuContent } from "@/components/common/DropdownMenu";
import { ProfileMenuContent } from "./ProfileMenuContent";
import { ProfileMenuTrigger } from "./ProfileMenuTrigger";
import { useAccountMenuActions } from "@/shared/hooks/useAccountMenuActions";

/**
 * ProfileMenu component for displaying user account information and sign-in options.
 * Shows sign-in buttons when user is not logged in, and profile/logout when logged in.
 */
export const ProfileMenu = () => {
  const { user } = useAuthContext();
  const { data: profile, isLoading: profileLoading } = useUserProfileQuery(user?.id ?? null);
  const { isConfigured: authBackendConfigured } = useAuthBackendConfigured();
  const [open, setOpen] = useState(false);
  const handleClose = useCallback(() => setOpen(false), []);

  const { handleSignIn, handleGoToLogin, handleSignOut } = useAccountMenuActions({
    onClose: handleClose,
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <ProfileMenuTrigger user={user} profile={profile ?? null} />
      <DropdownMenuContent id="account-menu" align="end" className="w-[240px] max-w-[280px]">
        <ProfileMenuContent
          isLoggedIn={user !== null}
          authBackendConfigured={authBackendConfigured}
          user={user}
          profile={profile ?? null}
          profileLoading={profileLoading}
          onSignInWithGoogle={handleSignIn}
          onGoToLogin={handleGoToLogin}
          onSignOut={handleSignOut}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
