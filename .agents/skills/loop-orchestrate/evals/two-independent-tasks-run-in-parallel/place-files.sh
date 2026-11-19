#!/usr/bin/env bash
# Fixture: the backlog holds only the product tasks below (onboarding archived), so ranking is not blocked by onboarding.
source "$(dirname "$0")/../../lib/eval-scaffold.sh"
python3 - <<'PY'
import json
a="src/config/app-tasks-archive.json"; t="src/config/app-tasks.json"
arch=json.load(open(a)); arch+= [dict(x,status="done") for x in json.load(open(t))]
json.dump(arch,open(a,"w"),indent=2); open(a,"a").write("\n")
json.dump([{"title":"Export tasks as CSV","description":"Export button on the tasks backlog panel (src/features/tasks/).","status":"to-do"},{"title":"Show app version in the profile menu","description":"Version from package.json in the profile menu (src/layouts/).","status":"to-do"}],open(t,"w"),indent=2); open(t,"a").write("\n")
PY
commit_all "chore: eval fixture backlog"
