#!/usr/bin/env bash
# Fixture for this case: sources the shared scaffold (meta-write-skill/scripts/eval-scaffold.sh,
# copied into the eval plugin by run-evals.sh), then sets up the situation the prompt assumes.
source "$(dirname "$0")/../../lib/eval-scaffold.sh"
mkdir -p "$(dirname 'src/features/tasks/utils/parseDateRange.ts')"
cat > 'src/features/tasks/utils/parseDateRange.ts' <<'SRC'
export interface DateRange { from: Date; to: Date; }

/** Parses "YYYY-MM-DD..YYYY-MM-DD" into a date range; returns null when malformed. */
export function parseDateRange(input: string): DateRange | null {
  const [a, b] = input.split("..");
  if (!a || !b) return null;
  const from = new Date(a);
  const to = new Date(b);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return from <= to ? { from, to } : { from: to, to: from };
}
SRC
mkdir -p "$(dirname 'src/features/calendar/utils/parseDateRange.ts')"
cat > 'src/features/calendar/utils/parseDateRange.ts' <<'SRC'
export interface DateRange { from: Date; to: Date; }

/** Parses "YYYY-MM-DD..YYYY-MM-DD" into a calendar range; returns null when malformed. */
export function parseDateRange(input: string): DateRange | null {
  const [a, b] = input.split("..");
  if (!a || !b) return null;
  const from = new Date(a);
  const to = new Date(b);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return from <= to ? { from, to } : { from: to, to: from };
}
SRC
commit_all "feat: date range parsing for tasks and calendar"
git push -q origin main
git checkout -q -b feat/reports-date-range
mkdir -p documentation/jobs/temp_job_reports-date-range
printf "# Brief — reports-date-range\n\n## Problem\nReports need a date range filter.\n\n## Edges\n| Feature / area | Touch |\n|---|---|\n| reports | new date range parser |\n\n## Size\nXS\n" > documentation/jobs/temp_job_reports-date-range/BRIEF.md
mkdir -p "$(dirname 'src/features/reports/utils/parseDateRange.ts')"
cat > 'src/features/reports/utils/parseDateRange.ts' <<'SRC'
export interface DateRange { from: Date; to: Date; }

/** Parses "YYYY-MM-DD..YYYY-MM-DD" into a report range; returns null when malformed. */
export function parseDateRange(input: string): DateRange | null {
  const [a, b] = input.split("..");
  if (!a || !b) return null;
  const from = new Date(a);
  const to = new Date(b);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return from <= to ? { from, to } : { from: to, to: from };
}
SRC
commit_all "feat(reports): parse report date ranges"
