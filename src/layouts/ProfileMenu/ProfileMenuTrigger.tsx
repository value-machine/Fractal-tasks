import { User as UserIcon } from "lucide-react";
import type { User } from "@/features/auth/types/auth.types";
import type { UserProfile } from "@/features/auth/types/auth.types";
import { getAvatarInitial, getAvatarUrl } from "@/shared/utils/profileHelpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/Avatar";
import { DropdownMenuTrigger } from "@/components/common/DropdownMenu";
import { Tooltip } from "@/components/common/Tooltip";

interface ProfileMenuTriggerProps {
  user: User | null;
  profile: UserProfile | null;
}

export const ProfileMenuTrigger = ({ user, profile }: ProfileMenuTriggerProps) => {
  const isLoggedIn = user !== null;
  const avatarInitial = getAvatarInitial(user, profile);
  const avatarUrl = isLoggedIn ? getAvatarUrl(profile) : null;
  const label = isLoggedIn ? "Account" : "Sign in";

  return (
    <Tooltip title={label}>
      <DropdownMenuTrigger
        aria-label={label}
        className="ml-4 rounded-full p-1 transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <Avatar>
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback>
            {isLoggedIn && avatarInitial ? avatarInitial : <UserIcon className="size-5" />}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
    </Tooltip>
  );
};
