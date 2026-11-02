// Every write and delete during apply goes through the recorder. It backs up original bytes under
// .git/cursor-migration/backup/ before the first change to a path, so undo is exact even for
// untracked or dirty files, without relying on git.
import {existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, unlinkSync, writeFileSync} from 'node:fs';
import {dirname, join, sep} from 'node:path';

import {assertSafeRelPath} from '../../templates/sync-agent-config.mjs';
import {listFiles, toAbs} from '../lib/fs-utils.mjs';

function removeEmptyDirs(root, rel) {
  let dir = dirname(toAbs(root, rel));
  while (dir.startsWith(root + sep) && existsSync(dir) && readdirSync(dir).length === 0) {
    rmdirSync(dir);
    dir = dirname(dir);
  }
}

/**
 * @param {string} root repo root
 * @param {string} stateDir .git/cursor-migration
 */
export function createRecorder(root, stateDir) {
  const changes = new Map();
  const backupDir = join(stateDir, 'backup');

  function backup(rel) {
    if (changes.has(rel)) return;
    const abs = toAbs(root, rel);
    if (existsSync(abs)) {
      const target = join(backupDir, ...rel.split('/'));
      mkdirSync(dirname(target), {recursive: true});
      writeFileSync(target, readFileSync(abs));
      changes.set(rel, 'modified');
    } else {
      changes.set(rel, 'created');
    }
  }

  function settle(rel, nowExists) {
    const first = changes.get(rel);
    if (first === 'created' && !nowExists) changes.delete(rel);
    else if (first !== 'created') changes.set(rel, nowExists ? 'modified' : 'deleted');
  }

  return {
    /** Writes `content` to `rel` when it differs. Returns true when the file changed. */
    write(rel, content) {
      assertSafeRelPath(rel);
      const abs = toAbs(root, rel);
      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
      if (existsSync(abs) && readFileSync(abs).equals(buffer)) return false;
      backup(rel);
      mkdirSync(dirname(abs), {recursive: true});
      writeFileSync(abs, buffer);
      settle(rel, true);
      return true;
    },

    remove(rel) {
      assertSafeRelPath(rel);
      const abs = toAbs(root, rel);
      if (!existsSync(abs)) return false;
      backup(rel);
      unlinkSync(abs);
      removeEmptyDirs(root, rel);
      settle(rel, false);
      return true;
    },

    /** Snapshot a directory before another tool (the sync script) writes into it. */
    captureDir(rel) {
      const before = new Map(listFiles(root, rel).map(path => [path, readFileSync(toAbs(root, path))]));
      return {
        reconcile: () => {
          const after = new Set(listFiles(root, rel));
          for (const [path, bytes] of before) {
            const changed = !after.has(path) || !readFileSync(toAbs(root, path)).equals(bytes);
            if (changed && !changes.has(path)) {
              const target = join(backupDir, ...path.split('/'));
              mkdirSync(dirname(target), {recursive: true});
              writeFileSync(target, bytes);
              changes.set(path, after.has(path) ? 'modified' : 'deleted');
            }
          }
          for (const path of after) if (!before.has(path) && !changes.has(path)) changes.set(path, 'created');
        },
      };
    },

    list() {
      return [...changes].map(([path, change]) => ({path, change})).sort((a, b) => a.path.localeCompare(b.path));
    },
  };
}

/** Restores every recorded change: deletes created files, writes backups back. */
export function undoChanges(root, stateDir, changes) {
  const backupDir = join(stateDir, 'backup');
  for (const {path, change} of changes) {
    const abs = toAbs(root, path);
    if (change === 'created') {
      if (existsSync(abs)) unlinkSync(abs);
      removeEmptyDirs(root, path);
    } else {
      mkdirSync(dirname(abs), {recursive: true});
      writeFileSync(abs, readFileSync(join(backupDir, ...path.split('/'))));
    }
  }
}
