import { describe, expect, it } from "vitest";
import { agentContextScope } from "@/features/agent-context/services/agentContextScope";
import type { AgentFocusPayload } from "@/features/agent-context/types/agentContext.types";

const task = (id: string) => ({ id, title: id });

/** A focus payload as focus_node returns it (empty fields already left out). */
const payload: AgentFocusPayload = {
  node: { ...task("focus"), parent_id: "parent" },
  root: task("root"),
  ancestors: [task("root"), task("parent")],
  siblings: [task("sibling")],
  children: [{ ...task("child"), children: [task("grandchild")] }],
  relations: [
    { ...task("blocker"), type: "blocked_by", direction: "out" },
    { ...task("far-goal"), type: "also_serves", direction: "out" },
  ],
};

describe("agentContextScope", () => {
  it("should include every task the payload names when an agent focuses a task", () => {
    const scope = agentContextScope(payload, new Set(["root", "blocker"]));
    expect([...scope.inContext].sort()).toEqual(
      ["blocker", "child", "far-goal", "focus", "grandchild", "parent", "root", "sibling"].sort()
    );
  });

  it("should list a related task apart when it is not in the drawn tree", () => {
    const scope = agentContextScope(payload, new Set(["root", "blocker"]));
    expect(scope.elsewhere).toEqual([task("far-goal")]);
  });

  it("should draw from the focused task itself when it is a root", () => {
    const scope = agentContextScope({ node: task("solo") }, new Set(["solo"]));
    expect(scope.rootId).toBe("solo");
    expect([...scope.inContext]).toEqual(["solo"]);
  });
});
