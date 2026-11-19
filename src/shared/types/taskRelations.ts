/**
 * Typed relations between Point At tasks, as the point-at function stores them (relations.ts).
 * Shared by the goal pages (relations panel) and the graph view (line types).
 */
export type TaskRelationType =
  | "blocked_by"
  | "also_serves"
  | "alternative_to"
  | "replaces"
  | "duplicate_of"
  | "related_to"
  | "overtakes";

/** Every relation type, in the order the graph legend shows them. */
export const TASK_RELATION_TYPES: TaskRelationType[] = [
  "blocked_by",
  "also_serves",
  "alternative_to",
  "replaces",
  "duplicate_of",
  "related_to",
  "overtakes",
];

/**
 * How each type reads: `name` for a legend, `out` from the task that is the subject
 * ("Blocked by"), `in` from the other end ("Blocks").
 */
export const TASK_RELATION_WORDING: Record<
  TaskRelationType,
  { name: string; out: string; in: string }
> = {
  blocked_by: { name: "Blocked by", out: "Blocked by", in: "Blocks" },
  also_serves: { name: "Also serves", out: "Also serves", in: "Served by" },
  alternative_to: { name: "Alternative", out: "Alternative to", in: "Alternative to" },
  replaces: { name: "Replaces", out: "Replaces", in: "Replaced by" },
  duplicate_of: { name: "Duplicate", out: "Duplicate of", in: "Has duplicate" },
  related_to: { name: "Related", out: "Related to", in: "Related to" },
  overtakes: { name: "Overtakes", out: "Overtakes", in: "Overtaken by" },
};
