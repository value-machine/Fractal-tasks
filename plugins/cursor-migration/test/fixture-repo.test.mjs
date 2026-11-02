import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';

import {createFixtureRepo, readTree, toPosix} from './helpers/fixture-repo.mjs';

test('createFixtureRepo commits the file map and readTree returns exact bytes', () => {
  const crlf = 'line one\r\nline two\r\n';
  const withNul = Buffer.from([0xef, 0xbb, 0xbf, 0x23, 0x00, 0x0a]);
  const repo = createFixtureRepo({
    'dir with space/rule.md': crlf,
    '.gitignore': withNul,
    'a/b/c.txt': 'deep',
  });
  try {
    const tree = readTree(repo.dir);
    assert.deepEqual(Object.keys(tree), [
      '.gitignore',
      'a/b/c.txt',
      'dir with space/rule.md',
    ]);
    assert.equal(tree['dir with space/rule.md'].toString('utf8'), crlf);
    assert.deepEqual(tree['.gitignore'], withNul);
    assert.equal(repo.git(['status', '--porcelain']), '');
  } finally {
    repo.cleanup();
  }
  assert.equal(existsSync(repo.dir), false);
});

test('createFixtureRepo with commit: false leaves files untracked', () => {
  const repo = createFixtureRepo({'x.md': 'x'}, {commit: false});
  try {
    assert.match(repo.git(['status', '--porcelain']), /\?\? x\.md/);
  } finally {
    repo.cleanup();
  }
});

test('toPosix normalizes platform separators', () => {
  assert.equal(toPosix(join('a', 'b', 'c.md')), 'a/b/c.md');
});
