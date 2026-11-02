# Theming

How to restyle the whole app: light/dark mode, brand colors, corner radius, density, fonts, shadows and motion. The decision logs behind this (jobs `temp_job_runtime-theming`, `temp_job_dtcg-tokens`, `temp_job_bronze-theme`) were removed after landing; read them in git history at `6079e24`.

## How it works

| Piece | Where | Role |
|-------|-------|------|
| Token source (SSOT) | `src/shared/theme/tokens/` | [W3C DTCG 2025.10](https://www.designtokens.org/TR/2025.10/) files: `*.tokens.json` + `theme.resolver.json`. Every themeable value lives here. |
| Generated CSS variables | `src/shared/theme/tokens/tokens.generated.css` | Written by `pnpm tokens:build` (Terrazzo, `scripts/terrazzo.config.js`): `:root` = light + shared, `.dark` = dark overrides, `prefers-reduced-motion` = motion overrides. Committed; never edit by hand. |
| Tailwind mapping | `src/index.css` (imports the generated CSS) → `@theme inline` | Exposes tokens as utilities (`bg-primary`, `rounded-button`, `font-heading`, …). Values are `var()` references, so runtime overrides reach every utility. |
| Token contract | `src/shared/theme/themeTokens.ts` + `dtcgTokens.test.ts` | Typed list of token names (`THEME_TOKENS`). The test checks every token file against the official DTCG JSON Schemas (`scripts/dtcg-schemas-2025.10.json`), that the generated CSS matches a fresh build, and that its names match `THEME_TOKENS`. |
| Color mode | `src/shared/theme/colorMode.ts`, `src/shared/context/ColorModeContext.tsx`, inline script in `index.html` | Light / Dark / System. Follows the OS by default, remembers the choice per device, syncs across tabs, no flash on load. |
| Mode control | `src/layouts/ProfileMenu/ColorModeToggle.tsx` | Icon at the bottom right of the profile menu that cycles Light → Dark → System (tooltip names current and next). |
| Runtime overrides | `applyTheme()` / `clearTheme()` in `themeTokens.ts` | Restyle at runtime (e.g. per login) on top of the active mode. |

Components never use raw colors or one-off values for themeable aspects; they use token utilities. The lint rule in `eslint.config.js` warns on hardcoded colors.

## DTCG token files

| File | DTCG role | Holds |
|------|-----------|-------|
| `theme.resolver.json` | Resolver (`version: "2025.10"`) | Set `base`; modifier `mode` (`light` default, `dark`); modifier `motion` (`default`, `reduced`); resolution order base → mode → motion |
| `base.tokens.json` | Set `base` | Fonts, radius, spacing, toolbar height, motion, elevation sm–xl |
| `light.tokens.json` / `dark.tokens.json` | `mode` contexts | All colors, brand elevations |
| `reduced-motion.tokens.json` | `motion.reduced` context | Near-zero durations |

- **Names.** Groups (`color`, `font`, `shape`, `motion`, …) only organize the tree for design tools. The CSS variable is the token's own name (`color.primary-foreground` → `--primary-foreground`), so names are unique across groups.
- **Colors.** Colors are `{ "colorSpace": "srgb", "components": [r, g, b], "alpha"?, "hex" }`. Components run from 0 to 1. `hex` is the fallback many tools read, and a test keeps it equal to the components.
- **Aliases.** `{group.token}` references (e.g. `heading-font` → `{font.body-font}`) become `var(--…)` in CSS, so runtime overrides still follow them.
- **Design tools.** Tokens Studio, Penpot and other DTCG-aware tools can open `src/shared/theme/tokens/` and the resolver directly. After a tool writes the files, run `pnpm tokens:build` and commit both the JSON and the generated CSS.

**Workflow:** edit a `*.tokens.json` file → `pnpm tokens:build` → commit the JSON and `tokens.generated.css` together. If you forget the build, the test suite fails and names the fix. `pnpm tokens:check` lints the files with Terrazzo.

## Default theme: bronze plate

The shipped tokens are the "Engraved plate" bronze identity, chosen by the owner from live previews (2026-10-20) over "Classic foundry" and "Modern metal":
- **Type:** Cinzel headings (engraved Roman capitals) and Inter body.
- **Shape:** 0.25rem plate corners; buttons follow `radius`.
- **Primary:** bronze, with a bevelled metallic gradient button (`elevation-brand` uses inset highlight and shade).
  Dark mode uses the lighter bronze `#d4a05e` (gradient start `#a87238`) on purpose: the darker first pick failed WCAG AA for button text (2.49:1 → 4.52:1). Keep button text at AA when changing these.
- **Secondary:** verdigris.
- **Surfaces:** warm paper in light mode, warm charcoal in dark mode.

Fonts load from Google Fonts in `index.html`. When you change `font.*` tokens, update that link too.

## Tokens

All names are in `THEME_TOKENS` (`src/shared/theme/themeTokens.ts`).

| Group | Tokens | Utilities |
|-------|--------|-----------|
| Colors (per mode) | `background`, `foreground`, `card`, `popover`, `primary`, `primary-gradient-start`, `secondary`, `muted`, `accent`, `destructive` (each with `-foreground` where text sits on it), `success`, `warning`, `info`, `border`, `input`, `ring`, `overlay`, `scrollbar`, `scrollbar-hover` | `bg-*`, `text-*`, `border-*`, `ring-*` |
| Typography | `body-font`, `heading-font`, `mono-font` | `font-sans` (body), `font-heading`, `font-mono` |
| Shape | `radius` (base; `rounded-sm/md/lg/xl` derive from it) | `rounded-*` |
| Density | `spacing` (Tailwind's spacing base; every `p-*`, `gap-*`, `h-*` scales with it) | all spacing utilities |
| Component tokens | `button-radius` (DTCG, alias to `radius` by default: plate buttons); `card-radius`, `input-radius` (optional overrides: not in the DTCG files; without them cards use `radius + 0.375rem` and inputs `radius − 2px`, derived in `@theme inline`) | `rounded-button`, `rounded-card`, `rounded-input` |
| Elevation | `elevation-sm/md/lg/xl`, `elevation-brand`, `elevation-brand-active` | `elevation-sm/md/lg/xl` |
| Motion | `duration-fast/normal/slow`, `ease-standard` | `duration-(--duration-fast)` etc. |
| Layout | `app-toolbar-height` | `h-toolbar`, `pt-toolbar` |

`prefers-reduced-motion` sets the motion durations to near zero (the `motion.reduced` resolver context).

Not themeable (by design): breakpoints (fixed at build time), z-index (app structure), the type scale (Tailwind default sizes).

## Common changes

**Dark/light colors.** Edit `light.tokens.json` and `dark.tokens.json` (keep `components` and `hex` in step), then `pnpm tokens:build`. Both files must define every color token (the contract test checks it).

**Corner radius everywhere.** Change `shape.radius` in `base.tokens.json`. Cards and inputs derive from it. Buttons follow it too (`shape.button-radius` = `"{shape.radius}"`); set a dimension such as 9999px for pill buttons. To give cards or inputs their own radius, add a `card-radius` / `input-radius` token under `shape` (and drop it from `OPTIONAL_TOKENS` in `dtcgTokens.test.ts`).

**Density.** Change `spacing.spacing` (default `0.25rem`). Smaller = denser.

**Fonts.** Change `font.body-font` / `heading-font` / `mono-font` and load the font in `index.html`.

**A component that should differ by brand.** Add a component token only when a real need appears (decision runtime-theming D5): add a `<component>-<property>` token to `base.tokens.json` (an alias to a shared token, or an optional override with a `var()` fallback in `@theme inline` like `card-radius`), map it in `@theme inline`, add it to `THEME_SHARED_TOKENS`, use the utility in the kit component, and teach `cn()` (`src/shared/utils/cn.ts`) the new class if it can conflict with built-ins. Structural differences (layout, markup) stay code: edit the kit component's variants.

**A new color.** Add it under `color` in both `light.tokens.json` and `dark.tokens.json`, run `pnpm tokens:build`, map `--color-<name>: var(--<name>)` in `@theme inline`, and add it to `THEME_COLOR_TOKENS`.

## Runtime overrides (per-login restyling)

```ts
import { applyTheme, clearTheme } from "@/shared/theme/themeTokens";

applyTheme({ primary: "#2563eb", "primary-gradient-start": "#1e40af", radius: "0.25rem" });
clearTheme(); // back to the token values
```

- Overrides apply on top of the active light/dark palette (same value in both modes).
- Unknown token names are a type error.
- The boilerplate ships no policy for *who* gets which theme (org, user, role); apps decide where overrides come from (e.g. a profile or organization record) and call `applyTheme` after login. Per-mode brand palettes are a deferred extension (runtime-theming D7).

## Color mode in code

```tsx
import { useColorMode } from "@/shared/context/ColorModeContext";

const { mode, resolvedMode, setMode } = useColorMode(); // mode: "light" | "dark" | "system"
```

`ColorModeProvider` wraps the app in `src/App.tsx`. The inline script in `index.html` applies the stored mode before React loads; it mirrors `colorMode.ts` and `colorMode.test.ts` keeps the storage key, mode names and class in sync.

**Content Security Policy:** the app sets no CSP today. If you add one, allow the inline color-mode script by its hash (or move it to a static file served before the bundle).
