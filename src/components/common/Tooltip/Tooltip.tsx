import type { ComponentProps, ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "@/shared/utils/cn";

export interface TooltipProps {
  /** Tooltip text. */
  title: ReactNode;
  /** The trigger element (must accept a ref, e.g. a button). */
  children: ReactNode;
  side?: ComponentProps<typeof TooltipPrimitive.Content>["side"];
  className?: string;
}

/** Hover/focus tooltip around a single trigger element. */
export const Tooltip = ({ title, children, side = "bottom", className }: TooltipProps) => (
  <TooltipPrimitive.Provider delayDuration={300}>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            "z-50 rounded-md bg-muted px-2 py-1 text-xs text-foreground elevation-md animate-in fade-in-0 zoom-in-95",
            className
          )}
        >
          {title}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
);
