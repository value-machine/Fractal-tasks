import { BadgeCheck } from "lucide-react";

interface ProfileNameProps {
  displayName: string;
  isVerified: boolean;
}

export const ProfileName = ({ displayName, isVerified }: ProfileNameProps) => {
  return (
    <div className="flex items-center gap-1">
      <span className="truncate text-sm font-bold">{displayName}</span>
      {isVerified && (
        <BadgeCheck aria-label="Verified" className="size-3.5 shrink-0 text-primary" />
      )}
    </div>
  );
};
