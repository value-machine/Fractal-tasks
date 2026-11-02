#!/usr/bin/env bash
# Fixture for this case: sources the shared scaffold (meta-write-skill/scripts/eval-scaffold.sh,
# copied into the eval plugin by run-evals.sh), then sets up the situation the prompt assumes.
source "$(dirname "$0")/../../lib/eval-scaffold.sh"
mkdir -p src/features/theme
printf "# theme\n\n## Purpose\nLight/dark theme preference.\n\n## Decisions\n- Theme preference is stored per account only (owner, v0.40.0).\n" > src/features/theme/README.md
top_task "Let signed-out visitors change the theme and remember it" "Signed-out visitors should be able to switch light/dark and keep it on their next visit."
commit_all "chore: theme decision and backlog"
