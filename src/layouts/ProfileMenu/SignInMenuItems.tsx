import { LogIn } from "lucide-react";
import { DropdownMenuItem } from "@/components/common/DropdownMenu";

interface SignInMenuItemsProps {
  onGoToLogin: () => void;
}

/** Signed out: one entry to the sign-in page, which offers every sign-in method. */
export const SignInMenuItems = ({ onGoToLogin }: SignInMenuItemsProps) => (
  <DropdownMenuItem onSelect={onGoToLogin}>
    <LogIn />
    Sign in
  </DropdownMenuItem>
);
