// Read-only git helpers. Each returns null instead of throwing when git fails.
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';

export function git(root, args) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

export function repoRoot(cwd) {
  const top = git(cwd, ['rev-parse', '--show-toplevel']);
  return top ? resolve(top) : null;
}

export function gitDir(root) {
  const dir = git(root, ['rev-parse', '--git-dir']);
  return dir ? resolve(root, dir) : null;
}

export function isTracked(root, rel) {
  return Boolean(git(root, ['ls-files', '--', rel]));
}

/** True when `rel` appears in any commit on any ref. */
export function everCommitted(root, rel) {
  return Boolean(git(root, ['log', '--all', '--format=%H', '-n', '1', '--', rel]));
}

/** True when the working tree has no staged, unstaged or untracked changes. */
export function isClean(root) {
  return git(root, ['status', '--porcelain']) === '';
}

export function gitVersion(root) {
  const out = git(root, ['--version']);
  return out ? out.replace(/^git version\s*/, '') : null;
}

export function configValue(root, key) {
  return git(root, ['config', '--get', key]) || null;
}
