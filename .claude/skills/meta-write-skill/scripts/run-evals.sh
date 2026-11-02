#!/usr/bin/env bash
# Runs the loop-skill eval cases (.agents/skills/*/evals/*) against the harness at one git ref,
# with `claude plugin eval`. Each case gets a fresh clone of this repo at <ref> plus its
# place-files.sh fixture, so two refs can be compared on identical situations.
#
# Usage: run-evals.sh <ref> [--case <name-glob>] [--runs <n>] [--model <model>] [--out <dir>]
#   ref   harness version to test (e.g. a920c0d for v0.42.0, or HEAD)
# Output: <out>/result.json, report.html, and one grading pack per run in <out>/packs/
#   (prompt, graders, compact trace, files the agent changed) — grade those, not the
#   tool's judge, which only sees a truncated trace (DOC_DECISION_LOG.md § loop-evals).
# Needs: Claude Code with `claude plugin eval`, bubblewrap (Linux sandbox), installed node_modules.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(git -C "$here" rev-parse --show-toplevel)"
ref="${1:?usage: run-evals.sh <ref> [--case glob] [--runs n] [--model m] [--out dir]}"; shift
case_glob=""; runs=1; model="claude-sonnet-5-5"; out=""
while [ $# -gt 0 ]; do case "$1" in
  --case) case_glob="$2"; shift 2;; --runs) runs="$2"; shift 2;;
  --model) model="$2"; shift 2;; --out) out="$2"; shift 2;;
  *) echo "unknown option $1" >&2; exit 2;; esac; done
sha="$(git -C "$repo" rev-parse --short "$ref")"
out="${out:-${TMPDIR:-/tmp}/plate-evals/$sha-$(date -u +%Y%m%dT%H%M%S)}"
plugin="$out/plugin"; mkdir -p "$plugin/.claude-plugin" "$plugin/lib" "$plugin/skills" "$plugin/hooks" "$plugin/evals"
echo "{\"name\":\"loop-evals-$sha\",\"version\":\"0.0.0\"}" > "$plugin/.claude-plugin/plugin.json"

# Skills under test: the ref's skills, listed for the Skill tool (as the .claude/skills mirror does).
git -C "$repo" archive "$sha" .agents/skills | tar -x -C "$plugin/skills" --strip-components=2
rm -rf "$plugin"/skills/*/evals

# Project memory: the eval runner loads no project settings, so a SessionStart hook points the
# agent at the ref's CLAUDE.md, AGENTS.md and always-on rules (.claude/rules without paths:, or
# Cursor alwaysApply rules for refs before the Claude Code migration).
files="CLAUDE.md AGENTS.md"
rules=$(git -C "$repo" ls-tree -r --name-only "$sha" .claude/rules | while read -r f; do git -C "$repo" show "$sha:$f" | grep -q '^paths:' || printf '%s ' "$f"; done)
if [ "$(echo "$rules" | wc -w)" -le 2 ]; then
  rules="$rules$(git -C "$repo" ls-tree -r --name-only "$sha" .cursor/rules | grep 'RULE.mdc$' | while read -r f; do git -C "$repo" show "$sha:$f" | grep -q 'alwaysApply: true' && printf '%s ' "$f"; done)"
fi
msg="Project memory for this repository (a normal session loads it automatically). Before doing anything else, read these files in full with the Read tool and follow them: $files $rules Environment note: this workspace allows reading git but not writing it (checkout, commit, push fail), and gh is not available. When a step needs one of those, state the exact command you would run, treat it as having succeeded, and continue the work."
node -e 'const [p,m]=process.argv.slice(1);const o=JSON.stringify({hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:m}});require("fs").writeFileSync(p,JSON.stringify({hooks:{SessionStart:[{hooks:[{type:"command",command:"echo "+JSON.stringify(o)}]}]}},null,2))' "$plugin/hooks/hooks.json" "$msg"

# Cases come from the current checkout (same fixtures for every ref).
sed -e "s#^SRC=.*#SRC=\"$repo\"#" -e "s#^REF=.*#REF=$sha#" "$here/eval-scaffold.sh" > "$plugin/lib/eval-scaffold.sh"
for d in "$repo"/.agents/skills/*/evals/*/; do
  skill="$(basename "$(dirname "$(dirname "$d")")")"; c="$(basename "$d")"
  cp -r "$d" "$plugin/evals/${skill}__$c"
done

cd "$plugin"
claude plugin eval . ${case_glob:+--case "$case_glob"} --runs "$runs" -j 4 --ablation none --scaffold --trust-plugin \
  --allow-tools Bash Write Edit --no-publish --model "$model" --json "$out/result.json" --report "$out/report.html" --keep-temp || true
python3 "$here/eval-packs.py" "$out/result.json" "$plugin" "$out/packs"
echo "Grading packs: $out/packs"
