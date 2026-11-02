import type {
  HarnessGuardrailGroup,
  HarnessHelper,
  HarnessOutcome,
  HarnessStage,
} from "../types/harnessOverview.types";

const skill = (name: string, summary: string): HarnessHelper => ({ name, summary, isSkill: true });

/** The product-owner loop, in order (source: `.agents/skills/router/references/loop-map.md`). */
export const HARNESS_STAGES: HarnessStage[] = [
  {
    skill: "router",
    title: "You ask for something",
    summary:
      "The router finds where the work stands (new request, half-built lap, waiting for your test) and picks up the right stage.",
    handoff: "request",
    helpers: [
      skill(
        "spec-load-context",
        "Reads the project's layout and rules at the start of a new chat."
      ),
    ],
  },
  {
    skill: "loop-backlog",
    title: "Choose what is next",
    summary: "Ranks the to-do list and asks you to confirm the top item.",
    ownerStep: true,
    handoff: "top task",
    helpers: [],
  },
  {
    skill: "loop-refine",
    title: "Write a one-page brief",
    summary:
      "What problem, how we will know it works, what is in and out, and a size (XS, S or M).",
    handoff: "brief",
    helpers: [
      skill("spec-simplify-flow", "Asks if the flow can have fewer steps."),
      skill(
        "spec-check-layer",
        "Checks the request fits how the app really works, not a quick patch."
      ),
    ],
  },
  {
    skill: "loop-plan",
    title: "Plan the build",
    summary: "Writes the test that must pass, then a plan sized to the brief.",
    handoff: "plan",
    helpers: [skill("spec-reuse-package", "Looks for an existing library before custom code.")],
  },
  {
    skill: "loop-build",
    title: "Build it, phase by phase",
    summary:
      "Writes the code until the test passes. Stops to ask you only for new services, data changes or costs.",
    handoff: "working change",
    helpers: [
      skill("spec-debug-runtime", "Hunts down bugs and failing tests."),
      skill("spec-optimize-performance", "Fixes slow queries and heavy screens."),
    ],
  },
  {
    skill: "loop-check",
    title: "Audit the result",
    summary: "Runs every automated check and has a reviewer read the change against each rule.",
    handoff: "checked change",
    helpers: [
      {
        name: "Automatic checks",
        summary: "Lint, types, architecture, file placement, tests.",
        isSkill: false,
      },
    ],
  },
  {
    skill: "loop-ship",
    title: "Package and publish a preview",
    summary:
      "Commits, opens the pull request with a live preview link, and gets the online tests green. It never goes live by itself.",
    handoff: "preview link",
    helpers: [
      {
        name: "CI on GitHub",
        summary: "The authoritative test run before anything merges.",
        isSkill: false,
      },
    ],
  },
  {
    skill: "loop-verdict",
    title: "You try the preview and decide",
    summary: "You get the link, test steps and a summary, then answer one question.",
    ownerStep: true,
    helpers: [
      skill("meta-learn-lessons", "After a Change or Drop, turns the miss into a better rule."),
    ],
  },
];

export const HARNESS_OUTCOMES: HarnessOutcome[] = [
  { title: "Pass", summary: "The change goes live and the task is archived. Back to the backlog." },
  {
    title: "Change",
    summary: "Your feedback becomes the next brief, on the same pull request. Back to refine.",
  },
  { title: "Drop", summary: "The pull request closes. Nothing goes live." },
];

export const HARNESS_GUARDRAILS: HarnessGuardrailGroup[] = [
  {
    title: "Rules the agent follows",
    items: [
      "Architecture and where each file belongs",
      "Code style and naming",
      "Testing standards",
      "Security (server-side permissions, no secrets in code)",
      "Git workflow (never writes to main)",
      "When to ask you, and what needs your approval",
    ],
  },
  {
    title: "Automatic checks",
    items: [
      "Formatting and lint",
      "Strict type checking",
      "Layer and import boundaries",
      "Allowed folders and file names",
      "Unit tests on every pull request",
      "Pull request title format for releases",
    ],
  },
];

/** Skills used when the harness itself needs changing, outside the loop. */
export const HARNESS_UPKEEP_SKILLS: HarnessHelper[] = [
  skill("meta-audit-harness", "Check the harness for drift."),
  skill("meta-intake-harness", "Bring in outside skills."),
  skill("meta-write-skill", "Write or change a skill."),
  skill("meta-grade-rule", "Score or tighten one rule."),
  skill("meta-write-adoption-guide", "Share a change with other repos."),
  skill("meta-compress-output", "Shorten replies."),
];

/** Every skill folder name the overview mentions; a test compares it with `.agents/skills`. */
export const listHarnessSkillNames = (): string[] => {
  const fromStages = HARNESS_STAGES.flatMap((stage) => [
    stage.skill,
    ...stage.helpers.filter((helper) => helper.isSkill).map((helper) => helper.name),
  ]);
  return [...fromStages, ...HARNESS_UPKEEP_SKILLS.map((helper) => helper.name)];
};
