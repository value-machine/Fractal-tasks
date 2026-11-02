import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge taught the theme's custom utilities (src/index.css) so conflicts
 * resolve like the built-ins: `rounded-{button,card,input}` and `elevation-*`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: { radius: ["button", "card", "input"] },
    classGroups: { shadow: [{ elevation: ["sm", "md", "lg", "xl"] }] },
  },
});

/** Merges conditional class names and resolves Tailwind utility conflicts (shadcn/ui helper). */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
