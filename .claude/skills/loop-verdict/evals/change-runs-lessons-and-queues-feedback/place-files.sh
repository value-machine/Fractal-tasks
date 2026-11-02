#!/usr/bin/env bash
# Fixture for this case: sources the shared scaffold (meta-write-skill/scripts/eval-scaffold.sh,
# copied into the eval plugin by run-evals.sh), then sets up the situation the prompt assumes.
source "$(dirname "$0")/../../lib/eval-scaffold.sh"
top_task "Export tasks as CSV" "Lap temp_job_tasks-csv-export, branch feat/tasks-csv-export, PR #43."
commit_all "chore(tasks): csv export in progress"
git push -q origin main
csv_lap "CSV serializer for title and status" done checkout done
csv_built
printf "\n## Ship\nPR: #43 (open, CI green). Preview: https://feat-tasks-csv-export-bronze-plate-harness.tom-fab.workers.dev\n" >> documentation/jobs/temp_job_tasks-csv-export/BRIEF.md
commit_all "docs: ship note"
git push -q -u origin feat/tasks-csv-export
