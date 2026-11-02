// Builds file contents for migrated rules and skills. Output is LF, UTF-8 without BOM.

function yamlString(value) {
  return JSON.stringify(String(value));
}

function normalizeBody(body) {
  const text = body.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  return text.endsWith('\n') ? text : `${text}\n`;
}

/** Claude Code rule: optional `paths:` frontmatter (D15), then the body. */
export function claudeRuleContent(body, paths = []) {
  if (paths.length === 0) return normalizeBody(body);
  const list = paths.map(path => `  - ${yamlString(path)}`).join('\n');
  return `---\npaths:\n${list}\n---\n${normalizeBody(body)}`;
}

/** Agent skill (SKILL.md) with name, description and optional disable-model-invocation. */
export function skillContent({name, description, disableModelInvocation, body}) {
  const lines = [`name: ${name}`, `description: ${yamlString(description)}`];
  if (disableModelInvocation) lines.push('disable-model-invocation: true');
  return `---\n${lines.join('\n')}\n---\n${normalizeBody(body)}`;
}
