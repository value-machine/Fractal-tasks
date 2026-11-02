import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  /** Accessible description; rendered visually below the title. */
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Centered dialog (shadcn/ui Dialog on Radix). Closes on overlay click, Escape, or the X button. */
export const Modal = ({
  open,
  onClose,
  title,
  description,
  actions,
  children,
  className,
}: ModalProps) => {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          {...(!description && { "aria-describedby": undefined })}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-popover p-6 text-popover-foreground elevation-lg duration-(--duration-normal) data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
            className
          )}
        >
          {title && (
            <DialogPrimitive.Title className="text-lg leading-none font-semibold">
              {title}
            </DialogPrimitive.Title>
          )}
          {description && (
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
          )}
          <div>{children}</div>
          {actions && <div className="flex justify-end gap-2">{actions}</div>}
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
