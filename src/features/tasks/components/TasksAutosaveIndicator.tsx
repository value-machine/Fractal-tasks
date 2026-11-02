import { CircleCheck, RefreshCw } from "lucide-react";
import type { TextAutosaveStatus } from "@/features/tasks/types/appTask.types";
import { Badge } from "@/components/common/Badge";

interface TasksAutosaveIndicatorProps {
  status: TextAutosaveStatus;
}

export const TasksAutosaveIndicator = ({ status }: TasksAutosaveIndicatorProps) => {
  if (status === "idle") {
    return null;
  }

  const isSaved = status === "saved";

  return (
    <Badge variant={isSaved ? "success" : "outline"} aria-live="polite" className="h-7 px-2.5">
      {isSaved ? <CircleCheck /> : <RefreshCw className="animate-spin" />}
      {isSaved ? "All changes saved" : "Saving…"}
    </Badge>
  );
};
