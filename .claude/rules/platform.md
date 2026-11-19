# Platform and Environment

Shell trigger and local environment configuration for this repo.

## Platform and Commands

**Environment:** read it from the session's environment info; don't assume it. **Shell is PowerShell or Git Bash (Windows)?** Read `documentation/DOC_WINDOWS_SHELL.md` before the first command (no `&&` in PowerShell, `$LASTEXITCODE` checks, POSIX paths in Git Bash). Plain bash (cloud sessions, macOS, Linux) needs nothing extra.

## Environment Variables and Configuration

**Environment Variables:**
- Use `VITE_*` names for all client-side environment variables; access via `import.meta.env.VITE_*`. What may be a `VITE_*` value and where secrets live: `.claude/rules/security.md` § Secrets.
- Real values live in the local environment and CI; `.env.example` holds structure only.

**Supabase Environment Variables (Current):**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anonymous/public key (legacy name: `VITE_SUPABASE_ANON_KEY`)
- Access in code: `import { getSupabase, isSupabaseConfigured } from "@/shared/services/supabaseService"`

**Server-side secrets:** Edge Function secrets: Supabase Dashboard → Project Settings → Edge Functions → Secrets.

**Hidden Files:**
- Some files are not visible to the AI (for example `.env`)
- When an issue involves hidden files, the AI should:
  - Ask the user to confirm relevant values (without exposing full secrets), or
  - Ask the user to paste safe snippets (keys, not secrets)

**Server Restarts:**
- Explicitly mention when a restart is required, especially after:
  - Environment variable changes
  - Dependency or tooling changes
  - Vite config, tsconfig, or path alias changes
  - Backend or server configuration changes
