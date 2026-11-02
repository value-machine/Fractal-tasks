# Port map — loop-ship

Format: [`meta-write-skill/references/port-map-format.md`](../../meta-write-skill/references/port-map-format.md). `finish` is shared with `loop-verdict` and `loop-backlog`.

| Source (v0.42.0) | Section | Status | Where / why |
|---|---|---|---|
| `finish` | ## Concurrent work / other agent threads (same branch, same checkout) | moved | references/concurrency.md |
| `finish` | ### User choice (required when smoke is present) | moved | references/concurrency.md |
| `finish` | ## Version and changelog gate | moved | references/commit-standards.md |
| `finish` | ## Ready to commit? (required) | dropped | The loop commits on its own after loop-check (skill-loop D25); the owner's control point is Stop 2 |
| `finish` | ## Semantic Versioning (SSOT) | moved | references/commit-standards.md |
| `finish` | ## Commit Message Standards (SSOT) | moved | references/commit-standards.md |
| `finish` | ## Faster commit (pre-commit light path + staged tests) | moved | references/commit-standards.md |
| `finish` | ## Production promotion (separate from finish) | moved | SKILL.md § Steps 8 + references/push-safety.md § Production landing (run on Pass) |
| `finish` | ## Boundaries | kept | SKILL.md § Not for |
| `push` | ## Preconditions (Mandatory) | moved | references/push-safety.md |
| `push` | ## Hard Restrictions | moved | references/push-safety.md |
| `push` | ## Push Safety Flow | moved | references/push-safety.md (no push confirmation inside the loop, skill-loop D25) |
| `push` | ## Merge gate (tests) | moved | references/push-safety.md |
| `push` | ## Relationship with `finish` | moved | references/push-safety.md § Commit vs push |
| `push` | ## Production landing (promote) | moved | references/push-safety.md § Production landing |
| `push` | ## Boundaries | kept | SKILL.md § Not for; post-push PR per mode → SKILL.md § Steps 5–6 |
| `bundle-ship` | ## When to use | moved | references/concurrency.md § Bundle mode |
| `bundle-ship` | ## What this skill owns | moved | references/concurrency.md § Bundle mode |
| `bundle-ship` | ## Preconditions | moved | references/concurrency.md § Bundle preconditions |
| `bundle-ship` | ## Workflow | moved | references/concurrency.md § Bundle mode |
| `bundle-ship` | ### Step 1: Snapshot the full tree | moved | references/concurrency.md § Bundle mode |
| `bundle-ship` | ### Step 2: State bundle scope, then continue | moved | references/concurrency.md § Bundle mode (stop only on deviations) |
| `bundle-ship` | ### Step 3: Run finish (bundle mode) | moved | references/concurrency.md § Bundle mode (one commit for the full snapshot) |
| `bundle-ship` | ### Step 4: Run push | moved | references/concurrency.md § Bundle mode (push in the same turn) |
| `bundle-ship` | ## Non-goals | moved | references/concurrency.md § Bundle preconditions (no per-thread commits, no stash of other threads) |
| `bundle-ship` | ## Boundaries | kept | SKILL.md § Not for |
| `bundle-ship` | ## Invocation aliases | moved | SKILL.md description ("land everything on one checkout") + references/concurrency.md |
