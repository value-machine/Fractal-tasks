// Read-only filesystem helpers. All paths in and out are repo-relative POSIX paths.
import {createHash} from 'node:crypto';
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

/** Directories never scanned (build output, dependencies, caches). */
export const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.pnpm-store',
  '.next',
  '.turbo',
  '.firebase',
  'artifacts',
]);

export function toAbs(root, rel) {
  return rel === '.' || rel === '' ? root : join(root, ...rel.split('/'));
}

export function exists(root, rel) {
  return existsSync(toAbs(root, rel));
}

export function isDir(root, rel) {
  return exists(root, rel) && statSync(toAbs(root, rel)).isDirectory();
}

export function readText(root, rel) {
  return readFileSync(toAbs(root, rel), 'utf8');
}

export function readBytes(root, rel) {
  return readFileSync(toAbs(root, rel));
}

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/** True when the buffer looks like text (no NUL in the first 8 KB). */
export function looksLikeText(buffer) {
  return !buffer.subarray(0, 8192).includes(0);
}

/** Sorted repo-relative paths of regular files under `rel`. Symlinks and SKIP_DIRS are skipped. */
export function listFiles(root, rel, {skipDirs = SKIP_DIRS} = {}) {
  if (!isDir(root, rel)) return [];
  const out = [];
  const walk = (dirAbs, dirRel) => {
    for (const entry of readdirSync(dirAbs, {withFileTypes: true})) {
      if (entry.isSymbolicLink()) continue;
      const childRel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) walk(join(dirAbs, entry.name), childRel);
      } else if (entry.isFile()) {
        out.push(childRel);
      }
    }
  };
  walk(toAbs(root, rel), rel === '.' ? '' : rel);
  return out.sort();
}

/** Sorted names of immediate subdirectories of `rel` (symlinks skipped). */
export function listDirs(root, rel) {
  if (!isDir(root, rel)) return [];
  return readdirSync(toAbs(root, rel), {withFileTypes: true})
    .filter(entry => entry.isDirectory() && !entry.isSymbolicLink())
    .map(entry => entry.name)
    .sort();
}
