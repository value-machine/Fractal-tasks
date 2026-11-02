# Error reporting

## Purpose

Sends runtime errors from the browser to the `error_logs` table, so the owner and the `loop-backlog` signal adapter can see what breaks for real users. It reports three kinds: uncaught errors, unhandled promise rejections, and errors caught by the route boundary (`QueryErrorBoundary`). It shows nothing to the user and never changes how the app behaves.

## Structure

| Layer    | Path                                      | Purpose                                                                                                           |
| -------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Services | `services/errorReportService.ts`          | `createErrorReporter` (dedupe, caps, never throws) and the app-wide `reportError`, which calls `upsert_error_log` |
| Services | `services/installGlobalErrorReporting.ts` | Registers the `error` and `unhandledrejection` listeners once (called in `src/main.tsx`)                          |
| Services | `services/errorFingerprint.ts`            | Cluster hash: normalized message plus the top stack frame, stable across deploys                                  |
| Services | `services/redactSensitive.ts`             | Removes emails, tokens and keys; cuts query and fragment from URLs                                                |
| Services | `services/reportEnvironment.ts`           | The `local` / `staging` / `production` tag                                                                        |
| Types    | `types/errorReport.types.ts`              | `ReportEnvironment`, `ErrorReportType`, `ErrorReportPayload`, `ErrorReporter`                                     |

The route boundary hook is wired in `src/App.tsx`: `<QueryErrorBoundary onError={...}>` calls `reportError(error, "react")`.

## What is sent

`upsert_error_log(p_hash, p_message, p_environment, p_type, p_stack, p_url, p_user_agent)`, nothing else. The signed-in user's id is added by the database, not by this code.

- **Message and stack:** emails, JWT-shaped tokens, Supabase keys and bearer credentials are replaced; query strings and fragments are cut from any URL inside them. Message 2000 characters, stack 8000.
- **URL:** origin and path only. OAuth callbacks carry codes in the query and fragment, so those never leave the page.
- **Limits:** each hash is sent once per page load, at most 20 sends per page load, and a failed send is never reported again. The database counts repeats and caps distinct clusters (`supabase/README.md`).
- **Not configured:** when Supabase is not configured, nothing is sent.
- **Browser notices that are not bugs** (`ResizeObserver loop`) are ignored.

## Environment tag

Resolved in this order (`services/reportEnvironment.ts`): `VITE_APP_ENV` if it is `local`, `staging` or `production`; otherwise `local` on the dev server; otherwise `staging` when the build's branch (`WORKERS_CI_BRANCH`, set by Cloudflare Workers Builds and defined as `__BUILD_BRANCH__` in `vite.config.ts`) is not `main`; otherwise `production`. No setting is needed on Cloudflare.

## Dependencies

- `@/shared/services/supabaseService` (`getSupabase`, `isSupabaseConfigured`)
- The `upsert_error_log` function and `error_logs` table from `supabase/migrations/` (apply them before relying on reports)
- `src/components/common/QueryErrorBoundary` (its `onError` prop)

## Testing

Colocated `*.test.ts` next to each service. `errorReportService.test.ts` covers the acceptance cases: payload shape, one send per hash, the per-page cap, disabled and failing backends, and the Supabase call.

## Related

- `supabase/README.md` (tables, who can read them)
- `.agents/skills/loop-backlog/references/signal-adapter.md` (how the loop reads signals)
