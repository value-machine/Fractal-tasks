// Apply tests: expected trees (snapshots, UPDATE_GOLDEN=1 to refresh), idempotency, undo, refusals, secrets.
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {runApply, runUndo, TEMPLATE} from '../scripts/apply.mjs';
import {runInventory} from '../scripts/inventory.mjs';

import {FIXTURES} from './fixtures/repos.mjs';
import {createFixtureRepo, readTree} from './helpers/fixture-repo.mjs';

const SNAPSHOTS = join(dirname(fileURLToPath(import.meta.url)), 'snapshots');
const TEMPLATE_BYTES = readFileSync(TEMPLATE);

function quiet(fn) {
  const log = console.log;
  console.log = () => {};
  try {
    return fn();
  } finally {
    console.log = log;
  }
}

function prepared(files, keepCursor) {
  const repo = createFixtureRepo(files);
  quiet(() => runInventory({root: repo.dir, keepCursor}));
  return repo;
}

function apply(repo, options = {}) {
  return quiet(() => runApply({root: repo.dir, ...options}));
}

/** Tree as text; the vendored sync script is replaced by a marker when it equals the template. */
function treeText(dir) {
  return Object.fromEntries(
    Object.entries(readTree(dir)).map(([path, bytes]) => [
      path,
      bytes.equals(TEMPLATE_BYTES)
        ? '<sync-agent-config template>'
        : bytes.toString('utf8'),
    ]),
  );
}

function matchTree(name, tree) {
  const file = join(SNAPSHOTS, `${name}.applied-tree.json`);
  const actual = JSON.stringify(tree, null, 2) + '\n';
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
    `applied tree ${name} differs`,
  );
}

function commitAll(repo) {
  repo.git(['add', '-A']);
  repo.git(['commit', '-q', '-m', 'migrated']);
}

const CASES = [
  {name: 'mdc', keepCursor: false},
  {name: 'folder-rules', keepCursor: true},
  {name: 'cursorrules', keepCursor: false},
];

for (const {name, keepCursor} of CASES) {
  test(`apply snapshot: ${name} (keep Cursor: ${keepCursor})`, () => {
    const repo = prepared(FIXTURES[name](), keepCursor);
    try {
      apply(repo);
      matchTree(name, treeText(repo.dir));
    } finally {
      repo.cleanup();
    }
  });

  test(`apply is idempotent: ${name}`, () => {
    const repo = prepared(FIXTURES[name](), keepCursor);
    try {
      apply(repo);
      commitAll(repo);
      const before = readTree(repo.dir);
      quiet(() => runInventory({root: repo.dir, keepCursor}));
      const second = apply(repo);
      assert.deepEqual(second.changes, [], 'second apply changes nothing');
      assert.deepEqual(readTree(repo.dir), before);
    } finally {
      repo.cleanup();
    }
  });

  test(`undo restores the original tree byte for byte: ${name}`, () => {
    const repo = prepared(FIXTURES[name](), keepCursor);
    try {
      const original = readTree(repo.dir);
      apply(repo);
      runUndo({root: repo.dir});
      assert.deepEqual(readTree(repo.dir), original);
    } finally {
      repo.cleanup();
    }
  });
}

test('folder-rules: rules, generated Cursor rules, stubs and pending items', () => {
  const repo = prepared(FIXTURES['folder-rules'](), true);
  try {
    const result = apply(repo);
    const tree = treeText(repo.dir);
    assert.equal(
      tree['.claude/rules/database.md'],
      'Migrations go to staging.\n',
    );
    assert.match(
      tree['.claude/rules/cloud.md'],
      /paths:\n {2}- "\*\*\/functions\/\*\*"/,
    );
    assert.match(
      tree['.claude/rules/cloud.md'],
      /See \.claude\/rules\/database\.md\./,
      'body references rewritten',
    );
    assert.equal(
      tree['.cursor/rules/database.mdc'],
      '---\nalwaysApply: true\n---\nMigrations go to staging.\n',
    );
    assert.match(
      tree['.agents/skills/git-workflow/SKILL.md'],
      /description: "Ask where to work/,
    );
    assert.match(
      tree['AGENTS.md'],
      /`\.agents\/skills\/git-workflow\/SKILL\.md`/,
    );
    assert.ok(result.changes.length > 0);
  } finally {
    repo.cleanup();
  }
});

test('folder-rules: stubs, kept judgment items and hook', () => {
  const repo = prepared(FIXTURES['folder-rules'](), true);
  try {
    const result = apply(repo);
    const tree = treeText(repo.dir);
    assert.equal(
      tree['.cursor/skills/finish/SKILL.md'],
      undefined,
      'stub removed',
    );
    assert.equal(
      tree['.cursor/skills/legacy/SKILL.md'],
      undefined,
      'identical copy removed',
    );
    assert.ok(
      tree['.cursor/skills/plan/references/template.md'],
      'diverged stub kept for judgment',
    );
    assert.ok(
      tree['.cursor/commands/debug.md'],
      'already-migrated command kept for judgment',
    );
    assert.ok(tree['.cursor/config/git-workflow.json'], 'live config stays');
    assert.equal(
      tree['.husky/pre-commit'],
      'node scripts/sync-agent-config.mjs --staged\n',
      'hook already wired',
    );
    assert.ok(
      tree['.claude/skills/git-workflow/SKILL.md'],
      'mirror includes migrated skills',
    );
    const pendingPaths = result.pending.map(item => item.path);
    assert.ok(pendingPaths.includes('.cursor/skills/plan'));
    assert.ok(pendingPaths.includes('.cursor/commands/debug.md'));
  } finally {
    repo.cleanup();
  }
});

test('--scope-rules gives an approved always-on rule its proposed paths', () => {
  const repo = prepared(FIXTURES['folder-rules'](), true);
  try {
    apply(repo, {scopeRules: ['database']});
    const rule = readFileSync(
      join(repo.dir, '.claude/rules/database.md'),
      'utf8',
    );
    assert.equal(
      rule,
      '---\npaths:\n  - "**/supabase/**"\n---\nMigrations go to staging.\n',
    );
  } finally {
    repo.cleanup();
  }
});

test('MCP secrets never land in any file after apply', () => {
  const repo = prepared(FIXTURES.mdc(), false);
  try {
    apply(repo);
    const tree = treeText(repo.dir);
    for (const [path, text] of Object.entries(tree)) {
      for (const secret of ['sk-live-123', 'token=xyz', '"abc"']) {
        assert.ok(!text.includes(secret), `${secret} in ${path}`);
      }
    }
    assert.match(
      tree['.env.example'],
      /^# MCP server secrets[^\n]*\nDB_API_KEY=\nDB_TOKEN=\nDOCS_TOKEN=\n$/,
    );
    const mcp = JSON.parse(tree['.mcp.json']);
    assert.equal(mcp.mcpServers.docs.type, 'http');
    assert.equal(mcp.mcpServers.safe.env.API_KEY, '${API_KEY}');
    assert.equal(mcp.mcpServers.db.env.REGION, 'eu');
  } finally {
    repo.cleanup();
  }
});

test('.gitignore is appended byte-safe (BOM, NUL bytes, CRLF kept)', () => {
  const original = Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from('node_modules\r\n# x\0y\r\n'),
  ]);
  const repo = prepared(
    {...FIXTURES.cursorrules(), '.gitignore': original},
    false,
  );
  try {
    apply(repo);
    const after = readFileSync(join(repo.dir, '.gitignore'));
    assert.ok(
      after.subarray(0, original.length).equals(original),
      'original bytes untouched',
    );
    assert.equal(
      after.subarray(original.length).toString('utf8'),
      '.claude/settings.local.json\r\n.claude/worktrees/\r\n',
    );
  } finally {
    repo.cleanup();
  }
});

test('AGENTS.md rules table that already names a rule gets no second Rules block', () => {
  const repo = prepared(
    {
      '.cursor/rules/style.mdc': '---\nalwaysApply: true\n---\nBe brief.\n',
      '.cursor/rules/naming.mdc':
        '---\nalwaysApply: true\n---\nName by role.\n',
      'AGENTS.md':
        '# Agents\n\n## Rules\n\n| Rule | Description |\n|------|-------------|\n| style | Be brief |\n| `naming` | Name by role |\n',
    },
    false,
  );
  try {
    apply(repo);
    const agents = treeText(repo.dir)['AGENTS.md'];
    assert.doesNotMatch(agents, /cursor-migration:rules/);
    assert.equal(agents.match(/^## Rules$/gm).length, 1);
  } finally {
    repo.cleanup();
  }
});

test('cursorrules: AGENTS.md is created from .cursorrules and CLAUDE.md imports it', () => {
  const repo = prepared(FIXTURES.cursorrules(), false);
  try {
    apply(repo);
    const tree = treeText(repo.dir);
    assert.equal(
      tree['AGENTS.md'],
      '# Agent instructions\n\nAlways write tests first.\n',
    );
    assert.equal(tree['CLAUDE.md'], '@AGENTS.md\n');
    assert.equal(tree['.cursorrules'], undefined);
    quiet(() => runInventory({root: repo.dir, keepCursor: false}));
    commitAll(repo);
    const {inventory} = quiet(() =>
      runInventory({root: repo.dir, keepCursor: false}),
    );
    assert.deepEqual(
      [inventory.rules, inventory.commands, inventory.cursorSkills],
      [[], [], []],
      'nothing to migrate',
    );
    assert.equal(inventory.instructions.legacyCursorrules, null);
  } finally {
    repo.cleanup();
  }
});

test('apply refuses a dirty tree unless --allow-dirty', () => {
  const repo = prepared(FIXTURES.cursorrules(), false);
  try {
    writeFileSync(join(repo.dir, 'scratch.txt'), 'wip');
    assert.throws(() => apply(repo), /working tree has changes/);
    apply(repo, {allowDirty: true});
    assert.equal(readFileSync(join(repo.dir, 'scratch.txt'), 'utf8'), 'wip');
  } finally {
    repo.cleanup();
  }
});

test('apply refuses a stale inventory', () => {
  const repo = prepared(FIXTURES.mdc(), false);
  try {
    writeFileSync(
      join(repo.dir, '.cursor/rules/style.mdc'),
      '---\nalwaysApply: true\n---\nChanged.\n',
    );
    commitAll(repo);
    assert.throws(() => apply(repo), /sources changed since the report/);
  } finally {
    repo.cleanup();
  }
});

const RULE_ONLY = {
  '.cursor/rules/style.mdc': '---\nalwaysApply: true\n---\nBe brief.\n',
};

test('lefthook and pre-commit framework repos get a pending row with the exact snippet', () => {
  const cases = [
    {
      file: 'lefthook.yml',
      expect: /run: node scripts\/sync-agent-config\.mjs --staged/,
    },
    {
      file: '.pre-commit-config.yaml',
      expect:
        /entry: node scripts\/sync-agent-config\.mjs\n[\s\S]*language: system/,
    },
  ];
  for (const {file, expect} of cases) {
    const repo = prepared({...RULE_ONLY, [file]: 'existing: true\n'}, false);
    try {
      const result = apply(repo);
      const row = result.pending.find(item => item.path === file);
      assert.ok(row, `pending row for ${file}`);
      assert.match(row.reason, expect);
      assert.equal(
        readFileSync(join(repo.dir, file), 'utf8'),
        'existing: true\n',
        `${file} is not edited`,
      );
    } finally {
      repo.cleanup();
    }
  }
});

test('plain git repo: an existing .git/hooks/pre-commit keeps its shebang and body', () => {
  const repo = createFixtureRepo(RULE_ONLY);
  try {
    repo.git(['config', '--unset', 'core.hooksPath']);
    const hook = join(repo.dir, '.git', 'hooks', 'pre-commit');
    writeFileSync(hook, '#!/bin/bash\necho existing\n');
    quiet(() => runInventory({root: repo.dir, keepCursor: false}));
    const result = apply(repo);
    const text = readFileSync(hook, 'utf8');
    assert.match(text, /^#!\/bin\/bash\n# cursor-migration:/);
    assert.match(text, /node not found/);
    assert.match(text, /echo existing\n$/);
    assert.ok(
      result.pending.some(item => item.path === '.git/hooks/pre-commit'),
      'unshared hook is flagged',
    );
  } finally {
    repo.cleanup();
  }
});

test('repo without package.json migrates; the hook guards a missing node', () => {
  const repo = prepared(
    {
      ...RULE_ONLY,
      'pyproject.toml': '[project]\nname = "demo"\n',
      '.husky/pre-commit': 'make lint\n',
    },
    false,
  );
  try {
    apply(repo);
    const tree = treeText(repo.dir);
    assert.equal(tree['package.json'], undefined, 'no package.json is created');
    assert.ok(tree['.claude/rules/style.md']);
    assert.match(
      tree['.husky/pre-commit'],
      /command -v node[\s\S]*node not found[\s\S]*make lint\n$/,
    );
  } finally {
    repo.cleanup();
  }
});

test('an outdated vendored sync script is upgraded by apply and is not a judgment item', () => {
  const outdated = TEMPLATE_BYTES.toString('utf8').replace(
    /sync-agent-config v\d+\.\d+\.\d+/,
    'sync-agent-config v0.0.1',
  );
  const repo = prepared(
    {...RULE_ONLY, 'scripts/sync-agent-config.mjs': outdated},
    false,
  );
  try {
    const {inventory} = quiet(() =>
      runInventory({root: repo.dir, keepCursor: false}),
    );
    assert.equal(inventory.environment.syncScript.status, 'outdated');
    assert.ok(!inventory.judgment.some(item => item.kind === 'sync-script'));
    apply(repo);
    assert.ok(
      readFileSync(join(repo.dir, 'scripts/sync-agent-config.mjs')).equals(
        TEMPLATE_BYTES,
      ),
    );
  } finally {
    repo.cleanup();
  }
});

test('moved rules and commands keep their relative links pointing at the same files', () => {
  const repo = prepared(
    {
      '.cursor/rules/api/RULE.md':
        '---\nalwaysApply: true\n---\nSee [db](../db/RULE.md#top) and [guide](../../../docs/guide.md).\n',
      '.cursor/rules/db/RULE.md':
        '---\nalwaysApply: true\n---\nStaging only.\n',
      '.cursor/commands/review.md':
        'Read [guide](../../docs/guide.md) and [site](https://example.com).\n',
      'docs/guide.md': '# Guide\n',
    },
    false,
  );
  try {
    apply(repo);
    const tree = treeText(repo.dir);
    assert.match(
      tree['.claude/rules/api.md'],
      /\[db\]\(db\.md#top\) and \[guide\]\(\.\.\/\.\.\/docs\/guide\.md\)/,
    );
    assert.match(
      tree['.agents/skills/review/SKILL.md'],
      /\[guide\]\(\.\.\/\.\.\/\.\.\/docs\/guide\.md\) and \[site\]\(https:\/\/example\.com\)/,
    );
  } finally {
    repo.cleanup();
  }
});

test('extensionless scripts (git hook folders, shebang) are code: listed, never rewritten', () => {
  const repo = prepared(
    {
      ...FIXTURES.mdc(),
      '.husky/pre-commit':
        '# style lives in .cursor/rules/style.mdc\npnpm lint-staged\n',
      'bin/tool': '#!/bin/sh\ncat .cursor/rules/style.mdc\n',
      'package.json': '{"devDependencies": {"husky": "9.0.0"}}\n',
    },
    false,
  );
  try {
    const inventory = JSON.parse(
      readFileSync(
        join(repo.dir, '.git/cursor-migration/inventory.json'),
        'utf8',
      ),
    );
    const modes = Object.fromEntries(
      inventory.references.map(row => [row.file, row.mode]),
    );
    assert.deepEqual(
      [modes['.husky/pre-commit'], modes['bin/tool']],
      ['manual', 'manual'],
    );
    apply(repo);
    const tree = treeText(repo.dir);
    assert.match(
      tree['.husky/pre-commit'],
      /# style lives in \.cursor\/rules\/style\.mdc\n/,
      tree['.husky/pre-commit'],
    );
    assert.equal(tree['bin/tool'], '#!/bin/sh\ncat .cursor/rules/style.mdc\n');
  } finally {
    repo.cleanup();
  }
});

test('re-inventory reuses the apply excludes and does not flag the generated Cursor mirror', () => {
  const repo = createFixtureRepo(FIXTURES.mdc());
  try {
    quiet(() =>
      runInventory({
        root: repo.dir,
        keepCursor: true,
        excludes: ['documentation/jobs/**'],
      }),
    );
    apply(repo);
    writeFileSync(
      join(repo.dir, 'NOTES.md'),
      'Cursor reads the generated `.cursor/rules/` folder, e.g. .cursor/rules/style.mdc.\n',
    );
    mkdirSync(join(repo.dir, 'documentation/jobs'), {recursive: true});
    writeFileSync(
      join(repo.dir, 'documentation/jobs/old.md'),
      'Was in .cursor/skills/gone/SKILL.md\n',
    );
    commitAll(repo);
    const {inventory} = quiet(() =>
      runInventory({root: repo.dir, keepCursor: true}),
    );
    assert.deepEqual(inventory.excludes, ['documentation/jobs/**']);
    const files = inventory.references.map(row => row.file);
    assert.ok(
      !files.includes('NOTES.md') &&
        !files.includes('documentation/jobs/old.md'),
      files.join(', '),
    );
  } finally {
    repo.cleanup();
  }
});
