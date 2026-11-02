import { cn } from "@/shared/utils/cn";

export interface SegmentedControlOption<TValue extends string> {
  value: TValue;
  label: string;
}

export interface SegmentedControlProps<TValue extends string> {
  options: SegmentedControlOption<TValue>[];
  value: TValue;
  onValueChange: (value: TValue) => void;
  className?: string;
}

/** Single-select row of toggle buttons (each a `button` with `aria-pressed`). */
export const SegmentedControl = <TValue extends string>({
  options,
  value,
  onValueChange,
  className,
}: SegmentedControlProps<TValue>) => {
  return (
    <div role="group" className={cn("flex w-full rounded-input border border-input", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "h-9 flex-1 border-input text-sm font-medium transition-colors not-first:border-l first:rounded-l-input last:rounded-r-input focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
              selected ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
