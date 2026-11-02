import type { UserProfile } from "@/features/auth/types/auth.types";
import { getRoleDisplay } from "@/shared/utils/profileHelpers";
import { Badge } from "@/components/common/Badge";

interface ProfileChipsProps {
  profile: UserProfile;
}

export const ProfileChips = ({ profile }: ProfileChipsProps) => {
  const roleDisplay = getRoleDisplay(profile);
  const hasCredits = profile.remaining_credits !== null && profile.remaining_credits !== undefined;
  const hasOrganization = Boolean(profile.ef_nl_edu_person_home_organization);

  if (!roleDisplay && !hasCredits && !hasOrganization) {
    return null;
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {roleDisplay && (
        <Badge variant="outline" className="text-[0.65rem]">
          {roleDisplay}
        </Badge>
      )}
      {hasCredits && (
        <Badge variant="primary" className="text-[0.65rem]">
          {`${profile.remaining_credits} credits`}
        </Badge>
      )}
      {hasOrganization && (
        <Badge variant="outline" className="text-[0.65rem]">
          {profile.ef_nl_edu_person_home_organization}
        </Badge>
      )}
    </div>
  );
};
