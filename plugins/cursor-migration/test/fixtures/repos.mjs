// Fixture repos as file maps (see helpers/fixture-repo.mjs for why they are not checked-in folders).
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const TEMPLATE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'templates',
  'sync-agent-config.mjs',
);

/** Legacy single-file Cursor setup. */
export function cursorrulesRepo() {
  return {
    '.cursorrules': 'Always write tests first.\n',
    'README.md': '# Demo\n',
  };
}

/** Modern .mdc rules of every type, a command, a real Cursor skill, MCP with secrets, references. */
export function mdcRepo() {
  return {
    '.cursor/rules/style.mdc': '---\nalwaysApply: true\n---\nBe brief.\n',
    '.cursor/rules/frontend.mdc':
      '---\ndescription: Frontend\nglobs: src/**/*.{ts,tsx}, app/**\nalwaysApply: false\n---\nUse hooks.\n',
    '.cursor/rules/release.mdc':
      '---\ndescription: Release checklist\n---\nTag, then deploy.\n',
    '.cursor/rules/notes.mdc': '# Notes\nOnly when asked.\n',
    '.cursor/commands/deploy.md': '# deploy\nRun the deploy.\n',
    '.cursor/skills/lint-fix/SKILL.md':
      '---\nname: lint-fix\ndescription: Fix lint\n---\nRun eslint --fix.\n',
    '.cursor/mcp.json': JSON.stringify(
      {
        mcpServers: {
          db: {
            command: 'npx',
            args: ['db-mcp', '--api-key', 'sk-live-123'],
            env: {DB_TOKEN: 'abc', REGION: 'eu'},
          },
          docs: {
            url: 'https://docs.example.com/mcp?token=xyz',
            headers: {Authorization: 'Bearer ${DOCS_TOKEN}'},
          },
          safe: {
            command: 'node',
            args: ['server.js'],
            env: {API_KEY: '${API_KEY}'},
          },
        },
      },
      null,
      2,
    ),
    '.cursor/debug.log': 'log line\n',
    'AGENTS.md':
      '# Agents\n\nYou must follow `.cursor/rules/release.mdc` before tagging.\nStyle lives in .cursor/rules/style.mdc\n',
    'CLAUDE.md': '# Claude notes\nPrefer small diffs.\n',
    'docs/guide.md':
      'See .cursor/commands/deploy.md and .cursor/rules/ and .cursor/commands/gone.md\n',
    'scripts/check.js': "const RULE = '.cursor/rules/frontend.mdc';\n",
    '.husky/pre-commit': 'pnpm lint-staged\n',
  };
}

/** Folder rules: RULE.md folders, index files, redirect stubs, diverged references, migrated command. */
export function folderRulesRepo() {
  const stub = name =>
    `---\nname: ${name}\ndescription: Redirect\n---\nSSOT moved: use [.agents/skills/${name}/SKILL.md](../../.agents/skills/${name}/SKILL.md).\n`;
  return {
    '.cursor/rules/database/RULE.md':
      '---\ndescription: "Database"\nalwaysApply: true\nglobs: ["**/supabase/**"]\n---\nMigrations go to staging.\n',
    '.cursor/rules/git-workflow/RULE.md':
      '---\ndescription: "Ask where to work before changing branches"\nalwaysApply: false\n---\nAsk first.\n',
    '.cursor/rules/cloud/RULE.md':
      '---\ndescription: "Edge functions"\nalwaysApply: false\nglobs: ["**/functions/**", "**/*.{ts,tsx}"]\n---\nSee .cursor/rules/database/RULE.md.\n',
    '.cursor/rules/INDEX.md': '| database | .cursor/rules/database/RULE.md |\n',
    '.cursor/skills/INDEX.md': 'plan -> .cursor/skills/plan/SKILL.md\n',
    '.cursor/skills/plan/SKILL.md': stub('plan'),
    '.cursor/skills/plan/references/template.md': 'old template\n',
    '.cursor/skills/finish/SKILL.md': stub('finish'),
    '.cursor/skills/legacy/SKILL.md': '---\nname: legacy\n---\nSame.\n',
    '.cursor/commands/debug.md': '# debug\nSee .cursor/skills/plan/SKILL.md\n',
    '.cursor/config/git-workflow.json': '{"mode":"feature-branch"}\n',
    '.cursor/plans/a.plan.md': '# plan\n',
    '.cursor/worktrees.json': '{}\n',
    '.agents/skills/plan/SKILL.md':
      '---\nname: plan\ndescription: Plan\n---\nRead .cursor/rules/database/RULE.md and .cursor/rules/INDEX.md.\n',
    '.agents/skills/plan/references/template.md': 'new template\n',
    '.agents/skills/finish/SKILL.md':
      '---\nname: finish\ndescription: Finish\ndisable-model-invocation: true\n---\nCommit.\n',
    '.agents/skills/legacy/SKILL.md': '---\nname: legacy\n---\nSame.\n',
    '.agents/skills/source-command-debug/SKILL.md':
      '---\nname: source-command-debug\ndescription: Migrated source command `debug`\n---\nDebug.\n',
    'AGENTS.md':
      '# Agents\n\n**Before changing HEAD:** always ask (`.cursor/rules/git-workflow/RULE.md`).\n',
    'CLAUDE.md': '@AGENTS.md\n',
    'scripts/sync-agent-config.mjs': readFileSync(TEMPLATE),
    'scripts/mode.cjs': "readFileSync('.cursor/config/git-workflow.json')\n",
    '.husky/pre-commit': 'node scripts/sync-agent-config.mjs --staged\n',
  };
}

/** Monorepo with a nested Cursor config and nested AGENTS.md. */
export function nestedRepo() {
  return {
    'AGENTS.md': '# Root\n',
    'packages/web/.cursor/rules/web.mdc': '---\nalwaysApply: true\n---\nWeb.\n',
    'packages/web/AGENTS.md': '# Web\n',
    'node_modules/pkg/.cursor/rules/ignored.mdc': 'ignored\n',
  };
}

export const FIXTURES = {
  cursorrules: cursorrulesRepo,
  mdc: mdcRepo,
  'folder-rules': folderRulesRepo,
  nested: nestedRepo,
};
