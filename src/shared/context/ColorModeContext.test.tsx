import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installMatchMediaMock } from "tests/test-utils";
import { COLOR_MODE_STORAGE_KEY } from "@/shared/theme/colorMode";
import { ColorModeProvider, useColorMode } from "./ColorModeContext";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ColorModeProvider>{children}</ColorModeProvider>
);
const isDarkClassSet = () => document.documentElement.classList.contains("dark");

describe("ColorModeProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should follow the OS by default", () => {
    installMatchMediaMock(true);
    const { result } = renderHook(() => useColorMode(), { wrapper });

    expect(result.current.mode).toBe("system");
    expect(result.current.resolvedMode).toBe("dark");
    expect(isDarkClassSet()).toBe(true);
  });

  it("should update when the OS changes while in system mode", () => {
    const os = installMatchMediaMock(false);
    const { result } = renderHook(() => useColorMode(), { wrapper });

    act(() => os.setPrefersDark(true));

    expect(result.current.resolvedMode).toBe("dark");
    expect(isDarkClassSet()).toBe(true);
  });

  it("should ignore OS changes when a mode is chosen", () => {
    const os = installMatchMediaMock(false);
    const { result } = renderHook(() => useColorMode(), { wrapper });

    act(() => result.current.setMode("light"));
    act(() => os.setPrefersDark(true));

    expect(result.current.resolvedMode).toBe("light");
    expect(isDarkClassSet()).toBe(false);
  });

  it("should persist the chosen mode", () => {
    const { result } = renderHook(() => useColorMode(), { wrapper });

    act(() => result.current.setMode("dark"));

    expect(window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("dark");
    expect(isDarkClassSet()).toBe(true);
  });

  it("should start from the stored mode", () => {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, "dark");
    const { result } = renderHook(() => useColorMode(), { wrapper });

    expect(result.current.mode).toBe("dark");
  });

  it("should follow a mode change made in another tab", () => {
    const { result } = renderHook(() => useColorMode(), { wrapper });

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: COLOR_MODE_STORAGE_KEY, newValue: "dark" })
      );
    });

    expect(result.current.mode).toBe("dark");
  });

  it("should keep working when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useColorMode(), { wrapper });

    expect(result.current.mode).toBe("system");
    act(() => result.current.setMode("dark"));
    expect(result.current.resolvedMode).toBe("dark");
  });

  it("should listen to the OS only while in system mode", () => {
    const os = installMatchMediaMock(false);
    const { result } = renderHook(() => useColorMode(), { wrapper });
    expect(os.listenerCount()).toBe(1);

    act(() => result.current.setMode("dark"));

    expect(os.listenerCount()).toBe(0);
  });

  it("should remove its OS and storage listeners on unmount", () => {
    const os = installMatchMediaMock(false);
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useColorMode(), { wrapper });

    unmount();

    expect(os.listenerCount()).toBe(0);
    expect(removeWindowListener).toHaveBeenCalledWith("storage", expect.any(Function));
  });

  it("should throw when used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useColorMode())).toThrow(/ColorModeProvider/);
  });
});
