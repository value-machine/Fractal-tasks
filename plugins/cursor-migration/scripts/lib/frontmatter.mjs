// Parses the YAML subset agent tools use in Markdown frontmatter: scalars (quoted or bare),
// booleans, flow lists ["a", "b"], block lists (- a) and block scalars (>- / |).
// Not a general YAML parser: unknown shapes are kept as raw strings.

function parseScalar(raw) {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^".*"$/.test(value)) return value.slice(1, -1).replace(/\\"/g, '"');
  if (/^'.*'$/.test(value)) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

/** Splits on commas that are outside quotes and braces, so `**\/*.{ts,tsx}` stays whole. */
export function splitTopLevelCommas(text) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
    } else if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map(part => parseScalar(part)).filter(part => part !== '');
}

function readBlockScalar(lines, start, style) {
  const parts = [];
  let i = start;
  while (i < lines.length && (lines[i] === '' || /^\s/.test(lines[i]))) {
    parts.push(lines[i].trim());
    i += 1;
  }
  const value = style === '>' ? parts.filter(Boolean).join(' ') : parts.join('\n').trim();
  return {value, next: i};
}

function readBlockList(lines, start) {
  const items = [];
  let i = start;
  while (i < lines.length) {
    const item = /^\s+-\s+(.*)$/.exec(lines[i]);
    if (!item) break;
    items.push(parseScalar(item[1]));
    i += 1;
  }
  return {items, next: i};
}

function parseValue(rest, lines, next) {
  if (/^[>|][-+]?$/.test(rest)) {
    const block = readBlockScalar(lines, next, rest[0]);
    return {value: block.value, next: block.next};
  }
  if (rest === '') {
    const list = readBlockList(lines, next);
    return {value: list.items.length > 0 ? list.items : '', next: list.next};
  }
  if (rest.startsWith('[') && rest.endsWith(']')) {
    return {value: splitTopLevelCommas(rest.slice(1, -1)), next};
  }
  return {value: parseScalar(rest), next};
}

/** Parses frontmatter lines into a plain object. */
export function parseYamlSubset(lines) {
  const data = {};
  let i = 0;
  while (i < lines.length) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i]);
    if (!match) {
      i += 1;
      continue;
    }
    const parsed = parseValue(match[2].trim(), lines, i + 1);
    data[match[1]] = parsed.value;
    i = parsed.next;
  }
  return data;
}

/** Splits `--- frontmatter ---` from a Markdown body. Tolerates a BOM and CRLF. */
export function splitFrontmatter(text) {
  const normalized = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const none = {data: {}, body: normalized, hasFrontmatter: false};
  if (!normalized.startsWith('---\n')) return none;
  const end = normalized.indexOf('\n---', 3);
  if (end === -1) return none;
  const lines = normalized.slice(4, end).split('\n');
  const body = normalized.slice(end + 4).replace(/^[^\n]*\n?/, '');
  return {data: parseYamlSubset(lines), body, hasFrontmatter: true};
}

/** Cursor `globs` may be a list or a comma-separated string; returns a clean list. */
export function normalizeGlobs(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return splitTopLevelCommas(value);
  return [];
}
