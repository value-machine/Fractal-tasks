// .cursor/mcp.json -> .mcp.json (D10). Literal secrets become ${VAR} references; only variable
// names are written to .env.example. Secret values are never written or printed.
import {exists, readText} from '../lib/fs-utils.mjs';
import {HAS_REF, isLiteral, SECRET_KEY} from '../inventory/mcp.mjs';
import {appendLines} from './instructions.mjs';

const AUTH_SCHEME = /^(Bearer|Basic|Token)\s+/i;

function varName(...parts) {
  return parts
    .join('_')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function convertEnv(server, vars) {
  const env = {...server.env};
  for (const [key, value] of Object.entries(env)) {
    if (SECRET_KEY.test(key) && isLiteral(value)) {
      vars.add(varName(key));
      env[key] = `\${${varName(key)}}`;
    }
  }
  return env;
}

function convertHeaders(name, server, vars) {
  const headers = {...server.headers};
  for (const [key, value] of Object.entries(headers)) {
    if (!SECRET_KEY.test(key) || typeof value !== 'string' || HAS_REF.test(value)) continue;
    const variable = varName(name, key);
    vars.add(variable);
    const scheme = AUTH_SCHEME.exec(value);
    headers[key] = `${scheme ? scheme[0] : ''}\${${variable}}`;
  }
  return headers;
}

function convertArgs(name, server, vars) {
  const args = [...server.args];
  args.forEach((arg, i) => {
    const flag = typeof arg === 'string' && /^--?([\w-]*(?:key|token|secret|password)[\w-]*)/i.exec(arg);
    if (!flag) return;
    const variable = varName(name, flag[1]);
    if (arg.includes('=') && isLiteral(arg.split('=').slice(1).join('='))) {
      vars.add(variable);
      args[i] = `${arg.split('=')[0]}=\${${variable}}`;
    } else if (!arg.includes('=') && isLiteral(args[i + 1])) {
      vars.add(variable);
      args[i + 1] = `\${${variable}}`;
    }
  });
  return args;
}

function convertUrl(name, url, vars) {
  let next = url.replace(/\/\/([^/@\s:]+):([^/@\s]+)@/, (match, user, pass) => {
    if (HAS_REF.test(user + pass)) return match;
    vars.add(varName(name, 'USER'));
    vars.add(varName(name, 'PASSWORD'));
    return `//\${${varName(name, 'USER')}}:\${${varName(name, 'PASSWORD')}}@`;
  });
  next = next.replace(/([?&])([^=&#]+)=([^&#]*)/g, (match, sep, key, value) => {
    if (!SECRET_KEY.test(key) || HAS_REF.test(value)) return match;
    vars.add(varName(name, key));
    return `${sep}${key}=\${${varName(name, key)}}`;
  });
  return next;
}

/** One Cursor server entry in Claude Code shape, with secrets replaced. */
export function convertServer(name, server, vars) {
  const out = {...server};
  if (server.env) out.env = convertEnv(server, vars);
  if (server.headers) out.headers = convertHeaders(name, server, vars);
  if (Array.isArray(server.args)) out.args = convertArgs(name, server, vars);
  if (typeof server.url === 'string') {
    out.url = convertUrl(name, server.url, vars);
    if (!out.type) out.type = /\/sse\/?$/.test(server.url) ? 'sse' : 'http';
  }
  return out;
}

export function toClaudeMcp(config) {
  const vars = new Set();
  const mcpServers = {};
  for (const [name, server] of Object.entries(config.mcpServers || {})) {
    mcpServers[name] = convertServer(name, server, vars);
  }
  return {config: {mcpServers}, vars: [...vars].sort()};
}

/** Writes .mcp.json and .env.example names; removes .cursor/mcp.json unless Cursor is kept. */
export function migrateMcp(rec, root, inventory) {
  if (!inventory.mcp || inventory.mcp.error) return [];
  if (inventory.existingMcpJson) return [{path: '.mcp.json', reason: 'exists already: merge servers by hand'}];
  const {config, vars} = toClaudeMcp(JSON.parse(readText(root, inventory.mcp.source)));
  rec.write('.mcp.json', JSON.stringify(config, null, 2) + '\n');
  if (vars.length > 0) {
    appendLines(rec, root, '.env.example', vars.map(name => `${name}=`), '# MCP server secrets (values go in .env, never in git)');
    appendLines(rec, root, '.gitignore', ['.env']);
  }
  if (!inventory.keepCursor && exists(root, inventory.mcp.source)) rec.remove(inventory.mcp.source);
  return [];
}
