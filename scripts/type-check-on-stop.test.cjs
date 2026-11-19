const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { parseChangedPaths, run } = require("./type-check-on-stop.cjs");

const hookInput = JSON.stringify({
  hook_event_name: "Stop",
  cwd: "/repo",
  stop_hook_active: false,
});

/**
 * @param {string} porcelain git status -z output
 * @param {string} diff git diff HEAD output (changes the fingerprint)
 */
const fakeGit =
  (porcelain, diff = "d1") =>
  (args) => {
    const key = args.join(" ");
    if (key === "rev-parse --show-toplevel") return { status: 0, stdout: "/repo\n" };
    if (key === "rev-parse --absolute-git-dir") return { status: 0, stdout: "/repo/.git\n" };
    if (key === "rev-parse HEAD") return { status: 0, stdout: "abc\n" };
    if (key === "diff HEAD") return { status: 0, stdout: diff };
    if (args[0] === "status") return { status: 0, stdout: porcelain };
    return { status: 1, stdout: "" };
  };

/** In-memory state + type-check stub that counts runs. */
const harness = (git, tscStatus) => {
  let state = {};
  let runs = 0;
  return {
    deps: {
      runGit: git,
      runTypeCheck: () => {
        runs++;
        return { status: tscStatus, output: "src/a.ts(1,7): error TS2322: nope\n" };
      },
      loadState: () => state,
      saveState: (_f, s) => (state = s),
    },
    runs: () => runs,
  };
};

const TS_CHANGE = " M src/a.ts\0";

describe("type-check-on-stop", () => {
  test("should block with the tsc errors when type-check fails on changed TypeScript", () => {
    const h = harness(fakeGit(TS_CHANGE), 2);
    const res = run(hookInput, h.deps);
    assert.equal(res.block, true);
    assert.match(res.reason, /error TS2322/);
  });

  test("should allow the stop when type-check passes", () => {
    const h = harness(fakeGit(TS_CHANGE), 0);
    assert.equal(run(hookInput, h.deps).block, false);
    assert.equal(h.runs(), 1);
  });

  test("should skip type-check when no TypeScript file changed", () => {
    const h = harness(fakeGit(" M README.md\0?? docs/x.md\0"), 2);
    assert.equal(run(hookInput, h.deps).skipped, "no TypeScript changes");
    assert.equal(h.runs(), 0);
  });

  test("should run type-check when a tsconfig file changed", () => {
    const h = harness(fakeGit(" M tsconfig.app.json\0"), 0);
    run(hookInput, h.deps);
    assert.equal(h.runs(), 1);
  });

  test("should not re-run type-check when the tree is unchanged since it passed", () => {
    const h = harness(fakeGit(TS_CHANGE), 0);
    run(hookInput, h.deps);
    assert.equal(run(hookInput, h.deps).skipped, "unchanged since pass");
    assert.equal(h.runs(), 1);
  });

  test("should block only once when the same failing tree stops again", () => {
    const h = harness(fakeGit(TS_CHANGE), 2);
    assert.equal(run(hookInput, h.deps).block, true);
    const again = run(hookInput, h.deps);
    assert.equal(again.block, false);
    assert.equal(again.skipped, "already reported");
  });

  test("should block again when the tree changed and still fails", () => {
    let diff = "d1";
    const git = (args) => fakeGit(TS_CHANGE, diff)(args);
    const h = harness(git, 2);
    assert.equal(run(hookInput, h.deps).block, true);
    diff = "d2";
    assert.equal(run(hookInput, h.deps).block, true);
  });

  test("should allow the stop when type-check cannot run", () => {
    const h = harness(fakeGit(TS_CHANGE), 0);
    h.deps.runTypeCheck = () => null;
    assert.equal(run(hookInput, h.deps).skipped, "type-check unavailable");
  });

  test("should allow the stop when the cwd is not a git tree or input is unreadable", () => {
    assert.equal(run("not json").block, false);
    const noGit = () => ({ status: 128, stdout: "" });
    assert.equal(run(hookInput, { runGit: noGit }).skipped, "not a git tree");
  });

  test("should list rename targets but not sources when parsing porcelain -z output", () => {
    assert.deepEqual(parseChangedPaths("R  src/new.ts\0src/old.ts\0?? src/b.tsx\0"), [
      "src/new.ts",
      "src/b.tsx",
    ]);
  });
});
