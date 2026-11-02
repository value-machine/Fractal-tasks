import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export const alertVariants = cva(
  "relative flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        destructive:
          "border-destructive/40 bg-destructive/10 text-foreground [&>svg]:text-destructive",
        success: "border-success/40 bg-success/10 text-foreground [&>svg]:text-success",
        warning: "border-warning/40 bg-warning/10 text-foreground [&>svg]:text-warning",
        info: "border-info/40 bg-info/10 text-foreground [&>svg]:text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

const ALERT_ICON: Record<AlertVariant, typeof Info | null> = {
  default: null,
  destructive: CircleAlert,
  success: CircleCheck,
  warning: TriangleAlert,
  info: Info,
};

export type AlertProps = ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    /** Trailing element (e.g. a dismiss button). */
    action?: React.ReactNode;
    /** Shows a close button that calls this handler. */
    onClose?: () => void;
  };

export const Alert = ({ className, variant, action, onClose, children, ...props }: AlertProps) => {
  const Icon = ALERT_ICON[variant ?? "default"];

  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" />}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
      {onClose && (
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-my-1 -mr-2 rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
};
