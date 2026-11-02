import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  HARNESS_STAGES,
  HARNESS_UPKEEP_SKILLS,
  listHarnessSkillNames,
} from "./harnessOverviewContent";

const SKILLS_DIR = resolve(__dirname, "../../../../.agents/skills");

describe("harnessOverviewContent", () => {
  it("should list every skill folder in .agents/skills when the content is read", () => {
    const folders = readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    const listed = new Set(listHarnessSkillNames());
    const missing = folders.filter((name) => !listed.has(name));

    expect(
      missing,
      `Add these skills to src/features/harness-overview/services/harnessOverviewContent.ts: ${missing.join(", ")}`
    ).toEqual([]);
  });

  it("should not list a skill that has no folder in .agents/skills when the content is read", () => {
    const folders = new Set(readdirSync(SKILLS_DIR));

    const unknown = listHarnessSkillNames().filter((name) => !folders.has(name));

    expect(unknown).toEqual([]);
  });

  it("should put the owner steps on the backlog and verdict stages when the loop is read", () => {
    const stops = HARNESS_STAGES.filter((stage) => stage.ownerStep).map((stage) => stage.skill);

    expect(stops).toEqual(["loop-backlog", "loop-verdict"]);
    expect(HARNESS_UPKEEP_SKILLS.length).toBeGreaterThan(0);
  });
});
