const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { findLintRoot, resolveEditedFile, run } = require("./lint-edited-file.cjs");

const ROOT = path.resolve("/repo");
const FILE = path.join(ROOT, "src", "a.ts");

const hookInput = (filePath, toolName = "Edit") =>
  JSON.stringify({
    hook_event_name: "PostToolUse",
    tool_name: toolName,
    tool_input: { file_path: filePath },
  });

const deps = (outcome) => ({ findRoot: () => ROOT, lint: async () => outcome });

describe("lint-edited-file", () => {
  test("should report errors on stderr with exit 2 when the edited file has lint errors", async () => {
    const res = await run(
      hookInput(FILE),
      deps({
        errors: [{ line: 3, column: 7, ruleId: "no-var", message: "Unexpected var." }],
        fixed: false,
      })
    );
    assert.equal(res.exitCode, 2);
    assert.match(res.stderr, /src\/a\.ts:3:7 Unexpected var\. \(no-var\)/);
  });

  test("should cap the reported errors when there are many", async () => {
    const errors = Array.from({ length: 25 }, (_, i) => ({
      line: i + 1,
      column: 1,
      ruleId: "x",
      message: "m",
    }));
    const res = await run(hookInput(FILE), deps({ errors, fixed: false }));
    assert.match(res.stderr, /… and 5 more/);
  });

  test("should return additional context when the fix pass rewrote the file", async () => {
    const res = await run(hookInput(FILE, "Write"), deps({ errors: [], fixed: true }));
    assert.equal(res.exitCode, 0);
    const out = JSON.parse(res.stdout);
    assert.equal(out.hookSpecificOutput.hookEventName, "PostToolUse");
    assert.match(out.hookSpecificOutput.additionalContext, /reformatted src\/a\.ts; re-read it/);
  });

  test("should stay silent when the edited file is clean", async () => {
    assert.deepEqual(await run(hookInput(FILE), deps({ errors: [], fixed: false })), {
      exitCode: 0,
    });
  });

  test("should skip non-TypeScript files without linting", async () => {
    let called = false;
    const res = await run(hookInput(path.join(ROOT, "README.md")), {
      findRoot: () => ROOT,
      lint: async () => {
        called = true;
        return { errors: [], fixed: false };
      },
    });
    assert.equal(res.exitCode, 0);
    assert.equal(called, false);
  });

  test("should skip when stdin is empty or not JSON", async () => {
    assert.equal((await run("", deps({ errors: [], fixed: false }))).exitCode, 0);
    assert.equal(resolveEditedFile(null), null);
  });

  test("should skip relative paths when the input is malformed", () => {
    assert.equal(resolveEditedFile({ tool_input: { file_path: "src/a.ts" } }), null);
  });

  test("should find the nearest directory with eslint.config.js when walking up from the file", () => {
    const exists = (p) => p === path.join(ROOT, "eslint.config.js");
    assert.equal(findLintRoot(FILE, exists), ROOT);
    assert.equal(
      findLintRoot(FILE, () => false),
      null
    );
  });
});
