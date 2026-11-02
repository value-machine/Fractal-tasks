import type { ComponentProps } from "react";
import { cn } from "@/shared/utils/cn";

export type InputProps = ComponentProps<"input">;

export const Input = ({ className, type, ...props }: InputProps) => {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-input border border-input bg-transparent px-3 py-1 text-base text-foreground transition-[color,box-shadow] outline-none placeholder:text-muted-foreground hover:border-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className
      )}
      {...props}
    />
  );
};
