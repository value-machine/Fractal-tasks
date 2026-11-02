// Classifies Cursor rules and decides their Claude Code target (DECISIONS.md D4 as amended by D15).
import {agentsAdapter} from '../adapters/agents.mjs';
import {claudeAdapter} from '../adapters/claude.mjs';
import {normalizeGlobs} from '../lib/frontmatter.mjs';

/** Always-on rules larger than this are listed as demotion candidates. */
export const LARGE_ALWAYS_RULE_BYTES = 20000;

/** One line per Cursor type: what it is, and what it becomes in Claude Code. */
export const RULE_TYPES = {
  always: {
    cursor: 'alwaysApply: true — loaded in every chat',
    claude: '.claude/rules/<name>.md without paths — loaded at every launch, plus a pointer row in AGENTS.md',
  },
  path: {
    cursor: 'globs — attached when a matching file is in context',
    claude: '.claude/rules/<name>.md with paths: — loaded when Claude reads or edits a matching file',
  },
  agent: {
    cursor: 'description only — the agent decides when to load it',
    claude: '.agents/skills/<name>/SKILL.md — a skill Claude loads when the description matches',
  },
  manual: {
    cursor: 'no description, no globs — only when @-mentioned',
    claude: '.agents/skills/<name>/SKILL.md with disable-model-invocation: true — only when invoked',
  },
};

/** Cursor type of a rule from its frontmatter. alwaysApply wins over globs. */
export function classifyRule(frontmatter) {
  const globs = normalizeGlobs(frontmatter.globs);
  if (frontmatter.alwaysApply === true) return {type: 'always', globs};
  if (globs.length > 0) return {type: 'path', globs};
  if (typeof frontmatter.description === 'string' && frontmatter.description.trim()) {
    return {type: 'agent', globs};
  }
  return {type: 'manual', globs};
}

function targetFor(type, name) {
  return type === 'always' || type === 'path'
    ? claudeAdapter.ruleTarget(name)
    : agentsAdapter.skillTarget(name);
}

/** AGENTS.md lines that reference this rule and describe it as mandatory. */
function mandatoryMentions(agentsMdText, rule) {
  const needles = [rule.source, `.cursor/rules/${rule.name}/`, `\`${rule.name}\``];
  return agentsMdText
    .split(/\r?\n/)
    .filter(line => needles.some(needle => line.includes(needle)))
    .filter(line => /\b(always|must|before|never)\b/i.test(line));
}

function demotionCandidate(rule, globs) {
  if (globs.length > 0) {
    return {reason: 'also declares globs; could load only for those paths', proposedPaths: globs};
  }
  if (rule.bytes > LARGE_ALWAYS_RULE_BYTES) {
    return {reason: `large always-on rule (${rule.bytes} bytes); consider scoping with paths:`, proposedPaths: []};
  }
  return null;
}

function ruleFlags(rule, classified, ctx) {
  const flags = [];
  if (classified.type === 'always' && classified.globs.length > 0) {
    flags.push('precedence: alwaysApply wins over globs');
  }
  if (classified.type === 'agent' && mandatoryMentions(ctx.agentsMdText, rule).length > 0) {
    flags.push('critical rule demoted to on-demand: AGENTS.md calls it mandatory');
  }
  if (ctx.existingTargets.has(targetFor(classified.type, rule.name))) {
    flags.push('target already exists');
  }
  if (ctx.duplicateNames.has(rule.name)) flags.push('duplicate rule name');
  return flags;
}

/** Inventory rows for every Cursor rule. */
export function buildRuleRows(rules, ctx) {
  return rules.map(rule => {
    const classified = classifyRule(rule.frontmatter);
    const target = targetFor(classified.type, rule.name);
    return {
      name: rule.name,
      source: rule.source,
      type: classified.type,
      globs: classified.globs,
      description: typeof rule.frontmatter.description === 'string' ? rule.frontmatter.description : '',
      bytes: rule.bytes,
      target,
      demotionCandidate: classified.type === 'always' ? demotionCandidate(rule, classified.globs) : null,
      flags: ruleFlags(rule, classified, ctx),
    };
  });
}

/** Names used by more than one rule file. */
export function duplicateRuleNames(rules) {
  const seen = new Map();
  for (const rule of rules) seen.set(rule.name, (seen.get(rule.name) || 0) + 1);
  return new Set([...seen].filter(([, count]) => count > 1).map(([name]) => name));
}
