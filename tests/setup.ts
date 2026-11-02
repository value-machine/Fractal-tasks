import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { installMatchMediaMock } from "./test-utils";

// jsdom has no matchMedia; default to a light OS. Tests call installMatchMediaMock to change it.
beforeEach(() => {
  installMatchMediaMock(false);
});

// Cleanup after each test (DOM, stored color mode, mode class)
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
});
