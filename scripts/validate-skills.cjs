#!/usr/bin/env node
/**
 * Skill admission check — no skill lands in .agents/skills/ unless the catalog knows it
 * and it follows the recurring structure.
 * Registry SSOT: .agents/skills/router/references/catalog.md
 * Baseline SSOT: .agents/skills/router/references/baseline-sections.md (v0.42.0 headings)
 * Structure SSOT: .agents/skills/meta-write-skill/references/skill-template.md
 *
 * Usage:
 *   node scripts/validate-skills.cjs                  → "validate-skills: OK (…)", exit 0 | errors, exit 1
 *   node scripts/validate-skills.cjs --snapshot <ref> → rewrite baseline-sections.md from git <ref>
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const SKILLS_DIR = path.join(".agents", "skills");
const CATALOG = path.join(SKILLS_DIR, "router", "references", "catalog.md");
const BASELINE = path.join(SKILLS_DIR, "router", "references", "baseline-sections.md");
const NAME_PATTERN = /^(router|(loop|spec|meta)-[a-z]+(-[a-z]+)*)$/;
const SECTIONS = ["Edges", "Steps", "Examples", "Output", "Not for"];
const EDGE_FIELDS = ["In", "Out", "Calls", "Called by", "Next", "Owner stops"];
const PORT_STATUSES = new Set(["kept", "moved", "dropped"]);
const MAX_DESCRIPTION = 1024;
const SKILL_LINK = /\]\(\.\.\/([a-z0-9-]+)\/SKILL\.md\)/g;

/** @param {string} text */
function stripCode(text) {
  return text.replace(/`/g, "").trim();
}

/** @param {string} heading */
function normalizeHeading(heading) {
  return stripCode(heading.replace(/^#+\s*/, "").replace(/^§\s*/, "")).toLowerCase();
}

/**
 * Markdown table rows (cells trimmed), skipping header and separator rows.
 * @param {string} text
 * @returns {string[][]}
 */
function tableRows(text) {
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    rows.push(cells);
  }
  return rows;
}

/**
 * Text of one `## <title>` section, up to the next `## ` heading.
 * @param {string} text
 * @param {string} title
 */
function section(text, title) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${title}`);
  if (start === -1) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

/**
 * `## ` / `### ` headings outside code fences.
 * @param {string} text
 */
function headings(text) {
  const found = [];
  let inFence = false;
  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    else if (!inFence && /^#{2,3} /.test(line)) found.push(line.trim());
  }
  return found;
}

/**
 * Minimal frontmatter reader: `key: value` and folded `key: >-` blocks.
 * @param {string} text
 * @returns {Record<string, string> | null}
 */
function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!match) return null;
  const data = {};
  let key = null;
  for (const line of match[1].split("\n")) {
    const pair = /^([a-z_-]+):\s*(.*)$/i.exec(line);
    if (pair) {
      key = pair[1];
      data[key] = /^[>|]-?$/.test(pair[2]) ? "" : pair[2].replace(/^["']|["']$/g, "");
    } else if (key && /^\s+\S/.test(line)) {
      data[key] = `${data[key]} ${line.trim()}`.trim();
    }
  }
  return data;
}

/** @param {string} file */
function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

/** @param {string} cell */
function skillNames(cell) {
  return [...cell.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]);
}

/**
 * @param {string} rootDir
 * @returns {{skills: Map<string, {status: string, sources: string[]}>, retired: Set<string>} | null}
 */
function readCatalog(rootDir) {
  const text = readIfExists(path.join(rootDir, CATALOG));
  if (text === null) return null;
  const skills = new Map();
  for (const [name, status, sources] of tableRows(section(text, "Skills")).slice(1)) {
    skills.set(stripCode(name), { status: stripCode(status), sources: skillNames(sources || "") });
  }
  const retired = new Set();
  for (const [source] of tableRows(section(text, "Retired without a skill")).slice(1)) {
    retired.add(stripCode(source));
  }
  return { skills, retired };
}

/**
 * @param {string} rootDir
 * @returns {Map<string, string[]>} skill → normalized headings
 */
function readBaseline(rootDir) {
  const text = readIfExists(path.join(rootDir, BASELINE)) || "";
  const baseline = new Map();
  let current = null;
  for (const line of text.split("\n")) {
    const skill = /^## `([a-z0-9-]+)`$/.exec(line);
    const item = /^- `(#{2,3} .+)`$/.exec(line);
    if (skill) baseline.set((current = skill[1]), []);
    else if (item && current) baseline.get(current).push(normalizeHeading(item[1]));
  }
  return baseline;
}

/**
 * @param {string} text SKILL.md contents
 * @returns {Map<string, string>} edge field → value cell
 */
function edgeFields(text) {
  const fields = new Map();
  for (const [field, value] of tableRows(section(text, "Edges"))) {
    if (field !== "Field") fields.set(field, value || "");
  }
  return fields;
}

/** @param {string} cell */
function linkedSkills(cell) {
  return [...(cell || "").matchAll(SKILL_LINK)].map((m) => m[1]);
}

/**
 * Checks 2–4, 8, 9 for one built skill.
 * @param {string} name
 * @param {string} text
 * @param {string} dir
 * @returns {string[]}
 */
function checkSkillFile(name, text, dir) {
  const errors = [];
  const meta = frontmatter(text);
  if (!NAME_PATTERN.test(name)) errors.push(`${name}: name must be router | loop-* | spec-* | meta-*`);
  if (!meta) return [...errors, `${name}: missing frontmatter`];
  if (meta.name !== name) errors.push(`${name}: frontmatter name "${meta.name}" ≠ folder`);
  const description = meta.description || "";
  if (!description) errors.push(`${name}: missing description`);
  if (description.length > MAX_DESCRIPTION) errors.push(`${name}: description over ${MAX_DESCRIPTION} characters`);
  if (description && !/use when/i.test(description)) errors.push(`${name}: description lacks "Use when"`);
  const order = headings(text).filter((h) => h.startsWith("## ")).map((h) => h.slice(3));
  const present = SECTIONS.filter((s) => order.includes(s));
  if (present.length !== SECTIONS.length) {
    errors.push(`${name}: missing sections ${SECTIONS.filter((s) => !order.includes(s)).join(", ")}`);
  } else if (present.map((s) => order.indexOf(s)).some((i, k, a) => k > 0 && i < a[k - 1])) {
    errors.push(`${name}: sections out of order (want ${SECTIONS.join(" → ")})`);
  }
  const edges = edgeFields(text);
  const missingEdges = EDGE_FIELDS.filter((f) => !edges.has(f));
  if (missingEdges.length) errors.push(`${name}: Edges missing ${missingEdges.join(", ")}`);
  if (name.startsWith("spec-")) {
    const callers = new Set(linkedSkills(edges.get("Called by")).filter((s) => s === "router" || s.startsWith("loop-")));
    if (callers.size < 2) errors.push(`${name}: a specialist needs ≥ 2 loop callers (skill-loop D53), has ${callers.size}`);
  }
  if (name.startsWith("loop-") && !hasEvalCase(dir)) errors.push(`${name}: loop skills need evals/<case>/prompt.md (skill-loop D59)`);
  return errors;
}

/** @param {string} dir */
function hasEvalCase(dir) {
  const evals = path.join(dir, "evals");
  if (!fs.existsSync(evals)) return false;
  return fs.readdirSync(evals).some((c) => fs.existsSync(path.join(evals, c, "prompt.md")));
}

/**
 * Check 5: Calls ⇄ Called by between built skills.
 * @param {Map<string, Map<string, string>>} edgesBySkill
 */
function checkReciprocity(edgesBySkill) {
  const errors = [];
  for (const [name, edges] of edgesBySkill) {
    for (const callee of linkedSkills(edges.get("Calls"))) {
      const other = edgesBySkill.get(callee);
      if (other && !linkedSkills(other.get("Called by")).includes(name)) {
        errors.push(`${name} calls ${callee}, but ${callee} § Called by does not list ${name}`);
      }
    }
    for (const caller of linkedSkills(edges.get("Called by"))) {
      const other = edgesBySkill.get(caller);
      if (other && !linkedSkills(other.get("Calls")).includes(name)) {
        errors.push(`${name} lists ${caller} in Called by, but ${caller} § Calls does not link ${name}`);
      }
    }
  }
  return errors;
}

/**
 * Port-map rows of one skill: source → covered headings; plus format errors.
 * @param {string} name
 * @param {string | null} text
 */
function readPortMap(name, text) {
  const covered = new Map();
  const errors = [];
  for (const [source, sectionCell, status, where] of tableRows(text || "").slice(1)) {
    const key = stripCode(source);
    const state = stripCode(status || "").toLowerCase();
    if (!PORT_STATUSES.has(state)) errors.push(`${name} PORT_MAP: "${key} ${sectionCell}" has status "${status}"`);
    if (state === "dropped" && !stripCode(where || "")) errors.push(`${name} PORT_MAP: dropped "${sectionCell}" needs a reason`);
    if (!covered.has(key)) covered.set(key, new Set());
    covered.get(key).add(normalizeHeading(sectionCell || ""));
  }
  return { covered, errors };
}

/**
 * Check 7: port maps exist, are well-formed, and cover every baseline heading once a source is fully replaced.
 * @param {string} rootDir
 * @param {Map<string, {status: string, sources: string[]}>} catalogSkills
 * @param {Map<string, string[]>} baseline
 */
function checkPortMaps(rootDir, catalogSkills, baseline) {
  const errors = [];
  const coverage = new Map();
  for (const [name, row] of catalogSkills) {
    if (row.status !== "built" || row.sources.length === 0) continue;
    const text = readIfExists(path.join(rootDir, SKILLS_DIR, name, "references", "PORT_MAP.md"));
    if (text === null) {
      errors.push(`${name}: references/PORT_MAP.md required (replaces ${row.sources.join(", ")})`);
      continue;
    }
    const parsed = readPortMap(name, text);
    errors.push(...parsed.errors);
    for (const [source, set] of parsed.covered) {
      if (!coverage.has(source)) coverage.set(source, new Set());
      set.forEach((h) => coverage.get(source).add(h));
    }
  }
  for (const [source, sourceHeadings] of baseline) {
    const replacers = [...catalogSkills].filter(([, r]) => r.sources.includes(source));
    if (replacers.length === 0 || replacers.some(([, r]) => r.status !== "built")) continue;
    const seen = coverage.get(source) || new Set();
    const missing = sourceHeadings.filter((h) => !seen.has(h));
    if (missing.length) errors.push(`${source}: port maps miss ${missing.length} heading(s): ${missing.join(" · ")}`);
  }
  return errors;
}

/**
 * Checks 1 and 6, plus baseline coverage by the catalog.
 * @param {string[]} folders
 * @param {{skills: Map<string, {status: string, sources: string[]}>, retired: Set<string>}} catalog
 * @param {Map<string, string[]>} baseline
 */
function checkAdmission(folders, catalog, baseline) {
  const errors = [];
  for (const folder of folders) {
    const row = catalog.skills.get(folder);
    if (!row && !baseline.has(folder)) errors.push(`${folder}: not in catalog — add it via meta-write-skill (skill-loop D37)`);
    if (row && row.status !== "built" && !baseline.has(folder)) errors.push(`${folder}: folder exists but catalog status is "${row.status}"`);
  }
  for (const [name, row] of catalog.skills) {
    if (row.status === "built" && !folders.includes(name)) errors.push(`${name}: catalog says built, folder missing`);
  }
  const accounted = new Set(catalog.retired);
  catalog.skills.forEach((row) => row.sources.forEach((s) => accounted.add(s)));
  for (const source of baseline.keys()) {
    if (!accounted.has(source)) errors.push(`${source}: v0.42.0 skill has no replacement or retired row in the catalog`);
  }
  return errors;
}

/**
 * @param {string} [rootDir]
 * @returns {{ok: boolean, errors: string[], built: number, legacy: number}}
 */
function validateSkills(rootDir = path.resolve(__dirname, "..")) {
  const catalog = readCatalog(rootDir);
  if (!catalog) return { ok: false, errors: [`missing ${CATALOG}`], built: 0, legacy: 0 };
  const baseline = readBaseline(rootDir);
  const skillsRoot = path.join(rootDir, SKILLS_DIR);
  const folders = fs.readdirSync(skillsRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const errors = checkAdmission(folders, catalog, baseline);
  const edgesBySkill = new Map();
  for (const name of folders) {
    if (catalog.skills.get(name)?.status !== "built") continue;
    const dir = path.join(skillsRoot, name);
    const text = readIfExists(path.join(dir, "SKILL.md"));
    if (text === null) {
      errors.push(`${name}: SKILL.md missing`);
      continue;
    }
    errors.push(...checkSkillFile(name, text, dir));
    edgesBySkill.set(name, edgeFields(text));
  }
  errors.push(...checkReciprocity(edgesBySkill));
  errors.push(...checkPortMaps(rootDir, catalog.skills, baseline));
  return { ok: errors.length === 0, errors, built: edgesBySkill.size, legacy: folders.length - edgesBySkill.size };
}

/**
 * Regenerates baseline-sections.md from the skills at a git ref.
 * @param {string} rootDir
 * @param {string} ref
 */
function writeSnapshot(rootDir, ref) {
  const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8" });
  const names = git(["ls-tree", "--name-only", `${ref}:${SKILLS_DIR.split(path.sep).join("/")}`])
    .split("\n")
    .filter((n) => n && !n.includes("."));
  const out = [
    `# Baseline skill headings (${ref})`,
    "",
    "Generated by `node scripts/validate-skills.cjs --snapshot <ref>`. Do not edit by hand.",
    "`scripts/validate-skills.cjs` checks port-map coverage against this list (skill-loop D55).",
    "",
  ];
  for (const name of names) {
    const text = git(["show", `${ref}:.agents/skills/${name}/SKILL.md`]);
    out.push(`## \`${name}\``, "", ...headings(text).map((h) => `- \`${h}\``), "");
  }
  fs.writeFileSync(path.join(rootDir, BASELINE), out.join("\n"));
  return names.length;
}

/** @param {string[]} argv */
function runCli(argv = process.argv.slice(2)) {
  const rootDir = path.resolve(__dirname, "..");
  if (argv[0] === "--snapshot") {
    const count = writeSnapshot(rootDir, argv[1] || "HEAD");
    console.log(`validate-skills: wrote ${BASELINE} (${count} skills)`);
    return 0;
  }
  const result = validateSkills(rootDir);
  if (!result.ok) {
    console.error("validate-skills: FAILED");
    result.errors.forEach((e) => console.error(`  - ${e}`));
    return 1;
  }
  console.log(`validate-skills: OK (${result.built} built, ${result.legacy} legacy v0.42.0)`);
  return 0;
}

if (require.main === module) process.exit(runCli());

module.exports = { validateSkills, runCli, frontmatter, headings, normalizeHeading, tableRows };
