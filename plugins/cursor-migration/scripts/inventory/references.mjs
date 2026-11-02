// Finds references to .cursor/ paths that break once Cursor sources move, and proposes rewrites.
// Markdown is rewritten automatically in Phase 3; code is always listed for manual edits.
import {exists, looksLikeText, readBytes} from '../lib/fs-utils.mjs';
import {git} from '../lib/git.mjs';

/**
 * Never scanned or rewritten: history (changelogs, changesets), generated mirrors and plugin fixtures.
 * Repos add their own history folders with `--exclude=<glob>` (for example documentation/jobs/**).
 */
export const DEFAULT_EXCLUDES = [
  '**/CHANGELOG*.md',
  '.changeset/**',
  '.cursor/plans/**',
  '.claude/skills/**',
  'plugins/*/test/**',
];
const CODE_EXT = /\.(c?js|mjs|ts|tsx|py|ps1|sh|json|ya?ml|toml)$/i;
/**
 * A repo-relative .cursor/ path. Paths in the user's home folder (~/.cursor/skills-cursor/,
 * $HOME/.cursor/plugins/) are Cursor's own and never move, and a folder name must end at a
 * boundary so `.cursor/skills-cursor` is not read as `.cursor/skills` + "-cursor".
 */
const REF =
  /(?<!~[\\/]|HOME[\\/]|USERPROFILE%?[\\/])\.cursor\/(?:rules|skills|commands|config|plans|mcp\.json)(?![\w-])(?:\/[^\s`'"()<>[\]{},;|*]*)?/g;
const GENERATED_MARKER = '@generated-by cursor-migration';
const MAX_BYTES = 1024 * 1024;

function cleanRef(raw) {
  return raw.replace(/[.:]+$/, '').replace(/#.*$/, '');
}

/** Folder-level mentions ("rules live in .cursor/rules/") map to the new home folders. */
const FOLDER_TARGETS = new Map([
  ['.cursor/rules', '.claude/rules'],
  ['.cursor/skills', '.agents/skills'],
  ['.cursor/commands', '.agents/skills'],
]);

/** Proposed replacement path, 'keep' for paths that stay, or null when a human must decide. */
export function proposeRewrite(ref, ctx) {
  if (/^\.cursor\/(config|plans)(\/|$)/.test(ref) || inSyncTarget(ref, ctx)) return 'keep';
  if (ref === '.cursor/mcp.json') return '.mcp.json';
  const folder = ref.replace(/\/$/, '');
  if (FOLDER_TARGETS.has(folder)) return FOLDER_TARGETS.get(folder) + (ref.endsWith('/') ? '/' : '');
  // Folder rules first (RULE.mdc would otherwise name the rule "RULE"), then .mdc, whose bare-folder
  // pattern would otherwise read "x.mdc" as a folder name.
  const rule =
    /^\.cursor\/rules\/([^/]+)\/RULE\.mdc?$/.exec(ref) ||
    /^\.cursor\/rules\/(?:.*\/)?([^/]+)\.mdc$/.exec(ref) ||
    /^\.cursor\/rules\/([^/.]+)\/?$/.exec(ref);
  if (rule && ctx.ruleTargets.has(rule[1])) return ctx.ruleTargets.get(rule[1]);
  const command = /^\.cursor\/commands\/([^/]+)\.md$/.exec(ref);
  if (command && ctx.commandTargets.has(command[1])) return ctx.commandTargets.get(command[1]);
  const skill = /^\.cursor\/skills\/([^/]+)(\/.*)?$/.exec(ref);
  if (skill && ctx.agentsSkillNames.has(skill[1])) return `.agents/skills/${skill[1]}${skill[2] || ''}`;
  return null;
}

/** Extensionless scripts: git hook folders and anything with a shebang. */
const HOOK_FOLDER = /(^|\/)\.(husky|githooks)\//;

/** True for files whose references are rewritten automatically (Markdown and other prose). */
export function isAutoRewritable(file, text = '') {
  return !CODE_EXT.test(file) && !HOOK_FOLDER.test(file) && !text.startsWith('#!');
}

/** Inside a mirror target the sync generates (agent-sync.config.json), e.g. .cursor/rules when Cursor is kept. */
function inSyncTarget(ref, ctx) {
  const path = ref.replace(/\/$/, '');
  return (ctx.syncTargets || []).some(
    target => path === target || (path.startsWith(`${target}/`) && ctx.pathExists(path)),
  );
}

/** Cursor rule-folder notation with a placeholder: .cursor/rules/<name>/RULE.md(c), .cursor/rules/**\/RULE.md(c) */
const PLACEHOLDER_RULE = /\.cursor\/rules\/(<[^>\s]+>|\*\*|\*)\/RULE\.mdc?/g;

/** Short form used inside rule folders and docs: `architecture/RULE.md(c)` (only known rule names are rewritten). */
const SHORT_RULE = /(^|[^\w./-])([a-z0-9][a-z0-9-]*)\/RULE\.mdc?(?![\w.])/g;

function placeholderTarget(placeholder) {
  return placeholder === '**' ? '.claude/rules/**/*.md' : `.claude/rules/${placeholder}.md`;
}

/**
 * Sentences about the old layout ("stubs live in .cursor/skills", "the .cursor/skills/x copies are
 * legacy", "SSOT is .agents/skills, not .cursor/skills") flip their meaning when rewritten, so a
 * human decides. Signals: stub/legacy/redirect/copy wording, or an old path on a line that already names its new home.
 */
function isContrast(line, ref, proposed) {
  if (/\b(stubs?|legacy|redirects?|cop(y|ies))\b/i.test(line)) return true;
  return line.replace(ref, '').includes(proposed.replace(/\/$/, ''));
}

/** Every .cursor/ reference on one line, with its position and proposed replacement (or null). */
export function analyzeLine(line, ctx) {
  const found = [];
  for (const match of line.matchAll(PLACEHOLDER_RULE)) {
    found.push({start: match.index, end: match.index + match[0].length, ref: match[0], proposed: placeholderTarget(match[1])});
  }
  const covered = index => found.some(item => index >= item.start && index < item.end);
  for (const match of line.matchAll(SHORT_RULE)) {
    const start = match.index + match[1].length;
    if (covered(start) || !ctx.ruleTargets.has(match[2])) continue;
    const ref = match[0].slice(match[1].length);
    found.push({start, end: start + ref.length, ref, proposed: ctx.ruleTargets.get(match[2])});
  }
  for (const match of line.matchAll(REF)) {
    if (covered(match.index)) continue;
    const ref = cleanRef(match[0]);
    let proposed = proposeRewrite(ref, ctx);
    if (proposed === 'keep') continue;
    if (proposed && isContrast(line, ref, proposed)) proposed = null;
    found.push({start: match.index, end: match.index + ref.length, ref, proposed});
  }
  return found.sort((a, b) => a.start - b.start);
}

function rewriteLine(line, ctx) {
  let out = line;
  for (const item of analyzeLine(line, ctx).reverse()) {
    if (item.proposed) out = out.slice(0, item.start) + item.proposed + out.slice(item.end);
  }
  return out;
}

/**
 * Replaces every .cursor/ reference that has a known target, line by line (EOLs kept). Unknown
 * targets, contrasts, kept paths and anchors/trailing punctuation stay. Same analysis as the scan.
 */
export function rewriteText(text, ctx) {
  return text
    .split(/(\r?\n)/)
    .map((part, i) => (i % 2 === 0 ? rewriteLine(part, ctx) : part))
    .join('');
}

/** Minimal glob → RegExp: `**` spans folders, `*` stays within one segment. */
export function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  // Placeholders first, so the single-* step never rewrites the * inside an expanded **.
  const pattern = escaped
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*\*/g, '\u0001')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '(?:.*/)?')
    .replace(/\u0001/g, '.*');
  return new RegExp(`^${pattern}$`);
}

/** Every tracked file except excluded globs; files that do not exist on disk are skipped. */
function scanTargets(root, excludes) {
  const listing = git(root, ['ls-files', '-z']) ?? '';
  const patterns = excludes.map(globToRegExp);
  return listing
    .split('\0')
    .filter(Boolean)
    .filter(file => !patterns.some(pattern => pattern.test(file)))
    .filter(file => exists(root, file))
    .sort();
}

/**
 * auto: Markdown with a known target (rewritten on apply).
 * manual: code, or an existing path with no known target (a human decides).
 * stale: points at a file that does not exist today (already broken; listed, not counted as work).
 */
function referenceMode(ref, proposed, fileMode, ctx) {
  if (proposed) return fileMode;
  return /\.[a-z]+$/i.test(ref) && !ctx.pathExists(ref) ? 'stale' : 'manual';
}

function scanFile(root, file, ctx) {
  const buffer = readBytes(root, file);
  if (buffer.length > MAX_BYTES || !looksLikeText(buffer)) return [];
  const text = buffer.toString('utf8');
  if (text.includes(GENERATED_MARKER)) return [];
  const mode = isAutoRewritable(file, text) ? 'auto' : 'manual';
  const rows = [];
  text.split(/\r?\n/).forEach((line, index) => {
    for (const {ref, proposed} of analyzeLine(line, ctx)) {
      rows.push({file, line: index + 1, ref, mode: referenceMode(ref, proposed, mode, ctx), proposed});
    }
  });
  return rows;
}

/** Every .cursor/ reference that would dangle after migration. Files that are migrated away are skipped. */
export function findReferences(root, ctx, excludes = DEFAULT_EXCLUDES) {
  return scanTargets(root, excludes)
    .filter(file => !ctx.removedSources.has(file))
    .flatMap(file => scanFile(root, file, ctx));
}

/** { file: count } for the report. */
export function countByFile(references) {
  const counts = {};
  for (const ref of references) counts[ref.file] = (counts[ref.file] || 0) + 1;
  return counts;
}
