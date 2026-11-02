#!/usr/bin/env node
// Applies an approved inventory (DEVELOPMENT_PLAN Phase 3). Run inventory.mjs first and review the report.
// Usage:
//   node apply.mjs [--root <repo>] [--allow-dirty] [--scope-rules=a,b]   apply .git/cursor-migration/inventory.json
//   node apply.mjs [--root <repo>] --undo                                 restore everything the last apply changed
// Every change is recorded in .git/cursor-migration/applied.json with byte backups for undo.
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {buildInventory, rewriteContext} from './inventory/build.mjs';
import {cursorAdapter} from './adapters/cursor.mjs';
import {gitDir, isClean, repoRoot} from './lib/git.mjs';
import {migrateInstructions} from './apply/instructions.mjs';
import {migrateMcp} from './apply/mcp.mjs';
import {cursorSkillTarget, migrateCommands, migrateCursorSkills, migrateRules, rewriteReferences} from './apply/migrate.mjs';
import {createRecorder, undoChanges} from './apply/recorder.mjs';
import {runSync, vendorSyncScript, wireHook} from './apply/sync.mjs';

export const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'sync-agent-config.mjs');

function stateDirOf(root) {
  return join(gitDir(root), 'cursor-migration');
}

function loadInventory(stateDir) {
  const file = join(stateDir, 'inventory.json');
  if (!existsSync(file)) throw new Error('no inventory: run inventory.mjs and review the report first');
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** Refuses when the repo changed after the report was generated (like a stale `terraform plan`). */
function assertFresh(root, inventory) {
  const fresh = buildInventory(root, {
    keepCursor: inventory.keepCursor,
    templatePath: TEMPLATE,
    excludes: inventory.excludes || [],
  });
  if (JSON.stringify(fresh.sourceHashes) !== JSON.stringify(inventory.sourceHashes)) {
    throw new Error('sources changed since the report was generated: run inventory.mjs again and review');
  }
}

function cursorSkillFiles(root) {
  return new Map(cursorAdapter.readSkills(root).skills.map(skill => [skill.name, skill.files]));
}

/** Old path → new path for every file apply moves, so relative links between moved files stay valid. */
function plannedMoves(inventory, skillFiles) {
  const moves = new Map(inventory.rules.map(rule => [rule.source, rule.target]));
  for (const command of inventory.commands) {
    if (command.alreadyMigratedAs.length === 0) moves.set(command.source, command.target);
  }
  for (const skill of inventory.cursorSkills.filter(row => row.action === 'move to .agents/skills')) {
    for (const file of skillFiles.get(skill.name) || []) {
      moves.set(file, cursorSkillTarget(file));
    }
  }
  return moves;
}

function migrationContext(root, inventory, skillFiles) {
  const skillNames = [...inventory.agentsSkills.map(s => s.name), ...inventory.cursorSkills.map(s => s.name)];
  const ctx = rewriteContext(root, {rules: inventory.rules, commands: inventory.commands, skillNames});
  return {...ctx, moves: plannedMoves(inventory, skillFiles)};
}

function applySteps(rec, root, inventory, scopeRules) {
  const skillFiles = cursorSkillFiles(root);
  const ctx = migrationContext(root, inventory, skillFiles);
  return [
    ...migrateRules(rec, root, inventory, ctx, {scopeRules}),
    ...migrateCommands(rec, root, inventory, ctx),
    ...migrateCursorSkills(rec, root, inventory, ctx, skillFiles),
    ...(rewriteReferences(rec, root, inventory, ctx) || []),
    ...migrateMcp(rec, root, inventory),
    ...migrateInstructions(rec, root, inventory),
    ...vendorSyncScript(rec, root, inventory, TEMPLATE),
  ];
}

/** Applies the inventory. Returns {changes, pending, appliedPath}. */
export function runApply({root, allowDirty = false, scopeRules = []}) {
  const top = repoRoot(resolve(root));
  if (!top) throw new Error(`not a git repository: ${root}`);
  if (!allowDirty && !isClean(top)) throw new Error('working tree has changes: commit or stash first (or pass --allow-dirty)');
  const stateDir = stateDirOf(top);
  const inventory = loadInventory(stateDir);
  assertFresh(top, inventory);
  rmSync(join(stateDir, 'backup'), {recursive: true, force: true});
  const rec = createRecorder(top, stateDir);
  const pending = applySteps(rec, top, inventory, new Set(scopeRules));
  runSync(rec, top, inventory.keepCursor);
  pending.push(...wireHook(rec, top, inventory.environment.hooks));
  const applied = {
    generator: inventory.generator,
    excludes: inventory.excludes || [],
    changes: rec.list(),
    pending,
    judgment: inventory.judgment,
    undo: `node ${TEMPLATE.replace(/templates[\\/]sync-agent-config\.mjs$/, 'scripts/apply.mjs').replace(/\\/g, '/')} --undo`,
  };
  const appliedPath = join(stateDir, 'applied.json');
  mkdirSync(stateDir, {recursive: true});
  writeFileSync(appliedPath, JSON.stringify(applied, null, 2) + '\n');
  return {...applied, appliedPath};
}

/** Restores every change the last apply recorded. */
export function runUndo({root}) {
  const top = repoRoot(resolve(root));
  const stateDir = stateDirOf(top);
  const appliedPath = join(stateDir, 'applied.json');
  if (!existsSync(appliedPath)) throw new Error('nothing to undo: no applied.json');
  const applied = JSON.parse(readFileSync(appliedPath, 'utf8'));
  undoChanges(top, stateDir, applied.changes);
  rmSync(appliedPath);
  return applied.changes.length;
}

export function parseArgs(argv) {
  const options = {root: process.cwd(), allowDirty: false, scopeRules: [], undo: false};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--root') options.root = argv[++i];
    else if (arg === '--allow-dirty') options.allowDirty = true;
    else if (arg === '--undo') options.undo = true;
    else if (arg.startsWith('--scope-rules=')) options.scopeRules = arg.split('=')[1].split(',').filter(Boolean);
  }
  return options;
}

function main(argv) {
  try {
    const options = parseArgs(argv);
    if (options.undo) {
      console.log(`[cursor-migration] restored ${runUndo(options)} path(s)`);
      return 0;
    }
    const result = runApply(options);
    const count = change => result.changes.filter(c => c.change === change).length;
    console.log(`[cursor-migration] created ${count('created')}, modified ${count('modified')}, deleted ${count('deleted')}`);
    console.log(`[cursor-migration] ${result.pending.length} pending item(s), ${result.judgment.length} judgment item(s): see ${result.appliedPath}`);
    console.log(`[cursor-migration] undo: ${result.undo}`);
    return 0;
  } catch (error) {
    console.error(`[cursor-migration] ${error.message}`);
    return 2;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
