// Claude Code adapter: CLAUDE.md, .claude/rules, .claude/skills mirror, .mcp.json.
import {exists, listFiles, readBytes, readText} from '../lib/fs-utils.mjs';

export const RULES_DIR = '.claude/rules';

export const claudeAdapter = {
  id: 'claude',

  detect(root) {
    return exists(root, 'CLAUDE.md') || exists(root, '.claude');
  },

  /** CLAUDE.md state; a shim is a file whose first line imports AGENTS.md. */
  readClaudeMd(root) {
    if (!exists(root, 'CLAUDE.md')) return {exists: false, bytes: 0, isShim: false};
    const text = readText(root, 'CLAUDE.md');
    const firstLine = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0].trim();
    return {exists: true, bytes: readBytes(root, 'CLAUDE.md').length, isShim: firstLine === '@AGENTS.md'};
  },

  readRuleNames(root) {
    return listFiles(root, RULES_DIR)
      .filter(path => path.endsWith('.md'))
      .map(path => path.slice(RULES_DIR.length + 1, -3));
  },

  hasMcp(root) {
    return exists(root, '.mcp.json');
  },

  ruleTarget(name) {
    return `${RULES_DIR}/${name}.md`;
  },
};
