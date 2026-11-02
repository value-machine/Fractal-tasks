export default [
  'build/',
  'dist/',
  'node_modules/',
  '.git/',
  '.wrangler/',
  'coverage/',
  '.eslintcache',
  '*.config.js',
  '*.config.ts',
  'eslint.ignores.js',
  'scripts/',
  'plugins/', // vendored Claude Code plugins (upstream style; own tests)
  '.claude/skills/', // generated mirror of .agents/skills (agent-sync.config.json)
  'pnpm-lock.yaml',
  'public/',
  'documentation/',
  'vite-plugin-*.ts', // Vite plugin files
];
