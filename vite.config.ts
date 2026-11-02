import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { devTasksPlugin } from "./vite-plugin-dev-tasks";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devTasksPlugin()],
  // Tags error reports as staging vs production; Cloudflare Workers Builds sets WORKERS_CI_BRANCH.
  define: { __BUILD_BRANCH__: JSON.stringify(process.env.WORKERS_CI_BRANCH ?? "") },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
