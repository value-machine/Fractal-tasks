import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    // Node test runner files under scripts/ (pnpm test:classify) and plugins/ (pnpm test:plugin)
    exclude: ["**/node_modules/**", "**/dist/**", "scripts/**", "plugins/**"],
    // Default 5000ms is too tight when the full suite warms JSDOM on slower hosts (Windows).
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      tests: path.resolve(__dirname, "./tests"),
    },
  },
});
