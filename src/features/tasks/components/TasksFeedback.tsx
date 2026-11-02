import type { SaveFeedback } from "@/features/tasks/types/appTask.types";
import { Alert, type AlertProps } from "@/components/common/Alert";

const FEEDBACK_LABEL: Record<Exclude<SaveFeedback, "idle">, string> = {
  saving: "Saving…",
  saved: "Saved",
  archived: "Archived",
  restored: "Restored",
  error: "Error",
};

interface TasksFeedbackProps {
  feedback: SaveFeedback;
  errorMessage: string | null;
  onDismiss?: () => void;
}

export const TasksFeedback = ({ feedback, errorMessage, onDismiss }: TasksFeedbackProps) => {
  const open = feedback !== "idle" || Boolean(errorMessage);
  if (!open) {
    return null;
  }

  const variant: AlertProps["variant"] =
    feedback === "error" ? "destructive" : feedback === "saving" ? "info" : "success";
  const message =
    feedback === "error" && errorMessage
      ? errorMessage
      : feedback !== "idle"
        ? FEEDBACK_LABEL[feedback]
        : errorMessage;

  if (!message) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
      <Alert
        variant={variant}
        onClose={onDismiss}
        className="pointer-events-auto max-w-[480px] bg-popover elevation-lg"
      >
        {message}
      </Alert>
    </div>
  );
};
