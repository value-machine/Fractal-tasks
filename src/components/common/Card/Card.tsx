import type { ComponentProps } from "react";
import { cn } from "@/shared/utils/cn";

export type CardProps = ComponentProps<"div"> & {
  /**
   * Whether the card lifts (shadow) on hover
   * @default true
   */
  hoverable?: boolean;
};

export const Card = ({ className, hoverable = true, ...props }: CardProps) => {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex h-full w-full max-w-[400px] flex-col gap-6 rounded-card border bg-card py-6 text-card-foreground elevation-sm transition-shadow duration-(--duration-normal)",
        hoverable && "hover:elevation-xl",
        className
      )}
      {...props}
    />
  );
};

export const CardHeader = ({ className, ...props }: ComponentProps<"div">) => (
  <div data-slot="card-header" className={cn("flex flex-col gap-1.5 px-6", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: ComponentProps<"div">) => (
  <div data-slot="card-title" className={cn("leading-none font-semibold", className)} {...props} />
);

export const CardDescription = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    data-slot="card-description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
);

export const CardContent = ({ className, ...props }: ComponentProps<"div">) => (
  <div data-slot="card-content" className={cn("px-6", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: ComponentProps<"div">) => (
  <div data-slot="card-footer" className={cn("flex items-center px-6", className)} {...props} />
);
