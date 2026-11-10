# Auth Feature

User authentication and session management via Supabase.

## Purpose

- Passwordless email sign-in link (Supabase magic link; a new address gets an account on first use)
- GitHub and Google OAuth sign-in
- All three return to `/` and finish through the same PKCE `?code=` exchange
- No passwords: owner decision, 2026-11-10 — sign-in is email link + GitHub, Google kept. The built-in Supabase mailer allows 2 emails/hour (and only to project team addresses) until own SMTP is set up
- No anonymous sessions: visitors without a session stay signed out (owner decision, 2026-11-06; the Point At tree is public and read-only)
- Session persistence and auth state subscription
- Auth redirect and callback handling
- User profile query/mutation (TanStack Query)

## Structure

| Layer      | Path          | Purpose                                                                                                                              |
| ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Hooks      | `hooks/`      | `useAuth`, `useAuthSession`, `useAuthRedirect`, `useAuthCallbackHandler`, `useUserProfileQuery`                                      |
| Services   | `services/`   | `authService`, `authCallbackService`, `authErrorMessages`, `authValidation` (email format), `userProfileService`, `authHandlerUtils` |
| Components | `components/` | `SignInPanel`, `EmailLinkForm`, `GithubIcon`, `GoogleIcon`                                                                           |
| Types      | `types/`      | `User`, `UserProfile`, `AuthContextValue`, `OAuthProvider`                                                                           |

**Cross-layout UI:** `ProfileMenu` lives in `@/layouts/ProfileMenu` (app-shell widget used by Topbar; layouts may compose features, `components/common` may not). Shared viewport/form layout tokens live in `@/shared/theme/appViewLayout`.

## Main API

### `useAuth()` / `useAuthContext()`

Returns:

`{ user, loading, error, logout, signInWithOAuthProvider, sendEmailSignInLink, clearAuthError, setAuthError }`

- `signInWithOAuthProvider(provider)` — `"google"` or `"github"`; redirects away, errors land in `error`.
- `sendEmailSignInLink(email)` — resolves `true` when the link was sent; validation and Supabase errors land in `error`. It does not toggle `loading` (a page that shows a loading screen while `loading` is true would unmount the form and lose its "check your inbox" state); `EmailLinkForm` keeps its own sending state.

- Requires Supabase configured (`isSupabaseConfigured()`). If not, `loading` becomes `false` and handlers no-op.
- The app never creates anonymous sessions; an anonymous Supabase user (if one exists) is still treated as logged out (`user === null`).
- Session is initialized on mount and kept in sync via `useAuthStateSubscription`.
- Context value and auth handlers are memoized so consumers re-render only when `user`, `loading`, `error`, or handler identity changes.

### User feedback policy

- **Form-blocking errors:** inline `Alert` (`src/components/common/Alert`) in the sign-in panel (OAuth and email-link errors share it). A sent link replaces the email form with a "Check your inbox" message.
- **OAuth/callback errors:** `setAuthError` on auth context; shown on Home via single Alert.
- **Profile mutations:** none shipped; follow `documentation/DOC_TANSTACK_QUERY.md` § Example mutation (merge server response via `setQueryData`, no happy-path invalidation).

### Routes

- `/login` – dedicated sign-in page (redirects to `/` when already authenticated)
- `/` – inline sign-in when logged out; primary OAuth PKCE callback handler. supabase-js exchanges the `?code=` itself while the client initializes, so `handleCodeExchange` first checks `hasSignedInSession()` and only exchanges when there is no signed-in session (a second exchange fails with "PKCE code verifier not found"). The OAuth and email-link return address is `<origin>/` (ends with a slash so `<origin>/**` redirect patterns match)
- `/auth/callback` – legacy OAuth callback (kept for backward compatibility)

## Dependencies

- `@/shared/services/supabaseService` – Supabase client, `isSupabaseConfigured`, and the `SupabaseUser` / `AuthError` types (only file allowed to import `@supabase/*`)
- `@/shared/utils/appOrigin` – absolute app URLs (basename-aware)
- `@/config/legal` – placeholder Privacy/Terms URLs (`LEGAL_ORIGIN`)
- `@/shared/hooks/useAuthBackendConfigured` – auth backend readiness for UI
- `@/shared/utils/userUtils` – `mapProviderUserToAppUser`
- `@/shared/utils/redirectUtils` – safe post-login redirect paths
- `@/shared/utils/queryKeys` – TanStack profile query keys

## Configuration checklist

- Supabase Redirect URLs: app origin with `/**` (covers `<origin>/`)
- Google and GitHub OAuth providers enabled in Supabase; Email provider enabled (magic link)
- Custom SMTP in Supabase before real users: the built-in mailer sends 2 emails/hour, only to team addresses
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`)
- Update `LEGAL_ORIGIN` in `src/config/legal.ts` when product URLs are available

## Testing

Colocated `*.test.ts(x)` under this feature; shared wrappers in `tests/test-utils.tsx`. See `documentation/DOC_TESTING.md`.

## Related

- `documentation/DOC_SUPABASE_GOOGLE_OAUTH.md` – Google Cloud + Supabase dashboard setup
- `documentation/DOC_MOBILE_LOCAL_DEV.md` – local device testing for OAuth
- `documentation/DOC_TANSTACK_QUERY.md` – profile query/mutation patterns
