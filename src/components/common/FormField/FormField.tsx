import { useId } from "react";
import { Input, type InputProps } from "@/components/common/Input";
import { Label } from "@/components/common/Label";
import { cn } from "@/shared/utils/cn";

export interface FormFieldProps extends InputProps {
  /** Visible label, also the input's accessible name. */
  label: string;
  /** Class names for the wrapper (spacing between fields). */
  containerClassName?: string;
}

/** Labeled text input: `Label` + `Input` wired by id. */
export const FormField = ({
  label,
  id,
  containerClassName,
  required,
  ...props
}: FormFieldProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      <Label htmlFor={inputId}>
        {label}
        {required && <span aria-hidden="true">*</span>}
      </Label>
      <Input id={inputId} required={required} {...props} />
    </div>
  );
};
