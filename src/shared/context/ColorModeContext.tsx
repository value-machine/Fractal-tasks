import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  COLOR_MODE_STORAGE_KEY,
  DEFAULT_COLOR_MODE,
  PREFERS_DARK_QUERY,
  applyColorMode,
  isColorMode,
  readStoredColorMode,
  resolveColorMode,
  storeColorMode,
  systemPrefersDark,
  type ColorMode,
  type ResolvedColorMode,
} from "@/shared/theme/colorMode";

export interface ColorModeContextValue {
  /** The user's choice: light, dark, or follow the OS. */
  mode: ColorMode;
  /** What is shown right now. */
  resolvedMode: ResolvedColorMode;
  setMode: (mode: ColorMode) => void;
}

const ColorModeContext = createContext<ColorModeContextValue | undefined>(undefined);

/** Follows the OS color scheme while `active`; returns whether it prefers dark. */
const useSystemPrefersDark = (active: boolean): boolean => {
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (!active || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(PREFERS_DARK_QUERY);
    const onChange = () => setPrefersDark(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [active]);

  return prefersDark;
};

/** Keeps the color mode in sync when it is changed in another tab. */
const useCrossTabColorMode = (onChange: (mode: ColorMode) => void): void => {
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== COLOR_MODE_STORAGE_KEY) return;
      onChange(isColorMode(event.newValue) ? event.newValue : DEFAULT_COLOR_MODE);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [onChange]);
};

export const ColorModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ColorMode>(readStoredColorMode);
  const prefersDark = useSystemPrefersDark(mode === "system");
  const resolvedMode = resolveColorMode(mode, prefersDark);

  useCrossTabColorMode(setModeState);

  useEffect(() => {
    applyColorMode(resolvedMode);
  }, [resolvedMode]);

  const setMode = useCallback((next: ColorMode) => {
    storeColorMode(next);
    setModeState(next);
  }, []);

  const value = useMemo(() => ({ mode, resolvedMode, setMode }), [mode, resolvedMode, setMode]);

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
};

export const useColorMode = (): ColorModeContextValue => {
  const context = useContext(ColorModeContext);
  if (context === undefined) {
    throw new Error("useColorMode must be used within a ColorModeProvider");
  }
  return context;
};
