---
tags: [loop]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Bash, Write, Edit, Skill]
---

Run the check stage on the current lap: the diff adds src/features/reports/utils/parseDateRange.ts, and near-identical parseDateRange functions already exist in src/features/tasks and src/features/calendar.
