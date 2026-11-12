import { Bot, LogIn, LogOut } from "lucide-react";
import { ProfileInfo } from "./ProfileInfo";
import { SignInMenuItems } from "./SignInMenuItems";
import { ColorModeToggle } from "./ColorModeToggle";
import type { User } from "@/features/auth/types/auth.types";
import type { UserProfile } from "@/features/auth/types/auth.types";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/common/DropdownMenu";

interface ProfileMenuContentProps {
  isLoggedIn: boolean;
  authBackendConfigured: boolean;
  user: User | null;
  profile: UserProfile | null;
  profileLoading: boolean;
  onGoToLogin: () => void;
  onGoToAgents: () => void;
  onSignOut: () => void;
}

/** Account section for the current auth state (signed in, signed out, or auth not configured). */
const AccountMenuItems = ({
  isLoggedIn,
  authBackendConfigured,
  user,
  profile,
  profileLoading,
  onGoToLogin,
  onGoToAgents,
  onSignOut,
}: ProfileMenuContentProps) => {
  if (isLoggedIn) {
    return (
      <>
        <ProfileInfo user={user} profile={profile} profileLoading={profileLoading} />
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onGoToAgents}>
          <Bot />
          Connect your agent
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut />
          Sign Out
        </DropdownMenuItem>
      </>
    );
  }

  if (authBackendConfigured) {
    return <SignInMenuItems onGoToLogin={onGoToLogin} />;
  }

  return (
    <DropdownMenuItem disabled>
      <LogIn />
      Supabase not configured
    </DropdownMenuItem>
  );
};

/** Account items, then a footer with the color mode toggle in the bottom-right corner. */
export const ProfileMenuContent = (props: ProfileMenuContentProps) => (
  <>
    <AccountMenuItems {...props} />
    <DropdownMenuSeparator />
    <div className="flex justify-end">
      <ColorModeToggle />
    </div>
  </>
);
