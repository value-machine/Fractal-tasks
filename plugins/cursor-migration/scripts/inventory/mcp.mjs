// MCP config: server list and secret *locations* (never values) — DECISIONS.md D10.
import {everCommitted, isTracked} from '../lib/git.mjs';

export const SECRET_KEY = /(key|token|secret|password|passwd|auth|credential|bearer|cookie)/i;
const REF_ONLY = /^\$\{[^}]+\}$/;
export const HAS_REF = /\$\{[^}]+\}/;

export function isLiteral(value) {
  return typeof value === 'string' && value.trim() !== '' && !REF_ONLY.test(value.trim());
}

function envSecrets(server) {
  return Object.entries(server.env || {})
    .filter(([key, value]) => SECRET_KEY.test(key) && isLiteral(value))
    .map(([key]) => `env.${key}`);
}

function headerSecrets(server) {
  return Object.entries(server.headers || {})
    .filter(([key, value]) => SECRET_KEY.test(key) && typeof value === 'string' && !HAS_REF.test(value))
    .map(([key]) => `headers.${key}`);
}

function argSecrets(server) {
  const args = Array.isArray(server.args) ? server.args : [];
  const out = [];
  args.forEach((arg, i) => {
    if (typeof arg !== 'string') return;
    const flag = /^--?[\w-]*(key|token|secret|password)[\w-]*/i.exec(arg);
    if (!flag) return;
    if (arg.includes('=')) {
      if (isLiteral(arg.split('=').slice(1).join('='))) out.push(`args[${i}]`);
    } else if (isLiteral(args[i + 1])) {
      out.push(`args[${i + 1}]`);
    }
  });
  return out;
}

function urlSecrets(server) {
  if (typeof server.url !== 'string') return [];
  const out = [];
  if (/\/\/[^/@\s]+:[^/@\s]+@/.test(server.url)) out.push('url userinfo');
  try {
    const url = new URL(server.url);
    for (const [key, value] of url.searchParams) {
      if (SECRET_KEY.test(key) && !HAS_REF.test(value)) out.push(`url query "${key}"`);
    }
  } catch {
    // Not a parseable URL (for example a ${VAR} placeholder); nothing to inspect.
  }
  return out;
}

/** Servers with the locations of literal secrets. */
export function findMcpSecrets(config) {
  return Object.entries((config && config.mcpServers) || {}).map(([name, server]) => ({
    name,
    transport: server.url ? 'remote' : 'stdio',
    secretLocations: [...envSecrets(server), ...headerSecrets(server), ...argSecrets(server), ...urlSecrets(server)],
  }));
}

/** Inventory section for .cursor/mcp.json, including git history exposure. */
export function buildMcpSection(root, mcp) {
  if (!mcp) return null;
  if (!mcp.config) return {source: mcp.source, error: mcp.error, servers: []};
  const servers = findMcpSecrets(mcp.config);
  const hasSecrets = servers.some(server => server.secretLocations.length > 0);
  return {
    source: mcp.source,
    target: '.mcp.json',
    servers,
    tracked: isTracked(root, mcp.source),
    inGitHistory: everCommitted(root, mcp.source),
    rotateAdvised: hasSecrets && everCommitted(root, mcp.source),
  };
}
