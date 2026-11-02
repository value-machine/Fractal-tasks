#!/usr/bin/env bash
# Eval case scaffold: fresh clone of this repo at the tested ref in the case workspace, plus fixture helpers.
# run-evals.sh fills SRC and REF; each case's place-files.sh sources this file, then builds its fixture.
set -euo pipefail
SRC="__REPO__"
REF=__REF__
WS="$PWD"
git clone -q --no-checkout "$SRC" "$WS/_clone"
shopt -s dotglob; mv "$WS/_clone"/* "$WS"/; rmdir "$WS/_clone"; shopt -u dotglob
git -c advice.detachedHead=false checkout -q "$(git -C "$SRC" rev-parse "$REF")"
git checkout -q -B main
for b in $(git for-each-ref --format='%(refname:short)' refs/heads); do [ "$b" = main ] || git branch -q -D "$b"; done
for b in $(git for-each-ref --format='%(refname)' refs/remotes refs/tags); do git update-ref -d "$b"; done
git remote remove origin
git config user.name "Owner"; git config user.email "owner@example.com"
ln -s "$SRC/node_modules" node_modules
# Keep the arms comparable and offline: no marketplace / plugin fetch at session start.
node -e 'const f=".claude/settings.json",fs=require("fs");if(fs.existsSync(f)){const s=JSON.parse(fs.readFileSync(f));delete s.enabledPlugins;delete s.extraKnownMarketplaces;fs.writeFileSync(f,JSON.stringify(s,null,2)+"\n")}'
git commit -q -am "chore: eval workspace settings" --allow-empty
git init -q --bare .git-remote && git -C .git-remote config receive.shallowUpdate true
printf '.git-remote/\nnode_modules\n' >> .git/info/exclude
git remote add origin "$WS/.git-remote"
git push -q origin main

# The eval sandbox keeps a path named .git read-only; keep git data in .gitdata behind a gitfile.
mv .git .gitdata && echo "gitdir: $WS/.gitdata" > .git && printf '.gitdata/\n.git\n' >> .gitdata/info/exclude

commit_all() { git add -A; git commit -q -m "$1"; }

top_task() { # top_task <title> <description>
  python3 - "$1" "$2" <<'PY'
import json,sys
p="src/config/app-tasks.json"; d=json.load(open(p))
d.insert(0,{"title":sys.argv[1],"description":sys.argv[2],"status":"in-progress"})
json.dump(d,open(p,"w"),indent=2,ensure_ascii=False); open(p,"a").write("\n")
PY
}

csv_brief() { # csv_brief <size>
  mkdir -p documentation/jobs/temp_job_tasks-csv-export
  cat > documentation/jobs/temp_job_tasks-csv-export/BRIEF.md <<MD
# Brief — tasks-csv-export

## Problem
Owners can't export their task list.

## Success check
Clicking Export on the tasks page downloads a CSV with the title and status of every visible task.

## In scope
- Export button on the tasks backlog panel
- CSV with title and status columns

## Out of scope
- Import, other formats, due dates

## Edges
| Feature / area | Touch |
|---|---|
| tasks (\`src/features/tasks/\`) | new export service + button |

## Size
$1
MD
}

csv_plan() { # csv_plan <phase-2 text> <phase-2 status> [phase-3 status]
  cat > documentation/jobs/temp_job_tasks-csv-export/DEVELOPMENT_PLAN.md <<MD
# Development plan — tasks-csv-export

## Summary
Add an Export button to the tasks backlog panel that downloads a CSV of the visible tasks.

## Phase overview
| Phase | Goal | Status |
|---|---|---|
| 1 | Export button in TasksBacklogPanel wired to a stub handler | done |
| 2 | $1 | $2 |
| 3 | Download the CSV and add the acceptance test | ${3:-pending} |

## Phase 1 — Export button
Done: button renders and calls \`exportTasks()\` stub.

## Phase 2 — $1
Gate: unit test for the serializer passes.

## Phase 3 — Download
Gate: acceptance test \`src/features/tasks/services/appTasksExport.test.ts\` passes.

## Notes during development
- Phase 1 landed without issues.
MD
}

csv_lap() { # csv_lap <phase-2 text> <phase-2 status> [checkout] [phase-3 status]
  git checkout -q -b feat/tasks-csv-export
  csv_brief S; csv_plan "$1" "$2" "${4:-pending}"
  commit_all "feat(tasks): export button stub (phase 1)"
  [ "${3:-}" = checkout ] || git checkout -q main
}

csv_built() { # the finished CSV export a lap at Stop 2 would carry
  mkdir -p src/features/tasks/services
  cat > src/features/tasks/services/appTasksExport.ts <<'SRC'
import type { AppTask } from "@/features/tasks/types/appTask.types";

const quote = (v: string): string => (/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

/** Serializes the visible tasks as CSV (title, status). */
export function toTasksCsv(tasks: AppTask[]): string {
  return ["title,status", ...tasks.map((t) => `${quote(t.title)},${quote(t.status)}`)].join("\n");
}
SRC
  cat > src/features/tasks/services/appTasksExport.test.ts <<'SRC'
import { describe, expect, it } from "vitest";

import { toTasksCsv } from "./appTasksExport";

describe("toTasksCsv", () => {
  it("should quote titles with commas when serializing", () => {
    expect(toTasksCsv([{ title: "a, b", description: "", status: "to-do" }])).toBe('title,status\n"a, b",to-do');
  });
});
SRC
}

version_brief() { # version_brief <size>
  mkdir -p documentation/jobs/temp_job_app-version-profile-menu
  cat > documentation/jobs/temp_job_app-version-profile-menu/BRIEF.md <<MD
# Brief — app-version-profile-menu

## Problem
Users can't see which app version they run.

## Success check
The profile menu shows "v<package.json version>".

## In scope
- Version line in the profile menu

## Out of scope
- Changelog link

## Edges
| Feature / area | Touch |
|---|---|
| layouts (\`src/layouts/ProfileMenu/\`) | add a version line |

## Size
$1
MD
}
