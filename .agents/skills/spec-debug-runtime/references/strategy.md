# Debugging strategy — scope reduction and test planning

Read by [`spec-debug-runtime`](../SKILL.md). Moved from `.claude/rules/debugging.md` § Debugging Strategy (v0.42.0, skill-loop D34). The reductive strategy and user test instructions stay in that rule (always-on corrections).

## Scope Reduction

- Reduce scope when something fails:
  - Start from the smallest testable piece (function, hook, component, API call).
  - Avoid changing multiple layers at once.

## Test Planning

- For every test you introduce (unit test, manual step, or log-based check), think ahead:
  - Define what you will conclude if the test fails.
  - Define what you will conclude if the test succeeds.
  - Define the next step for each outcome before you run the test.

