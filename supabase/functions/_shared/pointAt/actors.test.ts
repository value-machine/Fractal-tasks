import { describe, expect, it } from "vitest";

import { actorFor, actorPerson, isValidDisplayName } from "./actors.ts";

describe("actors", () => {
  it("should name the person and the agent when an agent label is given", () => {
    expect(actorFor("Alice", "Claude Code")).toBe("Alice via Claude Code");
    expect(actorFor("Alice", "  ")).toBe("Alice");
    expect(actorFor("Alice", undefined)).toBe("Alice");
  });

  it("should find the same person when the agent, case or spacing differs", () => {
    expect(actorPerson("Alice via Claude Code")).toBe("alice");
    expect(actorPerson("alice  via Cursor")).toBe("alice");
    expect(actorPerson("Tom Jansen")).toBe("tom jansen");
    expect(actorPerson("Olivia Smith via Claude")).toBe("olivia smith");
  });

  it("should refuse a display name when it is empty, too long or contains ' via '", () => {
    expect(isValidDisplayName("Olivia Smith")).toBe(true);
    expect(isValidDisplayName("  ")).toBe(false);
    expect(isValidDisplayName("x".repeat(81))).toBe(false);
    expect(isValidDisplayName("Bob via Alice")).toBe(false);
  });
});
