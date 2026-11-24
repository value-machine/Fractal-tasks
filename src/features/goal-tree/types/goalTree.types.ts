import type { TaskRelationType } from "@/shared/types/taskRelations";

/**
 * Goal tree domain types, mirroring the read API of the `point-at` Edge Function
 * (shapes copied from the prototype's store: Node, NodeSummary, NodeEvent).
 */

export type GoalStatus = "proposed" | "reviewed" | "in_progress" | "done" | "overtaken";
export type GoalLeafType = "agent" | "human";
export type GoalRole = "donor" | "executor";
export type GoalRequirementKind =
  | "skill"
  | "material"
  | "money"
  | "location"
  | "language"
  | "access";
/** Duration buckets the agent tools accept; stored as their upper bound in minutes. */
export type GoalDuration = "15m" | "1h" | "half_day" | "day" | "days";

export interface GoalRequirement {
  kind: GoalRequirementKind;
  value: string;
  amount: number | null;
  unit: string | null;
}

export interface GoalNode {
  id: string;
  parent_id: string | null;
  title: string;
  done_check: string | null;
  next_action: string | null;
  status: GoalStatus;
  leaf_type: GoalLeafType | null;
  leaf_who: string | null;
  leaf_what: string | null;
  leaf_how: string | null;
  /** Human leaf: what follows once it is done; created as a task when it is reported done. */
  leaf_follow_up: string | null;
  split_hypothesis: string | null;
  split_prediction: string | null;
  split_assumptions: string | null;
  split_at: string | null;
  labels: string[];
  /** "private": only the goal's owner and their agents see it. */
  visibility: "public" | "private";
  claimed_by: string | null;
  claimed_at: string | null;
  /** Estimated time as the upper bound of its bucket (15, 60, 240, 480 or 2400 minutes). */
  duration_minutes: number | null;
  requirements: GoalRequirement[];
  /** Context the task needs, as links only (Point At stores no files). */
  links: GoalLink[];
  verification_level: number | null;
  overtaken_note: string | null;
  unclear_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** A node plus the counts needed for the progress bar. */
export interface GoalNodeSummary extends GoalNode {
  child_count: number;
  done_child_count: number;
  /** Whole days since anything happened on it (worked out when read; there are no timers). */
  idle_days: number;
  /** Open tasks blocked by this one. */
  blocks_open: number;
}

/** A summary with its own children, so a tile can show two levels. */
export interface GoalNodeWithChildren extends GoalNodeSummary {
  children: GoalNodeSummary[];
}

export interface GoalEvent {
  id: number;
  node_id: string;
  actor: string;
  type: string;
  body: string | null;
  evidence: string | null;
  verification_level: number | null;
  verdict: string | null;
  created_at: string;
}

export interface GoalAncestor {
  id: string;
  title: string;
  status: GoalStatus;
}

export interface GoalLink {
  url: string;
  title: string;
}

/** A typed relation as seen from the focused goal ("out": the focused goal is the subject). */
export interface GoalRelation {
  type: TaskRelationType;
  direction: "out" | "in";
  id: string;
  title: string;
  status: GoalStatus;
  note: string | null;
}

/** Total estimated time of the open leaves below a goal. */
export interface GoalEstimate {
  open_leaf_minutes: number;
  open_leaves: number;
  unestimated_leaves: number;
}

export interface GoalNodeDetail {
  node: GoalNodeSummary;
  ancestors: GoalAncestor[];
  children: GoalNodeWithChildren[];
  events: GoalEvent[];
  relations: GoalRelation[];
  estimate: GoalEstimate | null;
  /** Private steps of other people that also serve this goal: a count, never who or what. */
  served_privately?: number;
}

/** The signed-in person's own list (`GET /api/me/tasks`). */
export interface GoalMyTasks {
  private_goals: GoalNodeSummary[];
  claimed: GoalNodeSummary[];
}

/** Filters on what the work takes, for the role views. */
export interface GoalWorkFilters {
  maxDuration?: GoalDuration;
  /** 0 means: only tasks that need no money. */
  maxCost?: number;
  requirement?: string;
}

/** A role-view row: a summary with an optional reason it is waiting for that role. */
export type GoalRoleViewItem = GoalNodeSummary & { why?: string };
