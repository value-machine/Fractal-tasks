#!/usr/bin/env node
// Read-only migration dry run: writes inventory.json + MIGRATION_REPORT.md under .git/cursor-migration/.
// Usage: node inventory.mjs --keep-cursor=yes|no [--root <repo>] [--exclude=<glob> ...]
// --exclude adds repo-specific history folders that must not be rewritten (e.g. documentation/jobs/**).
// Without --exclude, the excludes of the last apply (applied.json) are reused.
// The skill asks "keep using Cursor in this repo?" first and passes the answer.
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {buildInventory} from './inventory/build.mjs';
import {gitDir, repoRoot} from './lib/git.mjs';
import {renderReport} from './report.mjs';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'sync-agent-config.mjs');

export function parseArgs(argv) {
  const options = {keepCursor: null, root: process.cwd(), excludes: []};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--root') options.root = argv[++i];
    else if (arg.startsWith('--exclude=')) options.excludes.push(arg.slice('--exclude='.length));
    else if (arg.startsWith('--keep-cursor=')) {
      const value = arg.split('=')[1];
      if (value !== 'yes' && value !== 'no') throw new Error('--keep-cursor must be yes or no');
      options.keepCursor = value === 'yes';
    }
  }
  if (options.keepCursor === null) {
    throw new Error('missing --keep-cursor=yes|no (ask the user whether this repo keeps using Cursor)');
  }
  return options;
}

/** Excludes the last apply used, so a re-inventory without --exclude scans the same files. */
function lastApplyExcludes(outDir) {
  const applied = join(outDir, 'applied.json');
  if (!existsSync(applied)) return [];
  try {
    return JSON.parse(readFileSync(applied, 'utf8')).excludes || [];
  } catch {
    return [];
  }
}

/** Runs the dry run and returns the output paths. */
export function runInventory({root, keepCursor, excludes = []}) {
  const top = repoRoot(resolve(root));
  if (!top) throw new Error(`not a git repository: ${root}`);
  const outDir = join(gitDir(top), 'cursor-migration');
  const scanExcludes = excludes.length > 0 ? excludes : lastApplyExcludes(outDir);
  const inventory = buildInventory(top, {keepCursor, templatePath: TEMPLATE, excludes: scanExcludes});
  mkdirSync(outDir, {recursive: true});
  const inventoryPath = join(outDir, 'inventory.json');
  const reportPath = join(outDir, 'MIGRATION_REPORT.md');
  writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2) + '\n');
  writeFileSync(reportPath, renderReport(inventory));
  return {inventory, inventoryPath, reportPath};
}

function main(argv) {
  try {
    const {inventory, inventoryPath, reportPath} = runInventory(parseArgs(argv));
    console.log(`Report:    ${reportPath}`);
    console.log(`Inventory: ${inventoryPath}`);
    console.log(`Rules ${inventory.rules.length}, commands ${inventory.commands.length}, judgment items ${inventory.judgment.length}`);
    return 0;
  } catch (error) {
    console.error(`[cursor-migration] ${error.message}`);
    return 2;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
