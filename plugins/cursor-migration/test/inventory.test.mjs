// Snapshot tests for the read-only inventory. Refresh snapshots with UPDATE_GOLDEN=1.
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {buildInventory} from '../scripts/inventory/build.mjs';
import {findMcpSecrets} from '../scripts/inventory/mcp.mjs';
import {proposeRewrite} from '../scripts/inventory/references.mjs';
import {classifyRule} from '../scripts/inventory/rules.mjs';
import {runInventory} from '../scripts/inventory.mjs';
import {splitFrontmatter, normalizeGlobs} from '../scripts/lib/frontmatter.mjs';
import {renderReport} from '../scripts/report.mjs';

import {FIXTURES} from './fixtures/repos.mjs';
import {createFixtureRepo, readTree} from './helpers/fixture-repo.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS = join(HERE, 'snapshots');
const TEMPLATE = join(HERE, '..', 'templates', 'sync-agent-config.mjs');

/** Drops machine-specific values so snapshots are stable across machines and CI. */
function normalize(inventory) {
  const copy = JSON.parse(JSON.stringify(inventory));
  delete copy.environment.tools;
  copy.environment.hooks.hooksPath = null;
  return copy;
}

function matchSnapshot(name, value) {
  const file = join(SNAPSHOTS, `${name}.inventory.json`);
  const actual = JSON.stringify(value, null, 2) + '\n';
  if (process.env.UPDATE_GOLDEN === '1') {
    mkdirSync(SNAPSHOTS, {recursive: true});
    writeFileSync(file, actual);
    return;
  }
  assert.ok(
    existsSync(file),
    `missing snapshot ${name}; run with UPDATE_GOLDEN=1`,
  );
  assert.equal(
    actual,
    readFileSync(file, 'utf8').replace(/\r\n/g, '\n'),
    `snapshot ${name} differs`,
  );
}

function inventoryOf(files, keepCursor = true) {
  const repo = createFixtureRepo(files);
  try {
    return {
      inventory: buildInventory(repo.dir, {keepCursor, templatePath: TEMPLATE}),
    };
  } finally {
    repo.cleanup();
  }
}

for (const [name, build] of Object.entries(FIXTURES)) {
  test(`inventory snapshot: ${name}`, () => {
    matchSnapshot(name, normalize(inventoryOf(build()).inventory));
  });
}

test('every fixture has a snapshot', () => {
  for (const name of Object.keys(FIXTURES)) {
    assert.ok(
      process.env.UPDATE_GOLDEN === '1' ||
        existsSync(join(SNAPSHOTS, `${name}.inventory.json`)),
      `fixture ${name} has no snapshot`,
    );
  }
});

test('folder-rules: classification, precedence, demotion, stubs, migrated command', () => {
  const {inventory} = inventoryOf(FIXTURES['folder-rules']());
  const rule = name => inventory.rules.find(row => row.name === name);
  assert.equal(rule('database').type, 'always');
  assert.ok(
    rule('database').flags.includes('precedence: alwaysApply wins over globs'),
  );
  assert.deepEqual(rule('database').demotionCandidate.proposedPaths, [
    '**/supabase/**',
  ]);
  assert.equal(rule('git-workflow').type, 'agent');
  assert.match(rule('git-workflow').flags.join(), /critical rule demoted/);
  assert.deepEqual(rule('cloud').globs, ['**/functions/**', '**/*.{ts,tsx}']);
  const skill = name => inventory.cursorSkills.find(row => row.name === name);
  assert.match(skill('plan').action, /^judgment: stub/);
  assert.deepEqual(
    skill('plan').problemFiles.map(file => file.path),
    ['.cursor/skills/plan/references/template.md'],
  );
  assert.equal(
    skill('finish').action,
    'remove stub (content already in .agents/skills)',
  );
  assert.equal(
    skill('legacy').action,
    'remove identical copy (same files in .agents/skills)',
  );
  assert.deepEqual(inventory.commands[0].alreadyMigratedAs, [
    'source-command-debug',
  ]);
  assert.equal(inventory.environment.syncScript.status, 'current');
  assert.deepEqual(
    inventory.excluded.map(item => item.path),
    ['.cursor/plans', '.cursor/worktrees.json', '.cursor/config'],
  );
});

test('folder-rules: references are auto, manual, stale or kept', () => {
  const {inventory} = inventoryOf(FIXTURES['folder-rules']());
  const find = (file, ref) =>
    inventory.references.find(row => row.file === file && row.ref === ref);
  assert.equal(
    find('.agents/skills/plan/SKILL.md', '.cursor/rules/database/RULE.md')
      .proposed,
    '.claude/rules/database.md',
  );
  assert.equal(
    find('.agents/skills/plan/SKILL.md', '.cursor/rules/database/RULE.md').mode,
    'auto',
  );
  assert.equal(
    find('.agents/skills/plan/SKILL.md', '.cursor/rules/INDEX.md').mode,
    'manual',
  );
  assert.equal(
    find('scripts/mode.cjs', '.cursor/config/git-workflow.json'),
    undefined,
    '.cursor/config stays',
  );
  assert.equal(
    find('.cursor/commands/debug.md', '.cursor/skills/plan/SKILL.md').proposed,
    '.agents/skills/plan/SKILL.md',
  );
  assert.ok(
    inventory.references.every(
      row => !row.file.startsWith('.cursor/skills/finish/'),
    ),
    'files of removed stubs are not scanned',
  );
});

test('mdc: types, MCP secret locations, history, stale references, judgment', () => {
  const {inventory} = inventoryOf(FIXTURES.mdc());
  assert.deepEqual(
    Object.fromEntries(inventory.rules.map(row => [row.name, row.type])),
    {frontend: 'path', notes: 'manual', release: 'agent', style: 'always'},
  );
  assert.deepEqual(inventory.rules.find(row => row.name === 'frontend').globs, [
    'src/**/*.{ts,tsx}',
    'app/**',
  ]);
  const servers = Object.fromEntries(
    inventory.mcp.servers.map(s => [s.name, s.secretLocations]),
  );
  assert.deepEqual(servers, {
    db: ['env.DB_TOKEN', 'args[2]'],
    docs: ['url query "token"'],
    safe: [],
  });
  assert.equal(inventory.mcp.rotateAdvised, true);
  const stale = inventory.references
    .filter(row => row.mode === 'stale')
    .map(row => row.ref);
  assert.deepEqual(stale, ['.cursor/commands/gone.md']);
  assert.equal(
    inventory.references.find(row => row.file === 'scripts/check.js').mode,
    'manual',
  );
  const agentsRefs = inventory.references.filter(
    row => row.file === 'AGENTS.md',
  );
  assert.deepEqual(
    agentsRefs.map(row => [row.ref, row.mode, row.proposed]),
    [
      ['.cursor/rules/release.mdc', 'auto', '.agents/skills/release/SKILL.md'],
      ['.cursor/rules/style.mdc', 'auto', '.claude/rules/style.md'],
    ],
  );
  assert.equal(inventory.cursorSkills[0].action, 'move to .agents/skills');
  const messages = inventory.judgment.map(item => item.message).join('\n');
  assert.match(messages, /CLAUDE\.md has its own content/);
  assert.match(messages, /critical rule demoted/);
  assert.match(messages, /rotate them/);
});

test('report never prints MCP secret values', () => {
  const {inventory} = inventoryOf(FIXTURES.mdc());
  const report = renderReport(inventory);
  const json = JSON.stringify(inventory);
  for (const secret of ['sk-live-123', 'token=xyz', '"abc"']) {
    assert.ok(!report.includes(secret), `report leaks ${secret}`);
    assert.ok(!json.includes(secret), `inventory leaks ${secret}`);
  }
});

test('report contains the required sections and judgment ids', () => {
  const {inventory} = inventoryOf(FIXTURES['folder-rules']());
  const report = renderReport(inventory);
  for (const heading of [
    '## How Cursor rule types map to Claude Code',
    '## Summary',
    '## Needs your judgment',
    '## Rules',
    '### Optional: scope always-on rules (opt-in, D15)',
    '## Commands',
    '## Skills in .agents/skills (mirrored to .claude/skills)',
    '## MCP servers',
    '## References to `.cursor/` paths',
    '## Not migrated',
  ]) {
    assert.ok(report.includes(heading), heading);
  }
  for (const item of inventory.judgment)
    assert.ok(report.includes(`| ${item.id} |`), item.id);
  assert.ok(
    report.includes('`**/supabase/**`'),
    'globs render as code, not bold',
  );
});

test('nested: nested configs are reported; node_modules is ignored', () => {
  const {inventory} = inventoryOf(FIXTURES.nested());
  assert.deepEqual(inventory.nestedConfigs, [
    'packages/web/.cursor',
    'packages/web/AGENTS.md',
  ]);
});

test('runInventory writes only under .git/cursor-migration and requires --keep-cursor', () => {
  const repo = createFixtureRepo(FIXTURES.mdc());
  try {
    const before = readTree(repo.dir);
    const {inventoryPath, reportPath} = runInventory({
      root: repo.dir,
      keepCursor: false,
    });
    assert.deepEqual(readTree(repo.dir), before, 'working tree untouched');
    assert.ok(existsSync(inventoryPath) && existsSync(reportPath));
    assert.match(
      inventoryPath.replace(/\\/g, '/'),
      /\/\.git\/cursor-migration\/inventory\.json$/,
    );
  } finally {
    repo.cleanup();
  }
});

test('frontmatter parser handles quoted, flow, block and folded values', () => {
  const {data, body} = splitFrontmatter(
    '﻿---\r\ndescription: >-\r\n  Two\r\n  lines\r\nglobs: ["a/**", "b/*.{ts,tsx}"]\r\nalwaysApply: false\r\ntags:\r\n  - x\r\n  - "y"\r\n---\r\nBody\r\n',
  );
  assert.deepEqual(data, {
    description: 'Two lines',
    globs: ['a/**', 'b/*.{ts,tsx}'],
    alwaysApply: false,
    tags: ['x', 'y'],
  });
  assert.equal(body, 'Body\n');
  assert.deepEqual(normalizeGlobs('src/**, lib/*.{js,mjs}'), [
    'src/**',
    'lib/*.{js,mjs}',
  ]);
});

test('classifyRule: alwaysApply wins, then globs, then description, else manual', () => {
  assert.equal(classifyRule({alwaysApply: true, globs: ['a']}).type, 'always');
  assert.equal(classifyRule({globs: 'a/**'}).type, 'path');
  assert.equal(classifyRule({description: 'x'}).type, 'agent');
  assert.equal(classifyRule({}).type, 'manual');
});

test('findMcpSecrets: userinfo URL and --flag=value args', () => {
  const [server] = findMcpSecrets({
    mcpServers: {
      x: {
        url: 'https://u:p@h.example/mcp',
        args: ['--token=abc', '--token=${T}'],
      },
    },
  });
  assert.deepEqual(server.secretLocations, ['args[0]', 'url userinfo']);
});

test('proposeRewrite maps folders and keeps live config', () => {
  const ctx = {
    ruleTargets: new Map(),
    commandTargets: new Map(),
    agentsSkillNames: new Set(),
  };
  assert.equal(proposeRewrite('.cursor/rules/', ctx), '.claude/rules/');
  assert.equal(proposeRewrite('.cursor/skills', ctx), '.agents/skills');
  assert.equal(proposeRewrite('.cursor/config/x.json', ctx), 'keep');
  assert.equal(proposeRewrite('.cursor/mcp.json', ctx), '.mcp.json');
  assert.equal(proposeRewrite('.cursor/rules/INDEX.md', ctx), null);
});

test('rewriteText: placeholder rule paths and contrast sentences', async () => {
  const {rewriteText} = await import('../scripts/inventory/references.mjs');
  const ctx = {
    ruleTargets: new Map([['db', '.claude/rules/db.md']]),
    commandTargets: new Map(),
    agentsSkillNames: new Set(['plan']),
  };
  assert.equal(
    rewriteText('Rules: `.cursor/rules/<name>/RULE.md`', ctx),
    'Rules: `.claude/rules/<name>.md`',
  );
  assert.equal(
    rewriteText('All: .cursor/rules/**/RULE.md.', ctx),
    'All: .claude/rules/**/*.md.',
  );
  const contrast =
    'Do not grow stubs under `.cursor/skills/`; SSOT is `.agents/skills/`.';
  assert.equal(
    rewriteText(contrast, ctx),
    contrast,
    'contrast sentence untouched',
  );
  assert.equal(
    rewriteText(
      'See .cursor/skills/plan/SKILL.md (SSOT .agents/skills) and .cursor/rules/db/RULE.md\r\nnext',
      ctx,
    ),
    'See .agents/skills/plan/SKILL.md (SSOT .agents/skills) and .claude/rules/db.md\r\nnext',
    'specific paths still rewrite on a contrast line; CRLF kept',
  );
});

test('rewriteText: a bare old folder in a sentence about stubs stays for review', async () => {
  const {rewriteText} = await import('../scripts/inventory/references.mjs');
  const ctx = {
    ruleTargets: new Map(),
    commandTargets: new Map(),
    agentsSkillNames: new Set(),
  };
  const line = 'Do not grow stubs under `.cursor/skills/`.';
  assert.equal(rewriteText(line, ctx), line);
  assert.equal(
    rewriteText('Skills live in `.cursor/skills/`.', ctx),
    'Skills live in `.agents/skills/`.',
  );
});

test('rewriteText: paths in the user home folder and longer folder names stay', async () => {
  const {rewriteText} = await import('../scripts/inventory/references.mjs');
  const ctx = {
    ruleTargets: new Map(),
    commandTargets: new Map(),
    agentsSkillNames: new Set(['plan']),
  };
  for (const line of [
    'Built-ins: `~/.cursor/skills-cursor/create-rule/SKILL.md`',
    'Plugins: $HOME/.cursor/skills/x and ~/.cursor/rules/',
    'Fixture: `.cursor/skills-cursor/` and `.cursor/rulesets/`',
  ]) {
    assert.equal(rewriteText(line, ctx), line);
  }
  assert.equal(
    rewriteText('Repo: `.cursor/skills/plan/SKILL.md`, home: `~/.cursor/skills/plan`', ctx),
    'Repo: `.agents/skills/plan/SKILL.md`, home: `~/.cursor/skills/plan`',
  );
});

test('short-form rule references and glob exclusions', async () => {
  const {rewriteText, globToRegExp} = await import(
    '../scripts/inventory/references.mjs'
  );
  const ctx = {
    ruleTargets: new Map([['architecture', '.claude/rules/architecture.md']]),
    commandTargets: new Map(),
    agentsSkillNames: new Set(),
  };
  assert.equal(
    rewriteText(
      'Always-on via architecture/RULE.md § Layer; unknown/RULE.md stays; x/architecture/RULE.md stays',
      ctx,
    ),
    'Always-on via .claude/rules/architecture.md § Layer; unknown/RULE.md stays; x/architecture/RULE.md stays',
  );
  assert.ok(globToRegExp('**/CHANGELOG*.md').test('CHANGELOG.md'));
  assert.ok(
    globToRegExp('**/CHANGELOG*.md').test('public/documentation/CHANGELOG.md'),
  );
  assert.ok(
    globToRegExp('documentation/jobs/**').test('documentation/jobs/a/b.md'),
  );
  assert.ok(!globToRegExp('plugins/*/test/**').test('plugins/a/scripts/x.mjs'));
});

test('inventory honors --exclude globs and records them', () => {
  const repo = createFixtureRepo({
    ...FIXTURES.mdc(),
    'documentation/jobs/old.md': 'See .cursor/rules/style.mdc\n',
  });
  try {
    const inventory = buildInventory(repo.dir, {
      keepCursor: false,
      templatePath: TEMPLATE,
      excludes: ['documentation/jobs/**'],
    });
    assert.deepEqual(inventory.excludes, ['documentation/jobs/**']);
    assert.ok(
      inventory.references.every(
        row => !row.file.startsWith('documentation/jobs/'),
      ),
    );
  } finally {
    repo.cleanup();
  }
});

test('rewriteText: specific old paths in a sentence about legacy copies stay for review', async () => {
  const {rewriteText} = await import('../scripts/inventory/references.mjs');
  const ctx = {
    ruleTargets: new Map(),
    commandTargets: new Map(),
    agentsSkillNames: new Set(['debug']),
  };
  const line = 'The `.cursor/skills/debug/` copies are legacy.';
  assert.equal(rewriteText(line, ctx), line);
  assert.equal(
    rewriteText('Run `.cursor/skills/debug/SKILL.md`.', ctx),
    'Run `.agents/skills/debug/SKILL.md`.',
  );
});

test('personal skills are a manual check: the inventory never reads the home folder', () => {
  const skill = body => `---\nname: x\ndescription: d\n---\n${body}\n`;
  const repo = createFixtureRepo({'.agents/skills/finish/SKILL.md': skill('repo finish')});
  try {
    const inventory = buildInventory(repo.dir, {keepCursor: true, templatePath: TEMPLATE});
    assert.ok(!('userConfig' in inventory));
    assert.ok(inventory.guidedSteps.some(step => step.id === 'personal-skills-shadow'));
    assert.match(renderReport(inventory), /compare the folder names with `\.agents\/skills`/);
  } finally {
    repo.cleanup();
  }
});

test('guided steps only appear when they apply', () => {
  const ids = (files, keepCursor) => {
    const repo = createFixtureRepo(files);
    try {
      return buildInventory(repo.dir, {
        keepCursor,
        templatePath: TEMPLATE,
      }).guidedSteps.map(step => step.id);
    } finally {
      repo.cleanup();
    }
  };
  assert.deepEqual(ids(FIXTURES.cursorrules(), false), [
    'claude-check-context',
    'claude-cloud-sessions',
    'cursor-user-rules',
  ]);
  const withMcp = ids(FIXTURES.mdc(), true);
  assert.ok(withMcp.includes('claude-approve-mcp'));
  assert.ok(withMcp.includes('cursor-third-party-configs'));
  assert.ok(withMcp.includes('personal-skills-shadow'), 'repo has skills: manual check shown');
});

test('rewriteText: an old path next to its new home on one line stays for review', async () => {
  const {rewriteText} = await import('../scripts/inventory/references.mjs');
  const ctx = {
    ruleTargets: new Map(),
    commandTargets: new Map(),
    agentsSkillNames: new Set(),
    pathExists: () => false,
  };
  const line = 'MCP config (`.mcp.json`, `.cursor/mcp.json`): use ${VAR}.';
  assert.equal(rewriteText(line, ctx), line);
  assert.equal(
    rewriteText('Servers: `.cursor/mcp.json`.', ctx),
    'Servers: `.mcp.json`.',
  );
});

test('folder rules named RULE.mdc are named after their folder, like RULE.md', () => {
  const repo = createFixtureRepo({
    '.cursor/rules/security/RULE.mdc':
      '---\nalwaysApply: true\n---\nNo secrets.\n',
    '.cursor/rules/testing/RULE.mdc':
      '---\ndescription: Tests\nglobs: tests/**\nalwaysApply: false\n---\nWrite tests.\n',
    'docs/a.md':
      'See .cursor/rules/security/RULE.mdc, testing/RULE.mdc and .cursor/rules/<name>/RULE.mdc.\n',
  });
  try {
    const inventory = buildInventory(repo.dir, {
      keepCursor: false,
      templatePath: TEMPLATE,
    });
    assert.deepEqual(
      inventory.rules.map(rule => [rule.name, rule.target, rule.flags]),
      [
        ['security', '.claude/rules/security.md', []],
        ['testing', '.claude/rules/testing.md', []],
      ],
    );
    assert.deepEqual(
      inventory.references.map(row => [row.ref, row.proposed]),
      [
        ['.cursor/rules/security/RULE.mdc', '.claude/rules/security.md'],
        ['testing/RULE.mdc', '.claude/rules/testing.md'],
        ['.cursor/rules/<name>/RULE.mdc', '.claude/rules/<name>.md'],
      ],
    );
  } finally {
    repo.cleanup();
  }
});

test('a copy of the skill inside the repo runs without the plugin manifest and never scans itself', async () => {
  const {cpSync} = await import('node:fs');
  const {execFileSync} = await import('node:child_process');
  const repo = createFixtureRepo(FIXTURES.mdc());
  try {
    const skill = join(repo.dir, '.agents/skills/cursor-migration');
    for (const folder of ['scripts', 'templates']) {
      cpSync(join(HERE, '..', folder), join(skill, folder), {recursive: true});
    }
    repo.git(['add', '-A']);
    repo.git(['commit', '-q', '-m', 'vendor skill']);
    execFileSync(
      process.execPath,
      [join(skill, 'scripts/inventory.mjs'), '--keep-cursor=no'],
      {cwd: repo.dir, stdio: 'pipe'},
    );
    const inventory = JSON.parse(
      readFileSync(
        join(repo.dir, '.git/cursor-migration/inventory.json'),
        'utf8',
      ),
    );
    assert.equal(inventory.generator, 'cursor-migration inventory copy');
    assert.ok(
      inventory.references.every(
        row => !row.file.startsWith('.agents/skills/cursor-migration/'),
      ),
    );
    assert.ok(inventory.rules.length > 0);
  } finally {
    repo.cleanup();
  }
});
