import type { AppTask } from "@/features/tasks/types/appTask.types";

export const TASK_STATUS_OPTIONS: AppTask["status"][] = ["to-do", "in-progress", "done"];

export const TASK_STATUS_LABEL: Record<AppTask["status"], string> = {
  "to-do": "To do",
  "in-progress": "Active",
  done: "Done",
};

/**
 * Width of the compact status Select trigger.
 * Fits the longest label ("Active") without truncation at 16px root.
 */
export const TASK_STATUS_SELECT_MIN_WIDTH = "6rem";

/** Text color class per status (tokens from `src/index.css`). */
export const TASK_STATUS_TEXT_CLASS: Record<AppTask["status"], string> = {
  "to-do": "text-muted-foreground",
  "in-progress": "text-warning",
  done: "text-success",
};
