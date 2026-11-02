import type { ComponentProps } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/shared/utils/cn";

/** Indeterminate loading indicator. Size with `size-*` classes (default `size-10`). */
export const Spinner = ({ className, ...props }: ComponentProps<"svg">) => {
  return (
    <LoaderCircle
      role="status"
      aria-label="Loading"
      className={cn("size-10 animate-spin text-primary", className)}
      {...props}
    />
  );
};
