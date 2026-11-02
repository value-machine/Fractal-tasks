// AGENTS.md, CLAUDE.md and line-based files (.gitignore, .env.example).
import {exists, readBytes, readText} from '../lib/fs-utils.mjs';

const POINTER_START = '<!-- cursor-migration:rules -->';
const POINTER_END = '<!-- /cursor-migration:rules -->';

/**
 * Appends lines that are missing, byte-safe: existing bytes (BOM, NULs, CRLF) are never rewritten.
 * Matching compares trimmed lines decoded as latin1, so odd encodings never cause a false "missing".
 */
export function appendLines(rec, root, rel, lines, heading = null) {
  const existing = exists(root, rel) ? readBytes(root, rel) : Buffer.alloc(0);
  const present = new Set(existing.toString('latin1').split(/\r?\n/).map(line => line.trim()));
  const missing = lines.filter(line => !present.has(line.trim()));
  if (missing.length === 0) return false;
  const eol = existing.includes(Buffer.from('\r\n')) ? '\r\n' : '\n';
  const lead = existing.length > 0 && existing[existing.length - 1] !== 0x0a ? eol : '';
  const headingLines = heading ? [...(existing.length > 0 ? [''] : []), heading] : [];
  const block = [...headingLines, ...missing].join(eol) + eol;
  return rec.write(rel, Buffer.concat([existing, Buffer.from(lead + block, 'utf8')]));
}

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** AGENTS.md mentions the rule by path, or a table row already names it in its first column. */
function mentionsRule(agentsText, rule) {
  if (agentsText.includes(rule.target) || agentsText.includes(rule.source)) return true;
  return new RegExp(`^\\|\\s*\`?${escapeRegExp(rule.name)}\`?\\s*\\|`, 'm').test(agentsText);
}

/** Rows for rules the AGENTS.md text does not mention yet (other tools read rules through it). */
function pointerRows(agentsText, inventory) {
  return inventory.rules
    .filter(rule => rule.type === 'always' || rule.type === 'path')
    .filter(rule => !mentionsRule(agentsText, rule))
    .map(rule => {
      const when = rule.type === 'always' ? 'always' : `files matching ${rule.globs.map(g => `\`${g}\``).join(', ')}`;
      return `| ${rule.name} | \`${rule.target}\` | ${when} | ${rule.description.replace(/\|/g, '\\|')} |`;
    });
}

function pointerBlock(rows) {
  return [
    POINTER_START,
    '## Rules',
    '',
    'Claude Code loads these from `.claude/rules/`. Other agents: read the rule that applies before acting.',
    '',
    '| Rule | Path | Applies | Description |',
    '|------|------|---------|-------------|',
    ...rows,
    POINTER_END,
  ].join('\n');
}

/**
 * Adds rows for migrated rules that AGENTS.md does not mention anywhere yet. Existing rows are never
 * removed, so re-running after the rule sources are gone leaves the block as it is.
 */
function updatePointerBlock(rec, root, inventory) {
  const text = readText(root, 'AGENTS.md');
  const rows = pointerRows(text, inventory);
  if (rows.length === 0) return;
  const next = text.includes(POINTER_END)
    ? text.replace(POINTER_END, `${rows.join('\n')}\n${POINTER_END}`)
    : `${text.replace(/\n*$/, '\n')}\n${pointerBlock(rows)}\n`;
  rec.write('AGENTS.md', next);
}

/** Creates AGENTS.md (from .cursorrules when present) and keeps the rules pointer block current. */
export function migrateInstructions(rec, root, inventory) {
  const pending = [];
  const legacy = inventory.instructions.legacyCursorrules;
  if (!exists(root, 'AGENTS.md')) {
    const seed = legacy ? readText(root, legacy.source) : '';
    rec.write('AGENTS.md', `# Agent instructions\n\n${seed.replace(/\r\n/g, '\n')}`.replace(/\n*$/, '\n'));
    if (legacy) rec.remove(legacy.source);
  } else if (legacy) {
    pending.push({path: legacy.source, reason: 'merge .cursorrules into the existing AGENTS.md, then delete it'});
  }
  updatePointerBlock(rec, root, inventory);
  if (!exists(root, 'CLAUDE.md')) rec.write('CLAUDE.md', '@AGENTS.md\n');
  else if (!inventory.instructions.claudeMd.isShim) {
    pending.push({path: 'CLAUDE.md', reason: 'has its own content: merge into AGENTS.md or keep it below an @AGENTS.md import'});
  }
  appendLines(rec, root, '.gitignore', ['.claude/settings.local.json', '.claude/worktrees/']);
  return pending;
}
