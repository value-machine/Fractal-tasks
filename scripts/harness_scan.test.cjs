const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SCANNER = path.join(
  ROOT,
  ".agents/skills/meta-audit-harness/scripts/harness_scan.cjs",
);

describe("harness_scan", () => {
  test("exits 0 and emits JSON with rule facts", () => {
    const out = execFileSync("node", [SCANNER], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const report = JSON.parse(out);
    assert.ok(Array.isArray(report.rules));
    assert.ok(report.rules.length >= 13);
    assert.equal(typeof report.alwaysOn.lineCount, "number");
    assert.ok(report.alwaysOn.lineCount > 0);
    assert.equal(typeof report.reachableCount, "number");
    assert.ok(report.reachableCount > 0);
  });

  test("should reach skills referenced after a fenced code block", () => {
    const out = execFileSync("node", [SCANNER], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const report = JSON.parse(out);
    // router/references/loop-map.md lists meta-compress-output only after its ``` fence; an unstripped
    // fence mis-pairs inline backticks and hides them as false orphans.
    assert.ok(!report.orphanCandidates.includes(".agents/skills/meta-compress-output/SKILL.md"));
    assert.ok(
      !report.orphanCandidates.includes(".agents/skills/loop-ship/SKILL.md"),
    );
  });

  test("loads manifest from entry-points.yaml", () => {
    const manifest = path.join(
      ROOT,
      "documentation/jobs/harness/entry-points.yaml",
    );
    assert.ok(fs.existsSync(manifest));
    const out = execFileSync("node", [SCANNER, manifest], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const report = JSON.parse(out);
    assert.match(report.manifest, /entry-points\.yaml$/);
  });
});
