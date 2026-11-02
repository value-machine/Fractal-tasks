// Builds the read-only migration inventory (DEVELOPMENT_PLAN Phase 2). Nothing here writes to the repo.
import {readFileSync} from 'node:fs';
import {isAbsolute, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

import {agentsAdapter} from '../adapters/agents.mjs';
import {claudeAdapter} from '../adapters/claude.mjs';
import {cursorAdapter} from '../adapters/cursor.mjs';
import {exists, readBytes, sha256} from '../lib/fs-utils.mjs';
import {buildMcpSection} from './mcp.mjs';
import {DEFAULT_EXCLUDES, findReferences} from './references.mjs';
import {buildRuleRows, duplicateRuleNames} from './rules.mjs';
import {buildCommandRows, buildCursorSkillRows, summarizeAgentsSkills} from './skills.mjs';
import {
  detectHookManager,
  findNestedConfigs,
  listExclusions,
  readSyncTargets,
  syncScriptState,
  toolVersions,
} from './environment.mjs';
import {buildGuidedSteps} from './guided.mjs';
import {buildJudgment} from './judgment.mjs';

export const INVENTORY_SCHEMA_VERSION = 1;
const PLUGIN_MANIFEST = new URL('../../.claude-plugin/plugin.json', import.meta.url);
/** The plugin's or skill's own folder (scripts/inventory/ → two levels up). */
const TOOL_ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** Plugin version; a skill copied into a repo without the plugin manifest reports "copy". */
function toolVersion() {
  try {
    return `v${JSON.parse(readFileSync(PLUGIN_MANIFEST, 'utf8')).version}`;
  } catch {
    return 'copy';
  }
}
export const GENERATOR = `cursor-migration inventory ${toolVersion()}`;

/** A copy of this tool inside the repo (a vendored skill, the plugin source) is never scanned or rewritten. */
function selfExclude(root) {
  const rel = relative(root, TOOL_ROOT).replace(/\\/g, '/').replace(/\/$/, '');
  return rel && !rel.startsWith('..') && !isAbsolute(rel) ? [`${rel}/**`] : [];
}

function existingTargets(root, agentsSkills) {
  const targets = new Set(claudeAdapter.readRuleNames(root).map(name => claudeAdapter.ruleTarget(name)));
  for (const skill of agentsSkills) targets.add(agentsAdapter.skillTarget(skill.name));
  return targets;
}

function readCursor(root) {
  return {
    rules: cursorAdapter.readRules(root),
    commands: cursorAdapter.readCommands(root),
    skills: cursorAdapter.readSkills(root),
    mcp: cursorAdapter.readMcp(root),
    legacy: cursorAdapter.readLegacyRules(root),
  };
}

/** Every file the migration reads, hashed, so apply can refuse a stale inventory. */
function hashSources(root, cursor) {
  const paths = [
    ...cursor.rules.rules.map(rule => rule.source),
    ...cursor.rules.indexFiles,
    ...cursor.rules.attachments,
    ...cursor.commands.commands.map(command => command.source),
    ...cursor.skills.skills.flatMap(skill => skill.files),
    ...cursor.skills.indexFiles,
    ...['.cursor/mcp.json', '.cursorrules', 'AGENTS.md', 'CLAUDE.md'].filter(path => exists(root, path)),
  ];
  return Object.fromEntries([...new Set(paths)].sort().map(path => [path, sha256(readBytes(root, path))]));
}

/**
 * Path mapping used both to scan references (inventory) and to rewrite them (apply).
 * Built from inventory-shaped rows so apply can rebuild it from inventory.json.
 */
export function rewriteContext(root, {rules, commands, skillNames}) {
  return {
    ruleTargets: new Map(rules.map(row => [row.name, row.target])),
    commandTargets: new Map(
      commands.map(row => [
        row.name,
        row.alreadyMigratedAs.length > 0 ? `.agents/skills/${row.alreadyMigratedAs[0]}/SKILL.md` : row.target,
      ]),
    ),
    agentsSkillNames: new Set(skillNames),
    pathExists: path => exists(root, path),
  };
}

function referenceContext(root, ruleRows, commandRows, agentsSkills, cursorSkillRows) {
  // Not scanned: files apply deletes (stubs, identical copies) and rules the sync generated.
  const removedSources = cursorAdapter.generatedRulePaths(root);
  for (const row of cursorSkillRows) {
    if (row.action.startsWith('remove')) {
      for (const file of row.allFiles) removedSources.add(file);
    }
  }
  const skillNames = [...agentsSkills.map(skill => skill.name), ...cursorSkillRows.map(row => row.name)];
  // Mentions of a mirror the sync generates (re-inventory of a migrated repo) are correct, not dangling.
  const syncTargets = readSyncTargets(root);
  return {...rewriteContext(root, {rules: ruleRows, commands: commandRows, skillNames}), removedSources, syncTargets};
}

function bytesAdded(ruleRows) {
  const always = ruleRows.filter(row => row.type === 'always');
  return {
    alwaysLoadedRuleBytes: always.reduce((sum, row) => sum + row.bytes, 0),
    pathScopedRuleBytes: ruleRows.filter(row => row.type === 'path').reduce((sum, row) => sum + row.bytes, 0),
    agentsMdPointerRows: always.length,
  };
}

/**
 * Builds the inventory for `root`.
 * @param {string} root absolute repo root
 * @param {{keepCursor: boolean, templatePath: string}} options
 */
export function buildInventory(root, {keepCursor, templatePath, excludes = []}) {
  const scanExcludes = [...DEFAULT_EXCLUDES, ...selfExclude(root), ...excludes];
  const cursor = readCursor(root);
  const agentsSkills = agentsAdapter.readSkills(root);
  const agentsMd = agentsAdapter.readAgentsMd(root);
  const ctx = {
    agentsMdText: agentsMd.text,
    existingTargets: existingTargets(root, agentsSkills),
    duplicateNames: duplicateRuleNames(cursor.rules.rules),
  };
  const rules = buildRuleRows(cursor.rules.rules, ctx);
  const commands = buildCommandRows(cursor.commands.commands, agentsSkills);
  const agentsSkillNames = new Set(agentsSkills.map(skill => skill.name));
  const cursorSkills = buildCursorSkillRows(root, cursor.skills.skills, agentsSkillNames).map((row, i) => ({
    ...row,
    allFiles: cursor.skills.skills[i].files,
  }));
  const references = findReferences(
    root,
    referenceContext(root, rules, commands, agentsSkills, cursorSkills),
    scanExcludes,
  );
  const inventory = {
    schemaVersion: INVENTORY_SCHEMA_VERSION,
    generator: GENERATOR,
    keepCursor,
    excludes,
    environment: {
      tools: toolVersions(root),
      hooks: detectHookManager(root),
      syncScript: syncScriptState(root, readFileSync(templatePath)),
    },
    instructions: {
      agentsMd: {exists: agentsMd.exists, bytes: agentsMd.bytes},
      claudeMd: claudeAdapter.readClaudeMd(root),
      legacyCursorrules: cursor.legacy,
    },
    rules,
    ruleIndexFiles: cursor.rules.indexFiles,
    ruleAttachments: cursor.rules.attachments,
    commands,
    archivedCommands: cursor.commands.archived,
    cursorSkills: cursorSkills.map(({allFiles, ...row}) => row),
    cursorSkillIndexFiles: cursor.skills.indexFiles,
    agentsSkills: summarizeAgentsSkills(agentsSkills),
    mcp: buildMcpSection(root, cursor.mcp),
    existingMcpJson: claudeAdapter.hasMcp(root),
    references,
    nestedConfigs: findNestedConfigs(root),
    excluded: listExclusions(root),
    bytesAdded: bytesAdded(rules),
    sourceHashes: hashSources(root, cursor),
  };
  inventory.judgment = buildJudgment(inventory);
  inventory.guidedSteps = buildGuidedSteps(inventory);
  return inventory;
}
