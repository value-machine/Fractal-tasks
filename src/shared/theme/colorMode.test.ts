import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COLOR_MODES,
  COLOR_MODE_STORAGE_KEY,
  DARK_MODE_CLASS,
  PREFERS_DARK_QUERY,
  applyColorMode,
  readStoredColorMode,
  resolveColorMode,
  storeColorMode,
} from "./colorMode";

describe("resolveColorMode", () => {
  it("should follow the OS when mode is system", () => {
    expect(resolveColorMode("system", true)).toBe("dark");
    expect(resolveColorMode("system", false)).toBe("light");
  });

  it("should ignore the OS when mode is explicit", () => {
    expect(resolveColorMode("light", true)).toBe("light");
    expect(resolveColorMode("dark", false)).toBe("dark");
  });
});

describe("stored color mode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should default to system when nothing is stored", () => {
    expect(readStoredColorMode()).toBe("system");
  });

  it("should read back a stored mode", () => {
    storeColorMode("dark");
    expect(readStoredColorMode()).toBe("dark");
  });

  it("should fall back to system when the stored value is invalid", () => {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, "sepia");
    expect(readStoredColorMode()).toBe("system");
  });

  it("should fall back to system when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readStoredColorMode()).toBe("system");
  });

  it("should not throw when storage cannot be written", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => storeColorMode("light")).not.toThrow();
  });
});

describe("applyColorMode", () => {
  it("should set the dark class and color-scheme", () => {
    applyColorMode("dark");
    expect(document.documentElement.classList.contains(DARK_MODE_CLASS)).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");

    applyColorMode("light");
    expect(document.documentElement.classList.contains(DARK_MODE_CLASS)).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});

describe("index.html anti-flash script", () => {
  const html = readFileSync(resolve(__dirname, "../../../index.html"), "utf8");

  it("should use the same storage key, modes, class and media query as colorMode.ts", () => {
    expect(html).toContain(`getItem("${COLOR_MODE_STORAGE_KEY}")`);
    COLOR_MODES.forEach((mode) => expect(html).toContain(`"${mode}"`));
    expect(html).toContain(`classList.toggle("${DARK_MODE_CLASS}"`);
    expect(html).toContain(`matchMedia("${PREFERS_DARK_QUERY}")`);
  });
});
