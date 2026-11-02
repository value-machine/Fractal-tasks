// Vendors the sync script, writes agent-sync.config.json, runs the sync and wires the pre-commit hook (D5, D6, D11, D16).
import {readFileSync} from 'node:fs';

import {main as runSyncScript} from '../../templates/sync-agent-config.mjs';
import {exists, readText} from '../lib/fs-utils.mjs';
import {SYNC_CONFIG, SYNC_SCRIPT} from '../inventory/environment.mjs';
const HOOK_MARKER = 'sync-agent-config.mjs --staged';
const HOOK_BLOCK = [
  '# cursor-migration: rebuild generated agent-config mirrors from staged files (see agent-sync.config.json).',
  '# Fails open; CI and pre-push run `node scripts/sync-agent-config.mjs --check` strictly.',
  'if command -v node >/dev/null 2>&1; then',
  '  node scripts/sync-agent-config.mjs --staged || true',
  'else',
  '  echo "pre-commit: node not found; .claude/skills not synced (install Node, then run node scripts/sync-agent-config.mjs)"',
  'fi',
  '',
].join('\n');

function desiredMirrors(keepCursor) {
  const mirrors = [{kind: 'skills', source: '.agents/skills', target: '.claude/skills'}];
  if (keepCursor) mirrors.push({kind: 'cursor-rules', source: '.claude/rules', target: '.cursor/rules'});
  return mirrors;
}

/** Adds missing mirrors to an existing config; never removes the repo's own entries. */
function writeSyncConfig(rec, root, keepCursor) {
  const current = exists(root, SYNC_CONFIG) ? JSON.parse(readText(root, SYNC_CONFIG)) : {version: 1, mirrors: []};
  const has = mirror => current.mirrors.some(m => m.kind === mirror.kind && m.target === mirror.target);
  const mirrors = [...current.mirrors, ...desiredMirrors(keepCursor).filter(mirror => !has(mirror))];
  const lines = mirrors.map(m => `    {"kind": "${m.kind}", "source": "${m.source}", "target": "${m.target}"}`);
  rec.write(SYNC_CONFIG, `{\n  "version": 1,\n  "mirrors": [\n${lines.join(',\n')}\n  ]\n}\n`);
}

export function vendorSyncScript(rec, root, inventory, templatePath) {
  const {status} = inventory.environment.syncScript;
  if (status === 'edited') return [{path: SYNC_SCRIPT, reason: 'locally edited: compare with the plugin template and upgrade by hand'}];
  rec.write(SYNC_SCRIPT, readFileSync(templatePath));
  return [];
}

/** Writes config, runs the sync in working-tree mode and records the mirror files it touched. */
export function runSync(rec, root, keepCursor) {
  writeSyncConfig(rec, root, keepCursor);
  const captures = desiredMirrors(keepCursor).map(mirror => rec.captureDir(mirror.target));
  const code = runSyncScript([], root);
  for (const capture of captures) capture.reconcile();
  if (code !== 0) throw new Error(`sync-agent-config exited with ${code}`);
}

function hookFile(root, hooks) {
  if (hooks.manager === 'husky') return '.husky/pre-commit';
  if (hooks.hooksPath && !hooks.hooksPath.startsWith('.husky')) return `${hooks.hooksPath.replace(/\/$/, '')}/pre-commit`;
  return '.git/hooks/pre-commit';
}

// YAML is edited by hand (no parser, D13): the pending row carries the exact snippet to add.
const LEFTHOOK_SNIPPET = [
  'pre-commit:',
  '  commands:',
  '    agent-sync:',
  '      run: node scripts/sync-agent-config.mjs --staged',
].join('\n');
// The pre-commit framework fails a hook that changes files, so this step syncs the working tree
// and fails the commit until the updated mirror is staged (D16 fail-on-change).
const PRE_COMMIT_SNIPPET = [
  '- repo: local',
  '  hooks:',
  '    - id: agent-sync',
  '      name: sync .claude/skills from .agents/skills',
  '      entry: node scripts/sync-agent-config.mjs',
  '      language: system',
  '      pass_filenames: false',
].join('\n');

/** Adds the sync to the pre-commit hook. lefthook and the pre-commit framework get a pending row with a snippet. */
export function wireHook(rec, root, hooks) {
  if (hooks.manager === 'lefthook') {
    const file = exists(root, 'lefthook.yml') ? 'lefthook.yml' : '.lefthook.yml';
    return [{path: file, reason: `add the sync command (merge into an existing pre-commit block):\n${LEFTHOOK_SNIPPET}`}];
  }
  if (hooks.manager === 'pre-commit') {
    return [{path: '.pre-commit-config.yaml', reason: `add this entry under repos: (fails the commit until the updated mirror is staged):\n${PRE_COMMIT_SNIPPET}`}];
  }
  const file = hookFile(root, hooks);
  const current = exists(root, file) ? readText(root, file) : '';
  if (current.includes(HOOK_MARKER)) return [];
  const shebang = /^#!.*\n/.exec(current);
  const head = shebang ? shebang[0] : file.startsWith('.husky/') ? '' : '#!/bin/sh\n';
  rec.write(file, `${head}${HOOK_BLOCK}\n${current.slice(shebang ? shebang[0].length : 0)}`);
  return file.startsWith('.git/') ? [{path: file, reason: 'hook lives in .git/hooks: not shared; teammates need a hook manager or this file'}] : [];
}
