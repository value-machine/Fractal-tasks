// Cursor skills (stubs vs real copies), Cursor commands (D9) and the .agents/skills summary.
import {agentsAdapter, SKILLS_DIR} from '../adapters/agents.mjs';
import {exists, readBytes} from '../lib/fs-utils.mjs';

const CURSOR_SKILLS_DIR = '.cursor/skills';

function compareFile(root, cursorPath, name) {
  const rel = cursorPath.slice(`${CURSOR_SKILLS_DIR}/${name}/`.length);
  const agentsPath = `${SKILLS_DIR}/${name}/${rel}`;
  if (!exists(root, agentsPath)) return {path: cursorPath, status: 'only-in-cursor'};
  const same = readBytes(root, cursorPath).equals(readBytes(root, agentsPath));
  return {path: cursorPath, status: same ? 'identical' : 'differs', counterpart: agentsPath};
}

function isRedirectStub(root, skill) {
  const skillFile = `${CURSOR_SKILLS_DIR}/${skill.name}/SKILL.md`;
  if (!exists(root, skillFile)) return false;
  return readBytes(root, skillFile).toString('utf8').includes(`.agents/skills/${skill.name}`);
}

function cursorSkillAction(stub, hasAgentsCopy, problemFiles) {
  if (!hasAgentsCopy) return 'move to .agents/skills';
  if (problemFiles.length === 0) {
    return stub ? 'remove stub (content already in .agents/skills)' : 'remove identical copy (same files in .agents/skills)';
  }
  if (stub) return 'judgment: stub has files that differ from or are missing in .agents/skills';
  return 'judgment: two real copies of this skill';
}

/** Per Cursor skill folder: stub or not, per-file comparison with .agents/skills, proposed action. */
export function buildCursorSkillRows(root, cursorSkills, agentsSkillNames) {
  return cursorSkills.map(skill => {
    const stub = isRedirectStub(root, skill);
    const hasAgentsCopy = agentsSkillNames.has(skill.name);
    const files = hasAgentsCopy ? skill.files.map(path => compareFile(root, path, skill.name)) : [];
    const problemFiles = files.filter(
      file => file.status !== 'identical' && !(stub && file.path.endsWith(`/${skill.name}/SKILL.md`)),
    );
    return {
      name: skill.name,
      stub,
      fileCount: skill.files.length,
      problemFiles,
      action: cursorSkillAction(stub, hasAgentsCopy, problemFiles),
    };
  });
}

/** Skills in .agents/skills that already look like a migration of this command. */
function alreadyMigratedAs(command, agentsSkills) {
  return agentsSkills
    .filter(
      skill =>
        skill.name === command.name ||
        skill.name === `source-command-${command.name}` ||
        skill.text.includes(command.source),
    )
    .map(skill => skill.name);
}

/** Cursor commands become skills with disable-model-invocation (D9) unless already migrated. */
export function buildCommandRows(commands, agentsSkills) {
  return commands.map(command => {
    const matches = alreadyMigratedAs(command, agentsSkills);
    return {
      name: command.name,
      source: command.source,
      bytes: command.bytes,
      target: agentsAdapter.skillTarget(command.name),
      alreadyMigratedAs: matches,
      action: matches.length > 0 ? 'judgment: already migrated' : 'convert to skill (disable-model-invocation: true)',
    };
  });
}

/** Summary of the neutral skills library, including the disable-model-invocation column. */
export function summarizeAgentsSkills(agentsSkills) {
  return agentsSkills.map(skill => ({
    name: skill.name,
    files: skill.files.length,
    disableModelInvocation:
      skill.frontmatter['disable-model-invocation'] === true
        ? true
        : skill.frontmatter['disable-model-invocation'] === false
          ? false
          : null,
  }));
}
