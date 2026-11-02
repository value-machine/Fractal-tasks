# `BRIEF.md` template

Path: `documentation/jobs/temp_job_<slug>/BRIEF.md` (on the lap's branch). Written by `loop-refine` and read by every later stage. The owner does not read it (skill-loop D19), so write it for an agent: dense, concrete, no pedagogy.

```markdown
# Brief — <task title>

Task: <app-tasks.json title> · Lap: temp_job_<slug> · Harness: v<package.json version>

## Problem
<one sentence: who has what problem>

## Success check
<one falsifiable sentence; loop-plan turns it into the first failing test>

## In scope
- <smallest set of capabilities that counts as done>

## Out of scope
- Will NOT do: <capability> — deferred | excluded
- Will NOT touch: <existing behavior> — stays unchanged

## Edges
| Feature area | Loop today | Hook point | Ride / new |
|---|---|---|---|
| <feature or shared area> | <trigger → path → outcome, or Not found> | <where this attaches> | ride / new — <why> |

Borrow / build: <`spec-reuse-package` rec when any row is `new`, or `ride-only` / `custom — <one-line product-rule reason>`>
Overrun rule (skill-loop D51): a diff that touches a feature area **not** in this table stops the lap.

## Size
<XS | S | M> — <edges touched + cleanup a clean implementation needs>.
Cut into laps: <none | follow-up task titles added to the backlog>

## Requirements
<only when size M and the work spans roles or journeys: stories, acceptance, transition table — references/requirements.md>

## Decisions
<pointer: DECISIONS.md rows D1…Dn; recorded-decision conflicts resolved>
```

**Restatement line** (posted in chat at the end of Stop 1, no wait):

```text
Building: <in scope, one line>. Not: <top non-goal>. Size: <XS|S|M>.
```
