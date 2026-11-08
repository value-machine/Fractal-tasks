import type { GoalRole, GoalStatus } from "@/features/goal-tree/types/goalTree.types";

/** Display names for statuses. */
export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  proposed: "Proposed",
  reviewed: "Reviewed",
  in_progress: "In progress",
  done: "Done",
  overtaken: "Overtaken",
};

/** Display names for verification levels 1-4. */
export const GOAL_VERIFICATION_LABELS: Record<number, string> = {
  1: "Self-reported",
  2: "Evidence attached",
  3: "Tool-verified",
  4: "Outcome observed",
};

/** Page copy for each role view. */
export const GOAL_ROLE_COPY: Record<GoalRole, { title: string; description: string }> = {
  donor: {
    title: "Thinking work",
    description:
      "For people donating their agent's tokens: goals to split or confirm, agent tasks to run, splits to review, and human actions that bounced back as unclear.",
  },
  executor: {
    title: "Actions",
    description:
      "For people ready to act: concrete, unclaimed steps that need a person's access or presence. Each one says exactly who, what and how.",
  },
};

const EVENT_LABELS: Record<string, string> = {
  created: "created",
  split: "split it",
  claimed: "claimed it",
  released: "released it",
  report: "reported",
  unclear: "bounced it back",
  overtaken: "marked it overtaken",
  note: "noted",
  link: "linked it",
  adopted: "placed it under a bigger goal",
};

/** Human wording for an event; reviews depend on the verdict. */
export const describeGoalEvent = (type: string, verdict: string | null): string => {
  if (type === "review") return verdict === "accept" ? "accepted the split" : "rejected the split";
  return EVENT_LABELS[type] ?? type;
};

/** Whether a status counts as closed for progress purposes. */
export const isGoalClosed = (status: GoalStatus): boolean =>
  status === "done" || status === "overtaken";
