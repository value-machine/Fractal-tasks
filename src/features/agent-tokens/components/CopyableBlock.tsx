import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/common/Button";

interface CopyableBlockProps {
  label: string;
  value: string;
}

/** A labelled block of text to paste elsewhere, with a copy button. */
export const CopyableBlock = ({ label, value }: CopyableBlockProps) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => void copy()}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  );
};
