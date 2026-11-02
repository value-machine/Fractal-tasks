#!/usr/bin/env bash
# Fixture for this case: sources the shared scaffold (meta-write-skill/scripts/eval-scaffold.sh,
# copied into the eval plugin by run-evals.sh), then sets up the situation the prompt assumes.
source "$(dirname "$0")/../../lib/eval-scaffold.sh"
csv_lap "CSV serializer for title and status" done checkout done
csv_built
printf "\n## Decisions\n- Exports include title and status only.\n" >> src/features/tasks/README.md
RULE=.claude/rules/code-style.md; [ -f "$RULE" ] || RULE=.cursor/rules/code-style/RULE.mdc
printf "\n- CSV and other export formats use RFC 4180 quoting.\n" >> "$RULE"
printf "\n## Ship\nPR: #43 (open, CI green). Preview: https://feat-tasks-csv-export-bronze-plate-harness.tom-fab.workers.dev\n" >> documentation/jobs/temp_job_tasks-csv-export/BRIEF.md
commit_all "feat(tasks): csv export, export decision and quoting rule"
git push -q -u origin feat/tasks-csv-export
