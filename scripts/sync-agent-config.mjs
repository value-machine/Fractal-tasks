// @generated-by cursor-migration: sync-agent-config v0.1.0
// Vendored copy. Edit plugins/cursor-migration/templates/sync-agent-config.mjs (cursor-migration plugin), not a copy.
//
// Keeps generated agent-config mirrors in sync with their sources, as listed in agent-sync.config.json:
//   kind "skills":       <source>/**      -> <target>/**       (byte-identical copy, e.g. .agents/skills -> .claude/skills)
//   kind "cursor-rules": <source>/**.md   -> <target>/**.mdc   (Claude `paths:` -> Cursor `globs` / `alwaysApply`)
// Only files listed in <target>/.generated.json are ever overwritten or deleted.
//
// Modes:
//   (default)   read sources from the working tree, write mirrors (on-demand refresh)
//   --staged    pre-commit: read sources from the git index, write mirrors, stage the changed mirror files.
//               Fails open: any error prints a warning and exits 0 (CI --check is the strict gate).
//   --check     exit 1 when mirrors drift from working-tree sources (CI / pre-push); exit 2 on error
//   --version
// Requires Node >= 20 and git >= 2.26. No dependencies.
import {execFileSync} from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import {dirname, join, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';

export const VERSION = '0.1.0';
export const CONFIG_FILE = 'agent-sync.config.json';
export const MANIFEST_FILE = '.generated.json';
const KINDS = new Set(['skills', 'cursor-rules']);
const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const IN_PROGRESS_MARKERS = [
  'MERGE_HEAD',
  'CHERRY_PICK_HEAD',
  'REVERT_HEAD',
  'rebase-merge',
  'rebase-apply',
];

// ---------- git helpers ----------

function git(root, args, input) {
  return execFileSync('git', args, {
    cwd: root,
    input,
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function repoRoot(cwd) {
  return resolve(
    git(cwd, ['rev-parse', '--show-toplevel']).toString('utf8').trim(),
  );
}

/** True while a merge, rebase, cherry-pick or revert is in progress. */
export function operationInProgress(root) {
  const gitDir = resolve(
    root,
    git(root, ['rev-parse', '--git-dir']).toString('utf8').trim(),
  );
  return IN_PROGRESS_MARKERS.some(marker => existsSync(join(gitDir, marker)));
}

function stagedPaths(root) {
  const out = git(root, ['diff', '--cached', '--name-only', '-z']).toString(
    'utf8',
  );
  return out.split('\0').filter(Boolean);
}

// ---------- path safety ----------

function hasControlChar(segment) {
  return [...segment].some(ch => ch.charCodeAt(0) < 0x20);
}

function isUnsafeSegment(segment) {
  return (
    segment === '' ||
    segment === '.' ||
    segment === '..' ||
    /[\\:*?"<>|]/.test(segment) ||
    hasControlChar(segment) ||
    /[ .]$/.test(segment) ||
    RESERVED_WINDOWS_NAMES.test(segment)
  );
}

/** Throws unless `rel` is a plain relative POSIX path that is safe to create on every OS. */
export function assertSafeRelPath(rel) {
  if (typeof rel !== 'string' || rel === '' || rel.startsWith('/')) {
    throw new Error(`unsafe path: ${JSON.stringify(rel)}`);
  }
  for (const segment of rel.split('/')) {
    if (isUnsafeSegment(segment)) {
      throw new Error(
        `unsafe path segment ${JSON.stringify(segment)} in ${rel}`,
      );
    }
  }
  return rel;
}

/** Absolute path for a repo-relative path; throws if it escapes `root` or crosses a symlink. */
function safeJoin(root, rel) {
  assertSafeRelPath(rel);
  const full = resolve(root, ...rel.split('/'));
  if (!full.startsWith(root + sep)) {
    throw new Error(`path escapes repo root: ${rel}`);
  }
  let current = root;
  for (const segment of rel.split('/').slice(0, -1)) {
    current = join(current, segment);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new Error(`refusing to write through symlink: ${current}`);
    }
  }
  return full;
}

// ---------- config ----------

/** Reads and validates agent-sync.config.json. */
export function loadConfig(root) {
  const raw = JSON.parse(readFileSync(join(root, CONFIG_FILE), 'utf8'));
  if (raw.version !== 1 || !Array.isArray(raw.mirrors)) {
    throw new Error(
      `${CONFIG_FILE}: expected {"version": 1, "mirrors": [...]}`,
    );
  }
  for (const m of raw.mirrors) {
    if (!KINDS.has(m.kind)) {
      throw new Error(`${CONFIG_FILE}: unknown kind ${JSON.stringify(m.kind)}`);
    }
    assertSafeRelPath(m.source);
    assertSafeRelPath(m.target);
  }
  return raw.mirrors;
}

// ---------- reading sources ----------

/** { relPathUnderDir: Buffer } for regular files under `dir` in the working tree; symlinks are skipped. */
export function readWorktreeDir(root, dir) {
  const files = new Map();
  const base = safeJoin(root, dir);
  if (!existsSync(base)) return files;
  const walk = (abs, rel) => {
    for (const entry of readdirSync(abs, {withFileTypes: true})) {
      if (entry.isSymbolicLink()) continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      const childAbs = join(abs, entry.name);
      if (entry.isDirectory()) walk(childAbs, childRel);
      else if (entry.isFile()) files.set(childRel, readFileSync(childAbs));
    }
  };
  walk(base, '');
  return files;
}

/** Parses `git cat-file --batch` output into blobs in request order. */
function parseCatFileBatch(buf, count) {
  const blobs = [];
  let offset = 0;
  for (let i = 0; i < count; i++) {
    const headerEnd = buf.indexOf(0x0a, offset);
    const [, type, size] = buf.toString('utf8', offset, headerEnd).split(' ');
    if (type !== 'blob') throw new Error(`git cat-file: unexpected ${type}`);
    const start = headerEnd + 1;
    blobs.push(buf.subarray(start, start + Number(size)));
    offset = start + Number(size) + 1;
  }
  return blobs;
}

/** { relPathUnderDir: Buffer } for files under `dir` as staged in the index; symlinks/submodules skipped. */
export function readIndexDir(root, dir) {
  const listing = git(root, ['ls-files', '-s', '-z', '--', dir]).toString(
    'utf8',
  );
  const entries = [];
  for (const record of listing.split('\0').filter(Boolean)) {
    const [meta, path] = record.split('\t');
    const [mode, sha, stage] = meta.split(' ');
    if (!path.startsWith(`${dir}/`)) continue;
    if (stage !== '0') throw new Error(`unmerged index entry: ${path}`);
    if (mode === '120000' || mode === '160000') continue;
    entries.push({rel: path.slice(dir.length + 1), sha});
  }
  const files = new Map();
  if (entries.length === 0) return files;
  const batch = git(
    root,
    ['cat-file', '--batch'],
    entries.map(e => e.sha).join('\n') + '\n',
  );
  parseCatFileBatch(batch, entries.length).forEach((blob, i) =>
    files.set(entries[i].rel, blob),
  );
  return files;
}

// ---------- transforms ----------

function unquote(value) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

/** Extracts the `paths:` globs from Claude rule frontmatter lines (inline list, flow list or block list). */
export function parsePaths(frontmatterLines) {
  const index = frontmatterLines.findIndex(line => /^paths:/.test(line));
  if (index === -1) return [];
  const inline = frontmatterLines[index].replace(/^paths:\s*/, '').trim();
  if (inline) {
    return inline
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(unquote)
      .filter(Boolean);
  }
  const globs = [];
  for (const line of frontmatterLines.slice(index + 1)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (!item) break;
    globs.push(unquote(item[1]));
  }
  return globs;
}

/** Converts a Claude Code rule (.claude/rules/*.md) into a Cursor rule (.mdc). */
export function claudeRuleToMdc(buffer) {
  const text = buffer.toString('utf8').replace(/\r\n/g, '\n');
  let frontmatter = [];
  let body = text;
  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---', 4);
    if (end !== -1) {
      frontmatter = text.slice(4, end).split('\n');
      body = text.slice(end + 4).replace(/^\n/, '');
    }
  }
  const globs = parsePaths(frontmatter);
  const header =
    globs.length > 0
      ? // JSON-array form: a comma-joined string would split brace globs like *.{ts,tsx}
        `globs: [${globs.map(glob => JSON.stringify(glob)).join(', ')}]\nalwaysApply: false`
      : 'alwaysApply: true';
  return Buffer.from(`---\n${header}\n---\n${body}`, 'utf8');
}

/** Maps source files to the mirror files they produce: { targetRel: Buffer }. */
export function buildMirror(kind, sourceFiles) {
  const out = new Map();
  for (const [rel, content] of sourceFiles) {
    if (kind === 'skills') {
      out.set(rel, content);
    } else if (rel.endsWith('.md')) {
      out.set(rel.replace(/\.md$/, '.mdc'), claudeRuleToMdc(content));
    }
  }
  return out;
}

// ---------- writing mirrors ----------

function readManifest(root, target) {
  const file = join(root, ...target.split('/'), MANIFEST_FILE);
  if (!existsSync(file)) return new Set();
  return new Set(JSON.parse(readFileSync(file, 'utf8')).files);
}

function manifestBuffer(mirror, files) {
  const body = {
    generator: `sync-agent-config v${VERSION}`,
    note: `Generated from ${mirror.source}. Edit the source, not these files.`,
    source: mirror.source,
    files: [...files].sort(),
  };
  return Buffer.from(JSON.stringify(body, null, 2) + '\n', 'utf8');
}

function sameBytes(abs, buffer) {
  return existsSync(abs) && readFileSync(abs).equals(buffer);
}

function atomicWrite(abs, buffer) {
  mkdirSync(dirname(abs), {recursive: true});
  const tmp = `${abs}.sync-tmp-${process.pid}`;
  writeFileSync(tmp, buffer);
  renameSync(tmp, abs);
}

function removeEmptyParents(abs, stopAt) {
  let dir = dirname(abs);
  while (dir.startsWith(stopAt + sep) && readdirSync(dir).length === 0) {
    rmdirSync(dir);
    dir = dirname(dir);
  }
}

/** Splits desired files into writes we own and hand-written files we must not overwrite. */
function planWrites(root, mirror, desired, owned) {
  const plan = new Map();
  const conflicts = [];
  for (const [rel, buffer] of desired) {
    const abs = safeJoin(root, `${mirror.target}/${rel}`);
    const handWritten = existsSync(abs) && !owned.has(rel);
    if (handWritten && !readFileSync(abs).equals(buffer)) {
      conflicts.push(`${mirror.target}/${rel}`);
    } else {
      plan.set(rel, {abs, buffer});
    }
  }
  return {plan, conflicts};
}

/**
 * Brings one mirror to the desired state. Returns repo-relative paths it changed and
 * hand-written files it refused to overwrite.
 */
export function writeMirror(root, mirror, desired) {
  const targetAbs = safeJoin(root, mirror.target);
  const owned = readManifest(root, mirror.target);
  if (desired.size === 0 && owned.size === 0)
    return {changed: [], conflicts: []};
  const {plan, conflicts} = planWrites(root, mirror, desired, owned);
  const manifestAbs = join(targetAbs, MANIFEST_FILE);
  const manifestBefore = existsSync(manifestAbs)
    ? readFileSync(manifestAbs)
    : null;
  const interim = new Set([...owned, ...plan.keys()]);
  if (interim.size > owned.size) {
    // Interim manifest covers old + new files, so a crash mid-write never orphans owned files.
    atomicWrite(manifestAbs, manifestBuffer(mirror, interim));
  }
  const changed = [
    ...writePlanned(mirror, plan),
    ...removeOrphans(root, mirror, owned, plan, targetAbs),
  ];
  const finalManifest = manifestBuffer(mirror, plan.keys());
  if (!sameBytes(manifestAbs, finalManifest))
    atomicWrite(manifestAbs, finalManifest);
  if (!manifestBefore || !manifestBefore.equals(finalManifest)) {
    changed.push(`${mirror.target}/${MANIFEST_FILE}`);
  }
  return {changed, conflicts};
}

function writePlanned(mirror, plan) {
  const changed = [];
  for (const [rel, {abs, buffer}] of plan) {
    if (!sameBytes(abs, buffer)) {
      atomicWrite(abs, buffer);
      changed.push(`${mirror.target}/${rel}`);
    }
  }
  return changed;
}

/** Deletes files the mirror owned (per manifest) that the source no longer produces. */
function removeOrphans(root, mirror, owned, plan, targetAbs) {
  const changed = [];
  for (const rel of owned) {
    if (plan.has(rel)) continue;
    const abs = safeJoin(root, `${mirror.target}/${rel}`);
    if (existsSync(abs)) {
      unlinkSync(abs);
      removeEmptyParents(abs, targetAbs);
      changed.push(`${mirror.target}/${rel}`);
    }
  }
  return changed;
}

/** Lists drift between the desired mirror and the working tree, without writing. */
export function diffMirror(root, mirror, desired) {
  const drift = [];
  const owned = readManifest(root, mirror.target);
  for (const [rel, buffer] of desired) {
    const abs = safeJoin(root, `${mirror.target}/${rel}`);
    if (!sameBytes(abs, buffer)) drift.push(`${mirror.target}/${rel}`);
  }
  for (const rel of owned) {
    const abs = safeJoin(root, `${mirror.target}/${rel}`);
    if (!desired.has(rel) && existsSync(abs))
      drift.push(`${mirror.target}/${rel}`);
  }
  const manifestAbs = join(safeJoin(root, mirror.target), MANIFEST_FILE);
  if (
    desired.size > 0 &&
    !sameBytes(manifestAbs, manifestBuffer(mirror, desired.keys()))
  ) {
    drift.push(`${mirror.target}/${MANIFEST_FILE}`);
  }
  return drift;
}

// ---------- modes ----------

function isRelevant(staged, mirrors) {
  return staged.some(
    path =>
      path === CONFIG_FILE ||
      mirrors.some(
        m => path.startsWith(`${m.source}/`) || path.startsWith(`${m.target}/`),
      ),
  );
}

function stage(root, paths) {
  if (paths.length === 0) return;
  git(
    root,
    ['add', '-A', '--pathspec-from-file=-', '--pathspec-file-nul'],
    paths.join('\0'),
  );
}

function runSync(root, {fromIndex}) {
  const mirrors = loadConfig(root);
  const changed = [];
  const conflicts = [];
  for (const mirror of mirrors) {
    const sources = fromIndex
      ? readIndexDir(root, mirror.source)
      : readWorktreeDir(root, mirror.source);
    const result = writeMirror(root, mirror, buildMirror(mirror.kind, sources));
    changed.push(...result.changed);
    conflicts.push(...result.conflicts);
  }
  return {changed, conflicts};
}

function runCheck(root) {
  const drift = [];
  for (const mirror of loadConfig(root)) {
    const desired = buildMirror(
      mirror.kind,
      readWorktreeDir(root, mirror.source),
    );
    drift.push(...diffMirror(root, mirror, desired));
  }
  return drift;
}

function reportConflicts(conflicts) {
  for (const path of conflicts) {
    console.warn(
      `[sync-agent-config] kept hand-written ${path} (not in ${MANIFEST_FILE}); rename or remove it to let the mirror own it`,
    );
  }
}

function stagedMode(root) {
  if (operationInProgress(root)) {
    console.warn(
      '[sync-agent-config] merge/rebase in progress — mirror sync skipped',
    );
    return 0;
  }
  const mirrors = loadConfig(root);
  if (!isRelevant(stagedPaths(root), mirrors)) return 0;
  const {changed, conflicts} = runSync(root, {fromIndex: true});
  reportConflicts(conflicts);
  stage(root, changed);
  if (changed.length > 0) {
    console.log(
      `[sync-agent-config] updated and staged ${changed.length} mirror file(s)`,
    );
  }
  return 0;
}

function checkMode(root) {
  const drift = runCheck(root);
  if (drift.length === 0) {
    console.log('[sync-agent-config] mirrors are in sync');
    return 0;
  }
  console.error('[sync-agent-config] mirrors drift from their sources:');
  for (const path of drift) console.error(`  ${path}`);
  console.error(
    'Fix: node scripts/sync-agent-config.mjs, then commit the result.',
  );
  return 1;
}

function defaultMode(root) {
  const {changed, conflicts} = runSync(root, {fromIndex: false});
  reportConflicts(conflicts);
  console.log(`[sync-agent-config] ${changed.length} mirror file(s) updated`);
  return 0;
}

/** CLI entry. Returns the process exit code. */
export function main(argv, cwd = process.cwd()) {
  const flags = new Set(argv);
  if (flags.has('--version')) {
    console.log(`sync-agent-config v${VERSION}`);
    return 0;
  }
  const staged = flags.has('--staged');
  try {
    const root = repoRoot(cwd);
    if (staged) return stagedMode(root);
    if (flags.has('--check')) return checkMode(root);
    return defaultMode(root);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (staged) {
      console.warn(
        `[sync-agent-config] WARNING: mirror sync skipped (${message}). Run node scripts/sync-agent-config.mjs; CI --check will flag drift.`,
      );
      return 0;
    }
    console.error(`[sync-agent-config] error: ${message}`);
    return 2;
  }
}

const invokedDirectly =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  process.exitCode = main(process.argv.slice(2));
}
