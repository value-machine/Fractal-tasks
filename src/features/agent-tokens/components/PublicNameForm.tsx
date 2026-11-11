import { useState, type FormEvent } from "react";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useSavePublicName } from "@/features/agent-tokens/hooks/useAgentTokens";

interface PublicNameFormProps {
  userId: string;
  initialName: string;
  onSaved?: () => void;
}

/** Choose the name shown on everything your agents write. The tree is public, so it's your call. */
export const PublicNameForm = ({ userId, initialName, onSaved }: PublicNameFormProps) => {
  const save = useSavePublicName(userId);
  const [name, setName] = useState(initialName);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(name.trim(), { onSuccess: () => onSaved?.() });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Your public name
        <span className="font-normal text-muted-foreground">
          Shown on everything your agents write. The tree is public, so pick a name you are happy
          for anyone to see.
        </span>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="For example: Tom from Utrecht"
          maxLength={80}
        />
      </label>
      {save.error && (
        <Alert variant="destructive">
          {save.error instanceof Error ? save.error.message : "Could not save the name."}
        </Alert>
      )}
      <div>
        <Button type="submit" disabled={!name.trim() || save.isPending}>
          Save name
        </Button>
      </div>
    </form>
  );
};
