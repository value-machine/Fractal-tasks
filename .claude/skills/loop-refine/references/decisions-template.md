# DECISIONS.md template (lap ledger)

Scratch ledger for one lap, on the lap's branch. Before merge, `loop-build` folds each Closed row into the home it governs — the feature `README.md`, `documentation/DOC_APP_VISION.md`, or a rule — so later laps find it there (D48). The lap ledger itself is not the durable record.

Path: `documentation/jobs/temp_job_<name>/DECISIONS.md`

Create this file only when the first product decision is logged (asked tie **or** clear-winner log). Do **not** create an empty stub.

```markdown
# Decisions — <job name>

Job: `temp_job_<name>`
Updated: <ISO date>

## Closed

| id | topic | status | choice | source | notes |
|----|-------|--------|--------|--------|-------|
| D1 | <short topic> | closed | <picked option / clear-winner label> | loop-refine \| loop-plan \| loop-build | <one line> |

## Open

| id | topic | status | options briefly | blocked phase |
|----|-------|--------|-----------------|---------------|
| D2 | <short topic> | open | A / B / … | refine \| plan \| build |

## Log

- <ISO datetime> — D1 closed via <loop-refine|loop-plan|loop-build> (<asked|clear-winner|agent-pick>)
```

### Field rules

- **id** — stable `D1`, `D2`, … never reuse. Outside the lap, cite with the lap slug: `(<slug> D3)`; `loop-ship` copies the closed rows to `documentation/DOC_DECISION_LOG.md`.
- **status** — `open` | `closed`.
- **source** — which loop skill wrote the row (`loop-refine` | `loop-plan` | `loop-build`). With the away switch on (`agent-behavior` § When to ask), ties close as `agent-pick`; stop-list items park the lap as an Open row until the owner answers.
- **Anti-dup** — before asking, scan **Closed** + **Open**; skip any topic already decided or currently open awaiting answer.
- **Clear winner** — append to **Closed** with note `clear-winner`; do not ask.
- **Tie** — add **Open** row, ask once ([`asking.md`](asking.md)), then move to **Closed**.
- **Fold before merge** — each Closed row that governs future work is written into its home (feature `README.md`, vision, or rule) by `loop-build`; the PR diff then shows the decision lines `loop-verdict` lists for the owner.
