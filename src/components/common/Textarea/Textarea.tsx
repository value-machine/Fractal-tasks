import type { ComponentProps } from "react";
import { cn } from "@/shared/utils/cn";

export const Textarea = ({ className, ...props }: ComponentProps<"textarea">) => (
  <textarea
    data-slot="textarea"
    className={cn(
      "flex field-sizing-content min-h-16 w-full rounded-input border border-input bg-transparent px-3 py-2 text-base text-foreground transition-[color,box-shadow] outline-none placeholder:text-muted-foreground hover:border-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      className
    )}
    {...props}
  />
);
