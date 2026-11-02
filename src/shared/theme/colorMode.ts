/**
 * Color mode (light / dark / system). The inline script in index.html repeats the
 * resolve + apply logic before first paint (no flash); colorMode.test.ts checks
 * that it uses the same storage key, mode values and class.
 */

export const COLOR_MODES = ["light", "dark", "system"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];
export type ResolvedColorMode = Exclude<ColorMode, "system">;

export const DEFAULT_COLOR_MODE: ColorMode = "system";
export const COLOR_MODE_STORAGE_KEY = "color-mode";
export const DARK_MODE_CLASS = "dark";
export const PREFERS_DARK_QUERY = "(prefers-color-scheme: dark)";

export const isColorMode = (value: unknown): value is ColorMode =>
  typeof value === "string" && (COLOR_MODES as readonly string[]).includes(value);

/** Stored choice, or the default when nothing valid is stored or storage is unavailable. */
export const readStoredColorMode = (): ColorMode => {
  try {
    const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    return isColorMode(stored) ? stored : DEFAULT_COLOR_MODE;
  } catch {
    return DEFAULT_COLOR_MODE;
  }
};

export const storeColorMode = (mode: ColorMode): void => {
  try {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    // Storage unavailable (private mode): the choice lasts for this page only.
  }
};

export const systemPrefersDark = (): boolean =>
  typeof window.matchMedia === "function" && window.matchMedia(PREFERS_DARK_QUERY).matches;

export const resolveColorMode = (mode: ColorMode, prefersDark: boolean): ResolvedColorMode => {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode;
};

/**
 * Sets the mode class and color-scheme on <html>. Transitions are suspended for one
 * frame so components switch instantly instead of cross-fading.
 */
export const applyColorMode = (resolved: ResolvedColorMode): void => {
  const root = document.documentElement;
  const pause = document.createElement("style");
  pause.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(pause);

  root.classList.toggle(DARK_MODE_CLASS, resolved === "dark");
  root.style.colorScheme = resolved;

  void window.getComputedStyle(root).colorScheme;
  window.setTimeout(() => pause.remove(), 1);
};
