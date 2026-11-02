// Renders inventory.json as MIGRATION_REPORT.md for a first-time reader. Pure function, no I/O.
import {countByFile} from './inventory/references.mjs';
import {RULE_TYPES} from './inventory/rules.mjs';

const cell = value => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const kb = bytes => `${(bytes / 1024).toFixed(1)} KB`;
const code = value => `\`${value}\``;

function table(headers, rows) {
  if (rows.length === 0) return '_None._\n';
  const head = `| ${headers.join(' | ')} |\n|${headers.map(() => '---').join('|')}|\n`;
  return head + rows.map(row => `| ${row.map(cell).join(' | ')} |`).join('\n') + '\n';
}

function header(inv) {
  const {tools, hooks} = inv.environment;
  return [
    '# Cursor → Claude Code migration report',
    '',
    'Read-only dry run. Nothing in the repo has changed yet. Review this report, then approve to apply.',
    '',
    `- **Keep using Cursor in this repo:** ${inv.keepCursor ? 'yes — Cursor rules are regenerated from `.claude/rules`' : 'no — migrated `.cursor/` sources are removed after apply'}`,
    `- **Checked with:** node ${tools.node}, git ${tools.git ?? 'unknown'}, ${inv.generator}`,
    `- **Hook manager:** ${hooks.manager}${hooks.hooksPath ? ` (core.hooksPath = ${hooks.hooksPath})` : ''}`,
    '',
  ].join('\n');
}

function glossary() {
  const rows = Object.entries(RULE_TYPES).map(([type, text]) => [type, text.cursor, text.claude]);
  return `## How Cursor rule types map to Claude Code\n\n${table(['Type', 'In Cursor', 'In Claude Code'], rows)}`;
}

function summary(inv) {
  const count = type => inv.rules.filter(rule => rule.type === type).length;
  const rows = [
    ['Rules: always / path / agent / manual', `${count('always')} / ${count('path')} / ${count('agent')} / ${count('manual')}`],
    ['Always-loaded rule text in Claude (`.claude/rules`, no paths)', kb(inv.bytesAdded.alwaysLoadedRuleBytes)],
    ['Path-scoped rule text (`.claude/rules` with paths)', kb(inv.bytesAdded.pathScopedRuleBytes)],
    ['Pointer rows added to AGENTS.md', inv.bytesAdded.agentsMdPointerRows],
    ['Commands → skills', inv.commands.length],
    ['Cursor skill folders', inv.cursorSkills.length],
    ['Skills in .agents/skills', inv.agentsSkills.length],
    [
      '.cursor/ references: rewritten on apply / manual / already broken',
      ['auto', 'manual', 'stale'].map(mode => inv.references.filter(r => r.mode === mode).length).join(' / '),
    ],
    ['Items that need your judgment', inv.judgment.length],
  ];
  return `## Summary\n\n${table(['What', 'Count / size'], rows)}`;
}

function rulesSection(inv) {
  const rows = inv.rules.map(rule => [
    code(rule.name),
    rule.type,
    rule.globs.map(code).join(', '),
    code(rule.target),
    kb(rule.bytes),
    rule.flags.join('; '),
  ]);
  const candidates = inv.rules
    .filter(rule => rule.demotionCandidate)
    .map(rule => [code(rule.name), rule.demotionCandidate.reason, rule.demotionCandidate.proposedPaths.map(code).join(', ')]);
  return [
    '## Rules',
    '',
    table(['Rule', 'Cursor type', 'Globs', 'Target', 'Size', 'Flags'], rows),
    '### Optional: scope always-on rules (opt-in, D15)',
    '',
    'Behavior stays the same unless you approve a row here. Each approved rule gets `paths:` and stops loading at launch.',
    '',
    table(['Rule', 'Why', 'Proposed paths'], candidates),
  ].join('\n');
}

function commandsAndSkills(inv) {
  const commands = inv.commands.map(c => [code(c.source), code(c.target), c.action, c.alreadyMigratedAs.join(', ')]);
  const cursorSkills = inv.cursorSkills.map(s => [code(s.name), s.stub ? 'yes' : 'no', s.fileCount, s.problemFiles.length, s.action]);
  const dmi = value => (value === true ? 'true (only when invoked)' : value === false ? 'false' : 'unset (model may invoke)');
  const agents = inv.agentsSkills.map(s => [code(s.name), s.files, dmi(s.disableModelInvocation)]);
  return [
    '## Commands',
    '',
    table(['Command', 'Target', 'Action', 'Already migrated as'], commands),
    '## Cursor skill folders',
    '',
    table(['Skill', 'Redirect stub', 'Files', 'Differ / missing', 'Action'], cursorSkills),
    '## Skills in .agents/skills (mirrored to .claude/skills)',
    '',
    '`disable-model-invocation: true` means the skill only runs when someone invokes it; it never auto-triggers.',
    '',
    table(['Skill', 'Files', 'disable-model-invocation'], agents),
  ].join('\n');
}

function mcpSection(inv) {
  if (!inv.mcp) return '## MCP servers\n\n_No `.cursor/mcp.json`._\n';
  if (inv.mcp.error) return `## MCP servers\n\n\`${inv.mcp.source}\` could not be parsed: ${inv.mcp.error}\n`;
  const rows = inv.mcp.servers.map(s => [code(s.name), s.transport, s.secretLocations.join(', ') || '—']);
  const notes = [
    `Target: \`${inv.mcp.target}\`. Literal secrets become \`\${VAR}\` references; only variable *names* go into \`.env.example\`. Values are never printed.`,
    inv.mcp.rotateAdvised ? '**`.cursor/mcp.json` with literal secrets is in git history. Rotate those secrets.**' : '',
    'Claude Code asks you to approve each project MCP server on first use. The migration never pre-approves them.',
  ].filter(Boolean);
  return `## MCP servers\n\n${table(['Server', 'Transport', 'Literal secret locations'], rows)}\n${notes.join('\n\n')}\n`;
}

function referencesSection(inv) {
  const counts = Object.entries(countByFile(inv.references)).map(([file, n]) => [code(file), n]);
  const manual = inv.references
    .filter(ref => ref.mode === 'manual')
    .map(ref => [`${code(ref.file)}:${ref.line}`, code(ref.ref), ref.proposed ? code(ref.proposed) : 'no known target']);
  const stale = inv.references
    .filter(ref => ref.mode === 'stale')
    .map(ref => [`${code(ref.file)}:${ref.line}`, code(ref.ref)]);
  return [
    '## References to `.cursor/` paths',
    '',
    'Markdown references are rewritten during apply. Code and unknown targets are listed for a manual edit.',
    '',
    table(['File', 'References'], counts),
    '### Manual edits',
    '',
    table(['Where', 'Reference', 'Suggested target'], manual),
    '### Already broken today (target file does not exist)',
    '',
    table(['Where', 'Reference'], stale),
  ].join('\n');
}

function judgmentSection(inv) {
  const rows = inv.judgment.map(item => [item.id, item.kind, item.message, item.paths.slice(0, 3).map(code).join(', ')]);
  return `## Needs your judgment\n\n${table(['#', 'Kind', 'Decision', 'Paths'], rows)}`;
}

function environmentSection(inv) {
  const {syncScript} = inv.environment;
  const excluded = inv.excluded.map(item => [code(item.path), item.reason]);
  return [
    '## Not migrated',
    '',
    table(['Path', 'Why'], excluded),
    '## Nested configs',
    '',
    inv.nestedConfigs.length > 0 ? inv.nestedConfigs.map(path => `- ${code(path)}`).join('\n') + '\n' : '_None._\n',
    '## Sync script',
    '',
    `\`${syncScript.path}\`: ${syncScript.status}${syncScript.version ? ` (v${syncScript.version})` : ''}; plugin template v${syncScript.templateVersion}.`,
    '',
  ].join('\n');
}

function guidedSection(inv) {
  const steps = inv.guidedSteps.map(step =>
    [`### ${step.tool}: ${step.title}`, '', ...step.steps.map(line => `- ${line}`), ''].join('\n'),
  );
  return [
    '## Guided steps outside the repo',
    '',
    'The migration does not change app settings or files in your home folder. Do these yourself.',
    '',
    ...steps,
  ].join('\n');
}

/** Markdown report for an inventory object. */
export function renderReport(inventory) {
  return [
    header(inventory),
    glossary(),
    summary(inventory),
    judgmentSection(inventory),
    rulesSection(inventory),
    commandsAndSkills(inventory),
    mcpSection(inventory),
    referencesSection(inventory),
    environmentSection(inventory),
    guidedSection(inventory),
  ].join('\n');
}
