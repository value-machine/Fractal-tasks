# Windows shell rules (PowerShell and Git Bash)

Read before the first command when the shell is PowerShell or Git Bash. Trigger: `.claude/rules/platform.md` § Platform and Commands. Cloud sessions (Claude Code on the web) and macOS/Linux machines run plain bash: nothing here applies there.

The owner's local machine is usually Windows: Cursor terminal = PowerShell; Claude Code Bash tool = Git Bash.

## PowerShell

**Applies when the shell is PowerShell** (Cursor terminal). In Git Bash use § Git Bash below.

### Command rules

- No Unix-style `&&` chaining
- No Unix-only flags like `rm -rf`
- Run commands as separate sequential calls (the agent executes them, not the user)

### Exit code handling

PowerShell does not stop when an external command (git, pnpm, node) fails, and `$?` is unreliable for them. Check `$LASTEXITCODE` after each one:

```powershell
command 2>&1; if ($LASTEXITCODE -ne 0) { exit 1 }
```

Use `exit $LASTEXITCODE` to keep the original exit code.

## Git Bash

**Applies when the shell is Git Bash** (Claude Code Bash tool on Windows).

- `&&` chaining and heredocs are fine.
- Fail explicitly: `command || exit 1`; check `$?` for the last exit code (same form as `.agents/skills/spec-debug-runtime/references/patterns.md`).
- Use forward slashes and POSIX paths (`/c/Users/...`); `/dev/null`, not `NUL`.
