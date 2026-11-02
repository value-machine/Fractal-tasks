import { useState } from "react";
import type { ActiveTaskStatus, AppTask } from "@/features/tasks/types/appTask.types";
import { Badge } from "@/components/common/Badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/common/Select";

interface ArchiveTaskRowProps {
  task: AppTask;
  displayIndex: number;
  onRestore: (displayIndex: number, status: ActiveTaskStatus) => void;
}

export const ArchiveTaskRow = ({ task, displayIndex, onRestore }: ArchiveTaskRowProps) => {
  const [expanded, setExpanded] = useState(false);

  const handleStatusPick = (value: string) => {
    void onRestore(displayIndex, value as ActiveTaskStatus);
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-2.5 transition-shadow hover:elevation-md sm:p-3">
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex flex-wrap items-center gap-2">
          <p
            onClick={() => setExpanded((v) => !v)}
            className="cursor-pointer leading-snug font-medium break-words"
          >
            {task.title}
          </p>
          <Badge variant="success">Done</Badge>
        </div>

        {expanded && (
          <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">
            {task.description || "No description"}
          </p>
        )}

        {!task.description && !expanded && (
          <span className="text-xs text-muted-foreground/60">Click title to view details</span>
        )}
      </div>

      {/* Always unselected so every pick fires (a restore is an action, not a stored value). */}
      <Select value="" onValueChange={handleStatusPick}>
        <SelectTrigger aria-label="Restore task" className="w-30 shrink-0">
          Restore
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="to-do">As to-do</SelectItem>
          <SelectItem value="in-progress">As active</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
