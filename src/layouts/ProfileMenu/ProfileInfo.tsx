import { User as UserIcon } from "lucide-react";
import type { User } from "@/features/auth/types/auth.types";
import type { UserProfile } from "@/features/auth/types/auth.types";
import { getDisplayName, getAvatarInitial, getAvatarUrl } from "@/shared/utils/profileHelpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/Avatar";
import { Spinner } from "@/components/common/Spinner";
import { ProfileChips } from "./ProfileChips";
import { ProfileName } from "./ProfileName";
import { ProfileEmail } from "./ProfileEmail";

interface ProfileInfoProps {
  user: User | null;
  profile: UserProfile | null;
  profileLoading: boolean;
}

export const ProfileInfo = ({ user, profile, profileLoading }: ProfileInfoProps) => {
  const displayName = getDisplayName(user, profile);
  const avatarInitial = getAvatarInitial(user, profile);
  const avatarUrl = getAvatarUrl(profile);
  const showEmail = user?.email && user.email !== displayName;

  return (
    <div className="flex items-center gap-3 px-2 py-3">
      <Avatar className="size-10">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
        <AvatarFallback>{avatarInitial || <UserIcon className="size-5" />}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <ProfileName displayName={displayName} isVerified={profile?.email_verified ?? false} />
        {showEmail && <ProfileEmail email={user.email!} />}
        {profileLoading && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Spinner className="size-3" />
            Loading...
          </div>
        )}
        {profile && <ProfileChips profile={profile} />}
      </div>
    </div>
  );
};
