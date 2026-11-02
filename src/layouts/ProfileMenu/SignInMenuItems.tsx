import { LogIn } from "lucide-react";
import { DropdownMenuItem } from "@/components/common/DropdownMenu";

interface SignInMenuItemsProps {
  onSignInWithGoogle: () => void;
  onGoToLogin: () => void;
}

export const SignInMenuItems = ({ onSignInWithGoogle, onGoToLogin }: SignInMenuItemsProps) => {
  return (
    <>
      <DropdownMenuItem onSelect={onSignInWithGoogle}>
        <LogIn />
        Sign In with Google
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={onGoToLogin}>
        <LogIn />
        Sign in with email
      </DropdownMenuItem>
    </>
  );
};
