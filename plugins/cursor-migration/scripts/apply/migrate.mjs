// Mechanical migration of rules, commands and Cursor skills (D4/D15, D9). Rows flagged for
// judgment are left untouched and returned as pending; the skill resolves them afterwards.
import {splitFrontmatter} from '../lib/frontmatter.mjs';
import {exists, looksLikeText, readBytes, readText} from '../lib/fs-utils.mjs';
import {isAutoRewritable, rewriteText} from '../inventory/references.mjs';
import {relinkMarkdown} from '../lib/links.mjs';
import {claudeRuleContent, skillContent} from './content.mjs';

const BLOCKING_RULE_FLAGS = ['target already exists', 'duplicate rule name'];

/** Moved prose: relative links first (they still resolve from the old folder), then .cursor/ paths. */
function movedText(text, from, to, ctx) {
  return rewriteText(relinkMarkdown(text, from, to, ctx), ctx);
}

/** True when code (which apply never edits) still points at `source`, so it must stay for now. */
function referencedByCode(inventory, source, extraRefs = []) {
  const refs = new Set([source, ...extraRefs]);
  return inventory.references.some(row => row.mode === 'manual' && refs.has(row.ref.replace(/\/$/, '')));
}

function ruleContent(root, rule, ctx, scopeRules) {
  const body = movedText(splitFrontmatter(readText(root, rule.source)).body, rule.source, rule.target, ctx);
  if (rule.type === 'path') return claudeRuleContent(body, rule.globs);
  if (rule.type === 'always') {
    const scoped = scopeRules.has(rule.name) && rule.demotionCandidate?.proposedPaths.length > 0;
    return claudeRuleContent(body, scoped ? rule.demotionCandidate.proposedPaths : []);
  }
  return skillContent({
    name: rule.name,
    description: rule.description || `Migrated Cursor rule ${rule.name}. Run only when invoked.`,
    disableModelInvocation: rule.type === 'manual',
    body,
  });
}

export function migrateRules(rec, root, inventory, ctx, {scopeRules}) {
  const pending = [];
  for (const rule of inventory.rules) {
    const blocked = rule.flags.find(flag => BLOCKING_RULE_FLAGS.includes(flag));
    if (blocked) {
      pending.push({path: rule.source, reason: blocked});
      continue;
    }
    rec.write(rule.target, ruleContent(root, rule, ctx, scopeRules));
    const folder = `.cursor/rules/${rule.name}`;
    if (referencedByCode(inventory, rule.source, [folder])) {
      pending.push({path: rule.source, reason: 'kept: code still references it; fix the code reference, then delete'});
    } else {
      rec.remove(rule.source);
    }
  }
  return pending;
}

export function migrateCommands(rec, root, inventory, ctx) {
  const pending = [];
  for (const command of inventory.commands) {
    if (command.alreadyMigratedAs.length > 0) {
      pending.push({path: command.source, reason: `already migrated as ${command.alreadyMigratedAs.join(', ')}`});
      continue;
    }
    const body = movedText(readText(root, command.source), command.source, command.target, ctx);
    rec.write(
      command.target,
      skillContent({
        name: command.name,
        description: `Migrated Cursor command /${command.name}. Run only when invoked.`,
        disableModelInvocation: true,
        body,
      }),
    );
    if (!referencedByCode(inventory, command.source)) rec.remove(command.source);
  }
  return pending;
}

/** Where a moved Cursor skill file lands. */
export function cursorSkillTarget(file) {
  return file.replace(/^\.cursor\/skills\//, '.agents/skills/');
}

function moveFile(rec, root, from, to, ctx) {
  const bytes = readBytes(root, from);
  const text = looksLikeText(bytes) ? bytes.toString('utf8') : null;
  rec.write(to, text !== null && isAutoRewritable(from, text) ? movedText(text, from, to, ctx) : bytes);
  rec.remove(from);
}

export function migrateCursorSkills(rec, root, inventory, ctx, cursorSkillFiles) {
  const pending = [];
  for (const skill of inventory.cursorSkills) {
    const files = cursorSkillFiles.get(skill.name) || [];
    if (skill.action === 'move to .agents/skills') {
      for (const file of files) {
        moveFile(rec, root, file, cursorSkillTarget(file), ctx);
      }
    } else if (skill.action.startsWith('remove')) {
      for (const file of files) rec.remove(file);
    } else {
      pending.push({path: `.cursor/skills/${skill.name}`, reason: skill.action});
    }
  }
  return pending;
}

/** Rewrites .cursor/ references in every remaining prose file the inventory found them in. */
export function rewriteReferences(rec, root, inventory, ctx) {
  const files = new Set(inventory.references.filter(row => row.mode === 'auto').map(row => row.file));
  for (const file of files) {
    if (!exists(root, file)) continue;
    const bytes = readBytes(root, file);
    if (!looksLikeText(bytes)) continue;
    const text = bytes.toString('utf8');
    if (!isAutoRewritable(file, text)) continue;
    const next = rewriteText(text, ctx);
    if (next !== text) rec.write(file, next);
  }
}
