const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { validateSkills, headings, frontmatter } = require("./validate-skills.cjs");

const REFS = path.join(".agents", "skills", "router", "references");

/**
 * @param {string} name
 * @param {{calls?: string, calledBy?: string, description?: string, sections?: string[]}} [opts]
 */
function skillText(name, opts = {}) {
  const sections = opts.sections || ["Edges", "Steps", "Examples", "Output", "Not for"];
  const body = sections.map((s) =>
    s === "Edges"
      ? [
          "## Edges",
          "",
          "| Field | Value |",
          "|---|---|",
          "| In | x |",
          "| Out | y |",
          `| Calls | ${opts.calls || "—"} |`,
          `| Called by | ${opts.calledBy || "owner"} |`,
          "| Next | — |",
          "| Owner stops | none |",
        ].join("\n")
      : `## ${s}\n\ntext`,
  );
  const description = opts.description ?? "Does a thing. Use when a thing is needed.";
  return `---\nname: ${name}\ndescription: >-\n  ${description}\n---\n\n# ${name}\n\nPurpose.\n\n${body.join("\n\n")}\n`;
}

describe("validate-skills", () => {
  /** @type {string} */
  let root;

  /** @param {string} rel @param {string} text */
  function write(rel, text) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }

  /** @param {string[][]} rows @param {string[][]} [retired] */
  function catalog(rows, retired = []) {
    const skills = rows.map(([n, s, src]) => `| \`${n}\` | ${s} | ${src || "—"} |`).join("\n");
    const ret = retired.map(([n, d]) => `| \`${n}\` | ${d} |`).join("\n");
    write(
      path.join(REFS, "catalog.md"),
      `# Catalog\n\n## Skills\n\n| Skill | Status | Replaces (v0.42.0) |\n|---|---|---|\n${skills}\n\n## Retired without a skill\n\n| Source (v0.42.0) | Destination |\n|---|---|\n${ret}\n`,
    );
  }

  /** @param {Record<string, string[]>} skills */
  function baseline(skills) {
    const parts = Object.entries(skills).map(([n, hs]) => `## \`${n}\`\n\n${hs.map((h) => `- \`${h}\``).join("\n")}\n`);
    write(path.join(REFS, "baseline-sections.md"), `# Baseline\n\n${parts.join("\n")}`);
  }

  /** @param {string} name @param {string} [text] */
  function skill(name, text) {
    write(path.join(".agents", "skills", name, "SKILL.md"), text || skillText(name));
  }

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "validate-skills-"));
    skill("router", "---\nname: router\ndescription: old\n---\n# router\n## Old\n");
    skill("old-skill", "---\nname: old-skill\ndescription: old\n---\n# old\n## Purpose\n## How\n");
    baseline({ router: ["## Old"], "old-skill": ["## Purpose", "## How"] });
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  test("legacy-only tree passes", () => {
    catalog([["router", "planned", "`router`"], ["spec-new", "planned", "`old-skill`"]]);
    const result = validateSkills(root);
    assert.deepEqual(result.errors, []);
    assert.equal(result.legacy, 2);
  });

  test("rejects a folder that is neither baseline nor catalogued", () => {
    catalog([["router", "planned", "`router`"]], [["old-skill", "deleted"]]);
    skill("exotic");
    assert.match(validateSkills(root).errors.join("\n"), /exotic: not in catalog/);
  });

  test("rejects a new folder whose row is still planned", () => {
    catalog([["router", "planned", "`router`"], ["meta-new", "planned", "`old-skill`"]]);
    skill("meta-new");
    assert.match(validateSkills(root).errors.join("\n"), /meta-new: folder exists but catalog status is "planned"/);
  });

  test("rejects a baseline skill the catalog does not account for", () => {
    catalog([["router", "planned", "`router`"]]);
    assert.match(validateSkills(root).errors.join("\n"), /old-skill: v0.42.0 skill has no replacement/);
  });

  test("a well-formed built skill with a complete port map passes", () => {
    catalog([["router", "planned", "`router`"], ["meta-new", "built", "`old-skill`"]]);
    skill("meta-new");
    write(
      ".agents/skills/meta-new/references/PORT_MAP.md",
      "| Source | Section | Status | Where |\n|---|---|---|---|\n| `old-skill` | ## Purpose | kept | Purpose |\n| `old-skill` | ## How | dropped | covered by rule X |\n",
    );
    assert.deepEqual(validateSkills(root).errors, []);
  });

  test("port map: missing file, bad status, dropped without reason, uncovered heading", () => {
    catalog([["router", "planned", "`router`"], ["meta-new", "built", "`old-skill`"]]);
    skill("meta-new");
    assert.match(validateSkills(root).errors.join("\n"), /PORT_MAP.md required/);
    write(
      ".agents/skills/meta-new/references/PORT_MAP.md",
      "| Source | Section | Status | Where |\n|---|---|---|---|\n| `old-skill` | ## Purpose | lost | x |\n| `old-skill` | ## Other | dropped |  |\n",
    );
    const errors = validateSkills(root).errors.join("\n");
    assert.match(errors, /has status "lost"/);
    assert.match(errors, /dropped "## Other" needs a reason/);
    assert.match(errors, /old-skill: port maps miss 1 heading\(s\): how/);
  });

  test("structure: name, description, section order, edges", () => {
    catalog([["router", "planned", "`router`"], ["meta-new", "built", "—"]], [["old-skill", "deleted"]]);
    skill("meta-new", skillText("meta-other", { description: "No trigger here.", sections: ["Steps", "Edges", "Examples", "Output", "Not for"] }));
    const errors = validateSkills(root).errors.join("\n");
    assert.match(errors, /frontmatter name "meta-other"/);
    assert.match(errors, /lacks "Use when"/);
    assert.match(errors, /sections out of order/);
    skill("meta-new", skillText("meta-new", { sections: ["Edges", "Steps"] }));
    assert.match(validateSkills(root).errors.join("\n"), /missing sections Examples, Output, Not for/);
  });

  test("reciprocity between built skills", () => {
    catalog([["router", "planned", "`router`"], ["meta-a", "built", "—"], ["meta-b", "built", "—"]], [["old-skill", "deleted"]]);
    skill("meta-a", skillText("meta-a", { calls: "if x → [`meta-b`](../meta-b/SKILL.md)" }));
    skill("meta-b");
    assert.match(validateSkills(root).errors.join("\n"), /meta-a calls meta-b, but meta-b § Called by does not list meta-a/);
    skill("meta-b", skillText("meta-b", { calledBy: "[`meta-a`](../meta-a/SKILL.md)" }));
    assert.deepEqual(validateSkills(root).errors, []);
  });

  test("specialist threshold and loop evals", () => {
    catalog(
      [["router", "planned", "`router`"], ["spec-x", "built", "—"], ["loop-y", "built", "—"]],
      [["old-skill", "deleted"]],
    );
    skill("spec-x", skillText("spec-x", { calledBy: "[`loop-y`](../loop-y/SKILL.md)" }));
    skill("loop-y", skillText("loop-y", { calls: "if z → [`spec-x`](../spec-x/SKILL.md)" }));
    const errors = validateSkills(root).errors.join("\n");
    assert.match(errors, /spec-x: a specialist needs ≥ 2 loop callers/);
    assert.match(errors, /loop-y: loop skills need evals/);
    write(".agents/skills/loop-y/evals/basic-case/prompt.md", "---\nmax_turns: 5\n---\n\nDo it");
    assert.doesNotMatch(validateSkills(root).errors.join("\n"), /loop-y: loop skills need evals/);
  });

  test("headings skips code fences; frontmatter folds >- blocks", () => {
    assert.deepEqual(headings("## A\n```\n## Not\n```\n### B"), ["## A", "### B"]);
    assert.equal(frontmatter("---\nname: x\ndescription: >-\n  one\n  two\n---").description, "one two");
  });
});
