#!/usr/bin/env bash
# Fixture for this case: sources the shared scaffold (meta-write-skill/scripts/eval-scaffold.sh,
# copied into the eval plugin by run-evals.sh), then sets up the situation the prompt assumes.
source "$(dirname "$0")/../../lib/eval-scaffold.sh"
top_task "Show the app version in the profile menu" "Users should see which app version they run, in the profile menu."
commit_all "chore(tasks): queue app version task"
