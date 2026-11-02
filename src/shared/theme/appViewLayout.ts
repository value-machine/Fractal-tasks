/**
 * Shared layout class names (Tailwind) for app views.
 * Toolbar height comes from the `--app-toolbar-height` token in `src/index.css`.
 */

/** Shared max width for centered form surfaces (sign-in, home, reset password). */
export const formContentWidthClassName = "w-full max-w-[420px]";

/** Centered form column width for stacked auth-style surfaces. */
export const centeredFormSurfaceClassName = `mx-auto ${formContentWidthClassName}`;

/** Full viewport column below the app toolbar (shell layouts and auth pages). */
export const appViewportClassName =
  "box-border flex max-h-[calc(100dvh-var(--app-toolbar-height))] min-h-[calc(100dvh-var(--app-toolbar-height))] flex-col overflow-hidden";

/** Scrollable centered content inside `appViewportClassName`. */
export const appScrollContentClassName =
  "flex min-h-0 w-full flex-1 flex-col items-center overflow-x-hidden overflow-y-auto px-4 py-1 sm:px-6 sm:py-3";

/** Responsive vertical rhythm inside stacked form panels. */
export const formStackSpacing = {
  sectionBelow: "mb-2 sm:mb-3",
  sectionAbove: "mt-2 sm:mt-3",
  divider: "my-2 sm:my-3",
} as const;

/** Inline form alerts (errors, success) shared across sign-in surfaces. */
export const formInlineAlertClassName = `${formStackSpacing.sectionBelow} py-1 sm:py-2`;
