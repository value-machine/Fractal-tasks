// Repo environment: hook manager, tool versions, vendored sync script state, nested configs, exclusions.
import {readdirSync} from 'node:fs';

import {exists, listFiles, readBytes, readText, SKIP_DIRS, sha256, toAbs} from '../lib/fs-utils.mjs';
import {configValue, gitVersion} from '../lib/git.mjs';

export const SYNC_SCRIPT = 'scripts/sync-agent-config.mjs';
export const SYNC_CONFIG = 'agent-sync.config.json';

/** Mirror target folders of an already migrated repo (empty before the first apply or when unreadable). */
export function readSyncTargets(root) {
  if (!exists(root, SYNC_CONFIG)) return [];
  try {
    return JSON.parse(readText(root, SYNC_CONFIG)).mirrors.map(mirror => mirror.target);
  } catch {
    return [];
  }
}

/** Paths never migrated, with the reason shown in the report. */
const EXCLUSIONS = [
  {path: '.cursor/plans', reason: 'Cursor plan-mode output; leave or archive'},
  {path: '.cursor/worktrees.json', reason: 'Cursor worktree setup; no Claude Code equivalent is migrated'},
  {path: '.cursor/config', reason: 'live config read by scripts; stays, not migrated'},
  {path: '.cursor/commands/archive', reason: 'archived commands'},
  {path: '.cursor/hooks.json', reason: 'Cursor hooks; port by hand to .claude/settings.json hooks'},
  {path: '.cursorignore', reason: 'Cursor ignore file; Claude Code uses permissions.deny'},
];

const NESTED_SKIP = new Set(['documentation', 'plugins', '.claude', '.agents', '.cursor']);

export function detectHookManager(root) {
  let manager = 'none';
  if (exists(root, '.husky')) manager = 'husky';
  else if (exists(root, 'lefthook.yml') || exists(root, '.lefthook.yml')) manager = 'lefthook';
  else if (exists(root, '.pre-commit-config.yaml')) manager = 'pre-commit';
  return {manager, hooksPath: configValue(root, 'core.hooksPath')};
}

/** missing | current | edited | outdated, compared with the plugin's template. */
export function syncScriptState(root, templateBuffer) {
  const templateVersion = /sync-agent-config v(\d+\.\d+\.\d+)/.exec(templateBuffer.toString('utf8'))[1];
  if (!exists(root, SYNC_SCRIPT)) {
    return {path: SYNC_SCRIPT, status: 'missing', version: null, templateVersion};
  }
  const buffer = readBytes(root, SYNC_SCRIPT);
  const stamp = /sync-agent-config v(\d+\.\d+\.\d+)/.exec(buffer.toString('utf8'));
  const version = stamp ? stamp[1] : null;
  let status = 'outdated';
  if (sha256(buffer) === sha256(templateBuffer)) status = 'current';
  else if (version === templateVersion) status = 'edited';
  return {path: SYNC_SCRIPT, status, version, templateVersion};
}

/** Cursor configs or AGENTS.md files below the repo root (reported, not converted, in v1). */
export function findNestedConfigs(root) {
  const found = [];
  const walk = rel => {
    for (const entry of readdirSync(toAbs(root, rel), {withFileTypes: true})) {
      if (entry.isSymbolicLink()) continue;
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      const nested = rel !== '';
      if (entry.isDirectory()) {
        if (nested && entry.name === '.cursor') found.push(child);
        else if (!SKIP_DIRS.has(entry.name) && !(rel === '' && NESTED_SKIP.has(entry.name))) walk(child);
      } else if (nested && ['AGENTS.md', '.cursorrules', 'CLAUDE.md'].includes(entry.name)) {
        found.push(child);
      }
    }
  };
  walk('');
  return found.sort();
}

export function listExclusions(root) {
  const present = EXCLUSIONS.filter(item => exists(root, item.path));
  const logs = listFiles(root, '.cursor').filter(path => /^\.cursor\/debug[^/]*\.log$/.test(path));
  if (logs.length > 0) {
    present.push({path: '.cursor/debug*.log', reason: `${logs.length} Cursor debug log(s); may hold sensitive output, never migrated`});
  }
  return present;
}

export function toolVersions(root) {
  return {node: process.version, git: gitVersion(root)};
}
