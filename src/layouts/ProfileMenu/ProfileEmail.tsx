interface ProfileEmailProps {
  email: string;
}

export const ProfileEmail = ({ email }: ProfileEmailProps) => {
  return <span className="block truncate text-xs text-muted-foreground">{email}</span>;
};
