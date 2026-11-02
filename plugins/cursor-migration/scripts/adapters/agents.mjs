// Neutral agent-config adapter: AGENTS.md and .agents/skills (read by Cursor, Copilot, Codex).
import {splitFrontmatter} from '../lib/frontmatter.mjs';
import {exists, listDirs, listFiles, readBytes, readText} from '../lib/fs-utils.mjs';

export const SKILLS_DIR = '.agents/skills';

export const agentsAdapter = {
  id: 'agents',

  detect(root) {
    return exists(root, 'AGENTS.md') || exists(root, SKILLS_DIR);
  },

  readSkills(root) {
    return listDirs(root, SKILLS_DIR).map(name => {
      const skillFile = `${SKILLS_DIR}/${name}/SKILL.md`;
      const text = exists(root, skillFile) ? readText(root, skillFile) : '';
      return {
        name,
        files: listFiles(root, `${SKILLS_DIR}/${name}`),
        frontmatter: splitFrontmatter(text).data,
        text,
      };
    });
  },

  readAgentsMd(root) {
    if (!exists(root, 'AGENTS.md')) return {exists: false, bytes: 0, text: ''};
    return {exists: true, bytes: readBytes(root, 'AGENTS.md').length, text: readText(root, 'AGENTS.md')};
  },

  skillTarget(name) {
    return `${SKILLS_DIR}/${name}/SKILL.md`;
  },
};
