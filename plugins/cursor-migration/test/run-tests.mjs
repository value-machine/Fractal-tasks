// Runs every *.test.mjs under plugins/cursor-migration with `node --test`.
// Lists files explicitly: Node 20 (CI) has no glob support in `node --test`,
// and Node 24 rejects a bare directory argument.
import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function findTests(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === 'node_modules' ? [] : findTests(full);
    return entry.name.endsWith('.test.mjs') ? [full] : [];
  });
}

const files = findTests(pluginRoot).sort();
const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
});
process.exitCode = result.status ?? 1;
