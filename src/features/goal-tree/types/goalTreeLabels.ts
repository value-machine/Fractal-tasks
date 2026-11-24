import { TASK_RELATION_WORDING } from "@/shared/types/taskRelations";
import type {
  GoalDuration,
  GoalRelation,
  GoalRequirement,
  GoalRole,
  GoalStatus,
} from "@/features/goal-tree/types/goalTree.types";

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

/** Duration buckets for the filter, shortest first, with the minutes they stand for. */
export const GOAL_DURATION_OPTIONS: { value: GoalDuration; minutes: number; label: string }[] = [
  { value: "15m", minutes: 15, label: "15 minutes" },
  { value: "1h", minutes: 60, label: "An hour" },
  { value: "half_day", minutes: 240, label: "Half a day" },
  { value: "day", minutes: 480, label: "A day" },
  { value: "days", minutes: 2400, label: "Several days" },
];

/** "About an hour" for a stored estimate; null when there is none. */
export const describeGoalDuration = (minutes: number | null): string | null => {
  const option = GOAL_DURATION_OPTIONS.find((o) => o.minutes === minutes);
  if (!option) return null;
  return option.value === "days" ? "Several days" : `Up to ${option.label.toLowerCase()}`;
};

/** Rough total for many leaves: minutes under an hour, hours under a working day, else days. */
export const describeGoalMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes < 480) return `${Math.round(minutes / 60)} hours`;
  return `${Math.round(minutes / 480)} working days`;
};

/** "Dutch (language)", "fuel: 40 EUR (money)". */
export const describeGoalRequirement = (req: GoalRequirement): string => {
  const amount = req.amount === null ? "" : `: ${req.amount}${req.unit ? ` ${req.unit}` : ""}`;
  return `${req.value}${amount} (${req.kind})`;
};

/** How a relation reads from the focused goal: "Blocked by", "Blocks", ... */
export const describeGoalRelation = (relation: GoalRelation): string =>
  TASK_RELATION_WORDING[relation.type][relation.direction];

/** Whether a status counts as closed for progress purposes. */
export const isGoalClosed = (status: GoalStatus): boolean =>
  status === "done" || status === "overtaken";

/**
 * "Idle 8 days · 2 tasks wait on this": shown on work-list rows so stalled work is visible when
 * someone comes back (Point At has no reminders). Empty for recent work nobody waits on.
 */
export const describeGoalStall = (idleDays: number, blocksOpen: number): string =>
  [
    idleDays >= 3 ? `Idle ${idleDays} days` : null,
    blocksOpen > 0
      ? `${blocksOpen} ${blocksOpen === 1 ? "task waits" : "tasks wait"} on this`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
