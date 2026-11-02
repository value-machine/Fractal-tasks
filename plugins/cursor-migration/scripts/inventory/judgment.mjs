// Turns inventory findings into the numbered "needs your judgment" list.
// Each item is something the skill (model) or the user must decide before or during apply.

function ruleItems(inventory) {
  const items = [];
  for (const rule of inventory.rules) {
    for (const flag of rule.flags) items.push({kind: 'rule', paths: [rule.source], message: `${rule.name}: ${flag}`});
  }
  for (const path of inventory.ruleIndexFiles) {
    items.push({kind: 'index', paths: [path], message: 'rule index file: rewrite to point at the new locations, or remove'});
  }
  for (const path of inventory.ruleAttachments) {
    items.push({kind: 'attachment', paths: [path], message: 'non-rule file inside a rule folder: move it with its rule or drop it'});
  }
  return items;
}

function skillItems(inventory) {
  const items = [];
  for (const skill of inventory.cursorSkills.filter(row => row.action.startsWith('judgment'))) {
    items.push({
      kind: 'skill',
      paths: skill.problemFiles.map(file => file.path),
      message: `${skill.name}: ${skill.action.replace(/^judgment: /, '')} (${skill.problemFiles.length} file(s))`,
    });
  }
  for (const path of inventory.cursorSkillIndexFiles) {
    items.push({kind: 'index', paths: [path], message: 'skill index file: router config lists may point at .cursor/skills paths'});
  }
  for (const command of inventory.commands.filter(row => row.alreadyMigratedAs.length > 0)) {
    items.push({
      kind: 'command',
      paths: [command.source],
      message: `command ${command.name} already has skill(s): ${command.alreadyMigratedAs.join(', ')}; keep one, skip conversion`,
    });
  }
  return items;
}

function instructionItems(inventory) {
  const items = [];
  const {claudeMd, legacyCursorrules} = inventory.instructions;
  if (claudeMd.exists && !claudeMd.isShim) {
    items.push({kind: 'instructions', paths: ['CLAUDE.md'], message: 'CLAUDE.md has its own content: merge it into AGENTS.md or keep it below an @AGENTS.md import'});
  }
  if (legacyCursorrules) {
    items.push({kind: 'instructions', paths: ['.cursorrules'], message: '.cursorrules (legacy): merge its content into AGENTS.md'});
  }
  return items;
}

function environmentItems(inventory) {
  const items = [];
  const manual = inventory.references.filter(ref => ref.mode === 'manual');
  if (manual.length > 0) {
    items.push({
      kind: 'references',
      paths: [...new Set(manual.map(ref => ref.file))],
      message: `${manual.length} .cursor/ reference(s) need a manual edit (code, or no known target); see References`,
    });
  }
  if (inventory.mcp && inventory.mcp.rotateAdvised) {
    items.push({kind: 'mcp', paths: [inventory.mcp.source], message: 'literal secrets are in git history: rotate them, then use ${VAR} references'});
  }
  if (inventory.existingMcpJson && inventory.mcp) {
    items.push({kind: 'mcp', paths: ['.mcp.json'], message: '.mcp.json already exists: merge servers instead of overwriting'});
  }
  for (const path of inventory.nestedConfigs) {
    items.push({kind: 'nested', paths: [path], message: 'nested agent config: not converted in v1, migrate by hand'});
  }
  // An outdated copy is replaced by apply; only a locally edited one needs a decision.
  if (inventory.environment.syncScript.status === 'edited') {
    items.push({kind: 'sync-script', paths: [inventory.environment.syncScript.path], message: 'vendored sync script was edited locally: compare with the plugin template and upgrade by hand'});
  }
  return items;
}

/** Numbered list (J1, J2, …) of decisions that need a human or the skill's judgment. */
export function buildJudgment(inventory) {
  return [...instructionItems(inventory), ...ruleItems(inventory), ...skillItems(inventory), ...environmentItems(inventory)].map(
    (item, i) => ({id: `J${i + 1}`, ...item}),
  );
}
