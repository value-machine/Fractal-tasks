import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  assertSafeRelPath,
  claudeRuleToMdc,
  parsePaths,
} from '../templates/sync-agent-config.mjs';

import {createFixtureRepo, readTree} from './helpers/fixture-repo.mjs';

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'templates',
  'sync-agent-config.mjs',
);

const SKILLS_CONFIG = JSON.stringify({
  version: 1,
  mirrors: [
    {kind: 'skills', source: '.agents/skills', target: '.claude/skills'},
  ],
});

const BOTH_CONFIG = JSON.stringify({
  version: 1,
  mirrors: [
    {kind: 'skills', source: '.agents/skills', target: '.claude/skills'},
    {kind: 'cursor-rules', source: '.claude/rules', target: '.cursor/rules'},
  ],
});

function run(dir, args = []) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
  return {status: r.status, out: r.stdout + r.stderr};
}

function read(dir, rel) {
  return readFileSync(join(dir, ...rel.split('/')), 'utf8');
}

function write(dir, rel, content) {
  writeFileSync(join(dir, ...rel.split('/')), content);
}

function withRepo(files, fn) {
  const repo = createFixtureRepo(files);
  try {
    fn(repo);
  } finally {
    repo.cleanup();
  }
}

test('default mode mirrors skills byte-for-byte and is idempotent', () => {
  const crlf = '---\r\nname: a\r\n---\r\nbody\r\n';
  withRepo(
    {
      'agent-sync.config.json': SKILLS_CONFIG,
      '.agents/skills/a/SKILL.md': crlf,
      '.agents/skills/b with space/SKILL.md': 'b',
      '.agents/skills/b with space/references/x.md': 'x',
    },
    repo => {
      assert.equal(run(repo.dir).status, 0);
      assert.equal(read(repo.dir, '.claude/skills/a/SKILL.md'), crlf);
      assert.equal(
        read(repo.dir, '.claude/skills/b with space/references/x.md'),
        'x',
      );
      const manifest = JSON.parse(
        read(repo.dir, '.claude/skills/.generated.json'),
      );
      assert.deepEqual(manifest.files, [
        'a/SKILL.md',
        'b with space/SKILL.md',
        'b with space/references/x.md',
      ]);
      const before = readTree(repo.dir);
      assert.match(run(repo.dir).out, /0 mirror file\(s\) updated/);
      assert.deepEqual(readTree(repo.dir), before);
    },
  );
});

test('--staged mirrors only the staged version and stages the mirror', () => {
  withRepo(
    {
      'agent-sync.config.json': SKILLS_CONFIG,
      '.agents/skills/a/SKILL.md': 'v1',
    },
    repo => {
      write(repo.dir, '.agents/skills/a/SKILL.md', 'v2-staged');
      repo.git(['add', '.agents/skills/a/SKILL.md']);
      write(repo.dir, '.agents/skills/a/SKILL.md', 'v3-unstaged');
      assert.equal(run(repo.dir, ['--staged']).status, 0);
      assert.equal(
        repo.git(['show', ':.claude/skills/a/SKILL.md']),
        'v2-staged',
      );
      assert.equal(read(repo.dir, '.claude/skills/a/SKILL.md'), 'v2-staged');
      const staged = repo.git(['diff', '--cached', '--name-only']);
      assert.match(staged, /\.claude\/skills\/a\/SKILL\.md/);
      assert.match(staged, /\.claude\/skills\/\.generated\.json/);
      // The unstaged source edit stays unstaged.
      assert.equal(
        repo.git(['show', ':.agents/skills/a/SKILL.md']),
        'v2-staged',
      );
    },
  );
});

test('--staged does nothing when no source or mirror path is staged', () => {
  withRepo(
    {
      'agent-sync.config.json': SKILLS_CONFIG,
      '.agents/skills/a/SKILL.md': 'v1',
      'src/app.ts': 'x',
    },
    repo => {
      write(repo.dir, 'src/app.ts', 'y');
      repo.git(['add', 'src/app.ts']);
      assert.equal(run(repo.dir, ['--staged']).status, 0);
      assert.equal(existsSync(join(repo.dir, '.claude')), false);
    },
  );
});

test('--staged skips while a merge is in progress', () => {
  withRepo(
    {
      'agent-sync.config.json': SKILLS_CONFIG,
      '.agents/skills/a/SKILL.md': 'v1',
    },
    repo => {
      write(repo.dir, '.agents/skills/a/SKILL.md', 'v2');
      repo.git(['add', '-A']);
      writeFileSync(join(repo.dir, '.git', 'MERGE_HEAD'), 'deadbeef\n');
      const r = run(repo.dir, ['--staged']);
      assert.equal(r.status, 0);
      assert.match(r.out, /merge\/rebase in progress/);
      assert.equal(existsSync(join(repo.dir, '.claude')), false);
    },
  );
});

test('orphans are removed only when the manifest owns them; hand-written skills survive', () => {
  withRepo(
    {
      'agent-sync.config.json': SKILLS_CONFIG,
      '.agents/skills/keep/SKILL.md': 'keep',
      '.agents/skills/gone/SKILL.md': 'gone',
      '.claude/skills/mine/SKILL.md': 'hand-written',
      '.claude/skills/keep/SKILL.md': 'hand-written clash',
    },
    repo => {
      const first = run(repo.dir);
      assert.match(
        first.out,
        /kept hand-written \.claude\/skills\/keep\/SKILL\.md/,
      );
      assert.equal(
        read(repo.dir, '.claude/skills/keep/SKILL.md'),
        'hand-written clash',
      );
      assert.equal(read(repo.dir, '.claude/skills/gone/SKILL.md'), 'gone');
      repo.git(['rm', '-q', '-r', '.agents/skills/gone']);
      run(repo.dir);
      assert.equal(existsSync(join(repo.dir, '.claude/skills/gone')), false);
      assert.equal(
        read(repo.dir, '.claude/skills/mine/SKILL.md'),
        'hand-written',
      );
    },
  );
});

test('--check passes when in sync and fails on drift or a missing mirror file', () => {
  withRepo(
    {
      'agent-sync.config.json': SKILLS_CONFIG,
      '.agents/skills/a/SKILL.md': 'v1',
    },
    repo => {
      assert.equal(
        run(repo.dir, ['--check']).status,
        1,
        'never synced = drift',
      );
      run(repo.dir);
      assert.equal(run(repo.dir, ['--check']).status, 0);
      write(repo.dir, '.claude/skills/a/SKILL.md', 'edited by hand');
      const drift = run(repo.dir, ['--check']);
      assert.equal(drift.status, 1);
      assert.match(drift.out, /\.claude\/skills\/a\/SKILL\.md/);
    },
  );
});

test('cursor-rules mirror converts paths to globs and no paths to alwaysApply', () => {
  withRepo(
    {
      'agent-sync.config.json': BOTH_CONFIG,
      '.claude/rules/always.md': '# Always\nBe brief.\n',
      '.claude/rules/edge.md':
        "---\npaths:\n  - 'supabase/functions/**/*.ts'\n  - src/api/**\n---\nUse Deno.\n",
    },
    repo => {
      assert.equal(run(repo.dir).status, 0);
      assert.equal(
        read(repo.dir, '.cursor/rules/always.mdc'),
        '---\nalwaysApply: true\n---\n# Always\nBe brief.\n',
      );
      assert.equal(
        read(repo.dir, '.cursor/rules/edge.mdc'),
        '---\nglobs: ["supabase/functions/**/*.ts", "src/api/**"]\nalwaysApply: false\n---\nUse Deno.\n',
      );
      assert.equal(
        existsSync(join(repo.dir, '.claude/skills')),
        false,
        'no skills source, no mirror',
      );
    },
  );
});

test('--staged fails open on a broken config; --check fails strictly', () => {
  withRepo(
    {'agent-sync.config.json': '{ not json', '.agents/skills/a/SKILL.md': 'v1'},
    repo => {
      write(repo.dir, '.agents/skills/a/SKILL.md', 'v2');
      repo.git(['add', '-A']);
      const staged = run(repo.dir, ['--staged']);
      assert.equal(staged.status, 0);
      assert.match(staged.out, /WARNING: mirror sync skipped/);
      assert.equal(run(repo.dir, ['--check']).status, 2);
    },
  );
});

test('symlinked source entries are skipped', t => {
  withRepo(
    {
      'agent-sync.config.json': SKILLS_CONFIG,
      '.agents/skills/a/SKILL.md': 'a',
      'outside/secret.md': 'secret',
    },
    repo => {
      try {
        symlinkSync(
          join(repo.dir, 'outside'),
          join(repo.dir, '.agents/skills/linked'),
          'junction',
        );
      } catch {
        t.skip('cannot create symlinks or junctions here');
        return;
      }
      run(repo.dir);
      assert.equal(existsSync(join(repo.dir, '.claude/skills/linked')), false);
      assert.equal(read(repo.dir, '.claude/skills/a/SKILL.md'), 'a');
    },
  );
});

test('assertSafeRelPath rejects traversal, absolute, reserved and odd names', () => {
  for (const bad of [
    '../x',
    'a/../b',
    '/abs',
    'C:/x',
    'a//b',
    'con',
    'a/nul.md',
    'trailing.',
    'tab\tname',
    'pipe|x',
  ]) {
    assert.throws(() => assertSafeRelPath(bad), /unsafe/, bad);
  }
  assert.equal(
    assertSafeRelPath('.agents/skills/my skill/SKILL.md'),
    '.agents/skills/my skill/SKILL.md',
  );
});

test('parsePaths reads inline, flow and block lists', () => {
  assert.deepEqual(parsePaths(['paths: src/**, "lib/**"']), [
    'src/**',
    'lib/**',
  ]);
  assert.deepEqual(parsePaths(["paths: ['a/**', b]"]), ['a/**', 'b']);
  assert.deepEqual(
    parsePaths(['paths:', '  - x/**', '  - "y/**"', 'other: 1']),
    ['x/**', 'y/**'],
  );
  assert.deepEqual(parsePaths(['description: none']), []);
});

test('claudeRuleToMdc normalizes CRLF frontmatter', () => {
  const out = claudeRuleToMdc(
    Buffer.from('---\r\npaths: a/**\r\n---\r\nBody\r\n'),
  );
  assert.equal(
    out.toString('utf8'),
    '---\nglobs: ["a/**"]\nalwaysApply: false\n---\nBody\n',
  );
});

test('--version prints the stamped version', () => {
  const r = spawnSync(process.execPath, [SCRIPT, '--version'], {
    encoding: 'utf8',
  });
  assert.match(r.stdout, /^sync-agent-config v\d+\.\d+\.\d+/);
});
