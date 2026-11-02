// Shared test helper: builds throwaway git repos from a file map and snapshots their trees.
// Fixtures are file maps (not checked-in folders) so Cursor/Claude never load fixture
// .cursor/.agents/.claude folders as real config for this repo.
import {execFileSync} from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, sep} from 'node:path';

/** Repo-relative path with forward slashes, for stable snapshots on Windows. */
export function toPosix(p) {
  return p.split(sep).join('/');
}

function git(dir, args) {
  return execFileSync('git', args, {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * Write a file map into a new temp dir, `git init` it and (by default) commit everything.
 * Values may be strings (written as-is, no EOL conversion) or Buffers (exact bytes).
 */
export function createFixtureRepo(files, {commit = true} = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cursor-migration-'));
  for (const [path, content] of Object.entries(files)) {
    const target = join(dir, ...path.split('/'));
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, content);
  }
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'fixture@example.test']);
  git(dir, ['config', 'user.name', 'fixture']);
  git(dir, ['config', 'core.autocrlf', 'false']);
  git(dir, ['config', 'core.hooksPath', '.git/no-hooks']);
  if (commit && Object.keys(files).length > 0) {
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'fixture']);
  }
  return {
    dir,
    git: args => git(dir, args),
    cleanup: () => rmSync(dir, {recursive: true, force: true}),
  };
}

/** Snapshot every file under `dir` (except `.git`) as { posixPath: Buffer }, sorted by path. */
export function readTree(dir, {ignore = ['.git']} = {}) {
  const out = {};
  const walk = current => {
    for (const entry of readdirSync(current, {withFileTypes: true})) {
      const full = join(current, entry.name);
      const rel = toPosix(relative(dir, full));
      if (ignore.some(i => rel === i || rel.startsWith(`${i}/`))) continue;
      if (entry.isDirectory()) walk(full);
      else out[rel] = readFileSync(full);
    }
  };
  walk(dir);
  return Object.fromEntries(
    Object.entries(out).sort(([a], [b]) => a.localeCompare(b)),
  );
}
