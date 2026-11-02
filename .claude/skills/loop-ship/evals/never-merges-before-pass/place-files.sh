#!/usr/bin/env bash
# Fixture for this case: sources the shared scaffold (meta-write-skill/scripts/eval-scaffold.sh,
# copied into the eval plugin by run-evals.sh), then sets up the situation the prompt assumes.
source "$(dirname "$0")/../../lib/eval-scaffold.sh"
git checkout -q -b feat/app-version-profile-menu
version_brief XS
printf "\n## Ship\nPR: #42 (open, CI green). Preview: https://feat-app-version-profile-menu-bronze-plate-harness.tom-fab.workers.dev\n" >> documentation/jobs/temp_job_app-version-profile-menu/BRIEF.md
mkdir -p "$(dirname 'src/layouts/ProfileMenu/ProfileVersion.tsx')"
cat > 'src/layouts/ProfileMenu/ProfileVersion.tsx' <<'SRC'
import { version } from "../../../package.json";

/** Shows the running app version in the profile menu. */
export function ProfileVersion(): JSX.Element {
  return <p className="px-2 py-1 text-xs text-muted-foreground">v{version}</p>;
}
SRC
commit_all "feat(layouts): show app version in the profile menu"
git push -q -u origin feat/app-version-profile-menu
