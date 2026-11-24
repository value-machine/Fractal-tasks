import { describe, expect, it } from "vitest";
import { describeGoalStall } from "@/features/goal-tree/types/goalTreeLabels";

describe("describeGoalStall", () => {
  it("should name idle days and waiting tasks when a task has stalled and holds others up", () => {
    expect(describeGoalStall(8, 2)).toBe("Idle 8 days · 2 tasks wait on this");
  });

  it("should say nothing when the task is recent and nobody waits on it", () => {
    expect(describeGoalStall(1, 0)).toBe("");
  });

  it("should name a single waiting task in the singular", () => {
    expect(describeGoalStall(0, 1)).toBe("1 task waits on this");
  });
});
