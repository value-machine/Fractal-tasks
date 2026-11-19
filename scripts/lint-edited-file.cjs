#!/usr/bin/env node
/**
 * Claude Code PostToolUse (Edit|Write|MultiEdit) hook: run `eslint --fix` on the one file the
 * agent just edited and hand the remaining errors back in the same tool round, instead of at
 * pre-commit (lint-staged runs the same `eslint --fix` on `*.{ts,tsx}`).
 *
 * Formatting rides along: the ESLint config includes `prettier/prettier` (via GTS), so the fix
 * pass also applies Prettier. Scope matches lint-staged: `.ts` / `.tsx` files not ignored by
 * `eslint.ignores.js`. Warnings stay silent (code-style rule: warnings are acceptable).
 *
 * Why the Node API: no `pnpm` / `.cmd` shim spawn (Windows Git Bash) and no process startup per
 * edit. ESLint is resolved from the repo that owns the file, so worktree sessions lint with their
 * own dependencies.
 *
 * Contract: exit 2 + errors on stderr (Claude reads them; the edit already happened);
 * exit 0 + JSON `additionalContext` when the fix pass rewrote the file; exit 0 silent otherwise.
 * Fails open: any internal problem exits 0, so a broken lint setup never blocks editing.
 */

const fs = require("fs");
const path = require("path");
const { parseHookInput, readStdin } = require("./hook-input.cjs");

const LINTED_EXTENSIONS = new Set([".ts", ".tsx"]);
const ESLINT_CONFIG = "eslint.config.js";
const MAX_REPORTED_ERRORS = 20;

/**
 * Walk up from the file to the directory holding the ESLint config (the repo or worktree root).
 * @param {string} filePath absolute
 * @param {(p: string) => boolean} [exists]
 * @returns {string | null}
 */
function findLintRoot(filePath, exists = fs.existsSync) {
  let dir = path.dirname(filePath);
  for (;;) {
    if (exists(path.join(dir, ESLINT_CONFIG))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * @param {Record<string, any> | null} input
 * @returns {string | null} absolute path of a lintable edited file
 */
function resolveEditedFile(input) {
  const filePath = input && input.tool_input && input.tool_input.file_path;
  if (typeof filePath !== "string" || !path.isAbsolute(filePath)) return null;
  return LINTED_EXTENSIONS.has(path.extname(filePath)) ? filePath : null;
}

/**
 * @typedef {{line: number, column: number, ruleId: string | null, message: string}} LintError
 * @typedef {{errors: LintError[], fixed: boolean}} LintOutcome
 */

/**
 * @param {string} filePath
 * @param {string} root
 * @returns {Promise<LintOutcome>}
 */
async function lintWithEslint(filePath, root) {
  const { ESLint } = require(require.resolve("eslint", { paths: [root] }));
  const eslint = new ESLint({
    cwd: root,
    fix: true,
    cache: true,
    cacheLocation: path.join(root, ".eslintcache"),
  });
  if (await eslint.isPathIgnored(filePath)) return { errors: [], fixed: false };
  const results = await eslint.lintFiles([filePath]);
  await ESLint.outputFixes(results);
  const errors = results.flatMap((r) => r.messages.filter((m) => m.severity === 2));
  return { errors, fixed: results.some((r) => typeof r.output === "string") };
}

/**
 * @param {string} relPath
 * @param {LintError[]} errors
 * @returns {string}
 */
function formatErrors(relPath, errors) {
  const shown = errors.slice(0, MAX_REPORTED_ERRORS).map((e) => {
    const rule = e.ruleId ? ` (${e.ruleId})` : "";
    return `${relPath}:${e.line}:${e.column} ${e.message}${rule}`;
  });
  const more = errors.length - shown.length;
  if (more > 0) shown.push(`… and ${more} more`);
  return `ESLint errors after edit (eslint --fix already applied):\n${shown.join("\n")}\n`;
}

/**
 * @param {string} raw stdin text
 * @param {{lint?: (file: string, root: string) => Promise<LintOutcome>, findRoot?: (file: string) => string | null}} [deps]
 * @returns {Promise<{exitCode: number, stderr?: string, stdout?: string}>}
 */
async function run(raw, deps = {}) {
  const filePath = resolveEditedFile(parseHookInput(raw));
  if (!filePath) return { exitCode: 0 };
  const root = (deps.findRoot || findLintRoot)(filePath);
  if (!root) return { exitCode: 0 };

  const outcome = await (deps.lint || lintWithEslint)(filePath, root);
  const relPath = path.relative(root, filePath).split(path.sep).join("/");
  if (outcome.errors.length > 0) {
    return { exitCode: 2, stderr: formatErrors(relPath, outcome.errors) };
  }
  if (!outcome.fixed) return { exitCode: 0 };
  const note = `eslint --fix reformatted ${relPath}; re-read it before the next edit.`;
  return {
    exitCode: 0,
    stdout: JSON.stringify({
      hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: note },
    }),
  };
}

if (require.main === module) {
  void readStdin()
    .then((raw) => run(raw))
    .catch(() => ({ exitCode: 0 }))
    .then((result) => {
      if (result.stderr) process.stderr.write(result.stderr);
      if (result.stdout) process.stdout.write(result.stdout);
      process.exit(result.exitCode);
    });
}

module.exports = { findLintRoot, resolveEditedFile, formatErrors, run };
