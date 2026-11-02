/**
 * Theme token contract. Every name here is a CSS variable generated from the
 * W3C DTCG token files in ./tokens/ (`pnpm tokens:build` -> tokens.generated.css:
 * `:root` = light defaults, `.dark` = dark overrides). dtcgTokens.test.ts keeps
 * this list, the token files and the generated CSS in sync.
 * Guide: documentation/DOC_THEMING.md
 */

/** Tokens whose values differ between light and dark (light/dark.tokens.json). */
export const THEME_COLOR_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "primary-gradient-start",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "success",
  "warning",
  "info",
  "border",
  "input",
  "ring",
  "overlay",
  "scrollbar",
  "scrollbar-hover",
] as const;

/** Tokens shared by both modes (base.tokens.json; card/input radius are optional overrides). */
export const THEME_SHARED_TOKENS = [
  "body-font",
  "heading-font",
  "mono-font",
  "radius",
  "spacing",
  "app-toolbar-height",
  "button-radius",
  "card-radius",
  "input-radius",
  "duration-fast",
  "duration-normal",
  "duration-slow",
  "ease-standard",
  "elevation-sm",
  "elevation-md",
  "elevation-lg",
  "elevation-xl",
  "elevation-brand",
  "elevation-brand-active",
] as const;

export const THEME_TOKENS = [...THEME_COLOR_TOKENS, ...THEME_SHARED_TOKENS] as const;

export type ThemeTokenName = (typeof THEME_TOKENS)[number];

/** Token values to override at runtime, e.g. `{ primary: "#2563eb", radius: "0" }`. */
export type ThemeOverrides = Partial<Record<ThemeTokenName, string>>;

/**
 * Applies token overrides on top of the active light/dark palette by setting CSS
 * variables on <html>. Later calls add to or replace earlier overrides; use
 * `clearTheme()` to go back to the stylesheet values.
 */
export const applyTheme = (overrides: ThemeOverrides): void => {
  const style = document.documentElement.style;
  for (const [token, value] of Object.entries(overrides)) {
    if (value !== undefined) style.setProperty(`--${token}`, value);
  }
};

/** Removes every runtime override set by `applyTheme`. */
export const clearTheme = (): void => {
  const style = document.documentElement.style;
  for (const token of THEME_TOKENS) style.removeProperty(`--${token}`);
};
