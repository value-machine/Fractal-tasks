import type { ComponentProps } from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";
import { cn } from "@/shared/utils/cn";

export const Avatar = ({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Root>) => (
  <AvatarPrimitive.Root
    data-slot="avatar"
    className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
);

export const AvatarImage = ({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Image>) => (
  <AvatarPrimitive.Image
    data-slot="avatar-image"
    className={cn("aspect-square size-full", className)}
    {...props}
  />
);

export const AvatarFallback = ({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Fallback>) => (
  <AvatarPrimitive.Fallback
    data-slot="avatar-fallback"
    className={cn(
      "flex size-full items-center justify-center rounded-full bg-muted-foreground text-background",
      className
    )}
    {...props}
  />
);
