import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { DropdownMenuItem } from "@/components/common/DropdownMenu";
import { Tooltip } from "@/components/common/Tooltip";
import { useColorMode } from "@/shared/context/ColorModeContext";
import type { ColorMode } from "@/shared/theme/colorMode";

const MODE_UI: Record<ColorMode, { label: string; icon: LucideIcon; next: ColorMode }> = {
  light: { label: "Light", icon: Sun, next: "dark" },
  dark: { label: "Dark", icon: Moon, next: "system" },
  system: { label: "System", icon: Monitor, next: "light" },
};

/**
 * Icon-only menu item that cycles Light → Dark → System; hover text names the current
 * and next mode. Keeps the menu open so the change is visible.
 */
export const ColorModeToggle = () => {
  const { mode, setMode } = useColorMode();
  const { label, icon: Icon, next } = MODE_UI[mode];
  const title = `Theme: ${label} (click for ${MODE_UI[next].label})`;

  return (
    <Tooltip title={title} side="left">
      <DropdownMenuItem
        aria-label={title}
        onSelect={(event) => {
          event.preventDefault();
          setMode(next);
        }}
        className="size-8 justify-center p-0"
      >
        <Icon />
      </DropdownMenuItem>
    </Tooltip>
  );
};
