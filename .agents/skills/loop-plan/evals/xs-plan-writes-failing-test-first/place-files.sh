#!/usr/bin/env bash
# Fixture for this case: sources the shared scaffold (meta-write-skill/scripts/eval-scaffold.sh,
# copied into the eval plugin by run-evals.sh), then sets up the situation the prompt assumes.
source "$(dirname "$0")/../../lib/eval-scaffold.sh"
git checkout -q -b feat/app-version-profile-menu
version_brief XS
commit_all "docs(layouts): brief for app-version-profile-menu"
