# Requirements depth

Read when the brief needs more than problem / perimeter / edges: the work spans roles or user journeys, or touches an external API, the database, auth, or novel logic. Ported from `feature` (v0.42.0) Phases 1–2 and `plan` § Requirements depth. `feature`'s mandatory 🔴 stops are gone (skill-loop D6, D8). Ask only per `agent-behavior` § When to ask, using [`asking.md`](asking.md). Otherwise infer from the codebase and log the choice.

## When to write user stories and journeys

Write them into `BRIEF.md` § Requirements when **size ≥ M** and the work spans **roles or journeys** (skill-loop D18). Below that, the success check and perimeter are enough.

## User stories

- One story per role the change touches (for example unauthenticated, signed-in, admin).
- Acceptance per story: happy path, error states and edge cases, loading and empty states, accessibility.

## User journey and state transitions

Map before planning when the change adds or alters navigation or state:

- **Entry states:** unauthenticated, authenticated, expired session, deep link.
- **Transitions:** what triggers each one, where the user lands, what happens on error.
- **Navigation:** entry → feature → exit, error recovery, back and forward.
- **Edge cases:** navigating away mid-action, session expiry, logout from different states, network loss, refresh mid-flow.
- **Cross-feature:** auth state changes, other features that trigger navigation, global notifications.

Use a transition table (state · trigger · next state · on error) in the brief. A missing transition is a gap. Ask about it only when the codebase has no precedent and the answer changes what users see.

## Typed requirements (by feature type)

| Feature type | Confirm before planning |
|---|---|
| **API integration** | Docs URL, auth method, real request / response example, rate limits → [`loop-plan/references/research-api.md`](../../loop-plan/references/research-api.md) |
| **Database change** | Relevant schemas, related data patterns, RLS needs. Data or irreversible changes are a stop-list item. |
| **UI component** | Placement, responsive needs, interactive states (hover, active, disabled, loading, error) |
| **Business logic** | Concrete input → output examples, edge cases |
| **Auth / authorization** | Affected roles, per-role visibility and actions, existing auth patterns |

**Completeness gate:** you can describe the expected behavior with concrete examples. Otherwise the gap goes to the owner (gap = stop-list "can't be derived").

## Existing functionality first

After the stories, search for what already satisfies them (`src/features/`, `src/shared/`, `src/components/common/`): reusable components, hooks, API and error patterns, partially met stories. Record it in the brief's edges, and use [`grounding.md`](grounding.md) § Ride vs new.

## Information still missing

Sort what's missing into **external** (schema, keys, vendor docs, response formats), **app context** (architecture, auth, adjacent features, state), and **design intent** (only what the codebase doesn't already establish). Search the codebase first. Ask only for what has no precedent, phrased as how the app should behave for its users.

## Objective vs subjective

| Follow the codebase, don't ask | Ask only if no precedent and on the stop list |
|---|---|
| Design tokens, kit components, state and error patterns, file structure, naming | Business rules, scope, new interaction patterns, journey decisions, data / cost / dependency choices |

## Risk and impact

Note breaking changes, impact on existing functionality, and how it can be tested (PR preview, staging Supabase project). High-risk items that are data or irreversible are stop-list items. The rest are recorded in the brief and sized into the estimate.
