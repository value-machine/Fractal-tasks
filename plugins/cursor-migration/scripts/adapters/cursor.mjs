// Cursor adapter: reads a repo's Cursor configuration (read-only).
import {splitFrontmatter} from '../lib/frontmatter.mjs';
import {exists, listDirs, listFiles, readBytes, readText} from '../lib/fs-utils.mjs';

const RULES_DIR = '.cursor/rules';
const COMMANDS_DIR = '.cursor/commands';
const SKILLS_DIR = '.cursor/skills';

function readRuleFile(root, source, name) {
  const text = readText(root, source);
  const {data, body} = splitFrontmatter(text);
  return {source, name, frontmatter: data, body, bytes: readBytes(root, source).length};
}

/** Classifies one path under .cursor/rules as rule, index file or attachment. */
function placeRulePath(sub) {
  const parts = sub.split('/');
  const last = parts[parts.length - 1];
  // Folder rules (<name>/RULE.md or <name>/RULE.mdc) are named after their folder.
  if (parts.length >= 2 && /^RULE\.mdc?$/.test(last)) {
    return {kind: 'rule', name: parts[parts.length - 2]};
  }
  if (last.endsWith('.mdc')) return {kind: 'rule', name: last.slice(0, -4)};
  return parts.length === 1 ? {kind: 'index'} : {kind: 'attachment'};
}

export const cursorAdapter = {
  id: 'cursor',

  detect(root) {
    return exists(root, '.cursor') || exists(root, '.cursorrules');
  },

  /** Rule files the sync script generated from .claude/rules (listed in .cursor/rules/.generated.json). */
  generatedRulePaths(root) {
    const manifest = `${RULES_DIR}/.generated.json`;
    if (!exists(root, manifest)) return new Set();
    const owned = JSON.parse(readText(root, manifest)).files || [];
    return new Set([manifest, ...owned.map(file => `${RULES_DIR}/${file}`)]);
  },

  /** Rules (.mdc anywhere, <name>/RULE.md or RULE.mdc), plus index files and non-rule attachments. Generated rules are skipped. */
  readRules(root) {
    const result = {rules: [], indexFiles: [], attachments: []};
    const generated = this.generatedRulePaths(root);
    for (const source of listFiles(root, RULES_DIR)) {
      if (generated.has(source)) continue;
      const placed = placeRulePath(source.slice(RULES_DIR.length + 1));
      if (placed.kind === 'rule') result.rules.push(readRuleFile(root, source, placed.name));
      else if (placed.kind === 'index') result.indexFiles.push(source);
      else result.attachments.push(source);
    }
    return result;
  },

  /** Top-level .cursor/commands/*.md; anything deeper (e.g. archive/) is reported as archived. */
  readCommands(root) {
    const result = {commands: [], archived: []};
    for (const source of listFiles(root, COMMANDS_DIR)) {
      const sub = source.slice(COMMANDS_DIR.length + 1);
      if (!sub.includes('/') && sub.endsWith('.md')) {
        result.commands.push({
          source,
          name: sub.slice(0, -3),
          text: readText(root, source),
          bytes: readBytes(root, source).length,
        });
      } else {
        result.archived.push(source);
      }
    }
    return result;
  },

  /** Skill folders under .cursor/skills and loose files at its root (e.g. INDEX.md). */
  readSkills(root) {
    const skills = listDirs(root, SKILLS_DIR).map(name => ({
      name,
      files: listFiles(root, `${SKILLS_DIR}/${name}`),
    }));
    const indexFiles = listFiles(root, SKILLS_DIR).filter(
      path => !path.slice(SKILLS_DIR.length + 1).includes('/'),
    );
    return {skills, indexFiles};
  },

  readMcp(root) {
    const source = '.cursor/mcp.json';
    if (!exists(root, source)) return null;
    try {
      return {source, config: JSON.parse(readText(root, source))};
    } catch (error) {
      return {source, config: null, error: String(error.message || error)};
    }
  },

  /** Legacy single-file rules (.cursorrules). */
  readLegacyRules(root) {
    if (!exists(root, '.cursorrules')) return null;
    return {source: '.cursorrules', bytes: readBytes(root, '.cursorrules').length};
  },
};
