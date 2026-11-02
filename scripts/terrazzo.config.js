/**
 * Terrazzo config: builds the W3C DTCG 2025.10 theme tokens into CSS variables.
 *
 * Source: src/shared/theme/tokens/theme.resolver.json (+ *.tokens.json)
 * Output: src/shared/theme/tokens/tokens.generated.css (committed; do not edit)
 * Run from the repo root: pnpm tokens:build. Guide: documentation/DOC_THEMING.md
 */
import { defineConfig } from "@terrazzo/cli";
import css from "@terrazzo/plugin-css";

/** CSS variable = the token's own name; groups only organize the DTCG tree. */
export const tokenCssVariable = (token) => {
  const path = token.id.split(".");
  const name = path.at(-1) === "$root" ? path.at(-2) : path.at(-1);
  return `--${name}`;
};

export const TOKENS_DIR = "./src/shared/theme/tokens/";

export const cssPluginOptions = {
  filename: "tokens.generated.css",
  legacyHex: true,
  variableName: tokenCssVariable,
  // Non-default contexts emit only their own modifier's tokens (sets: []), so the
  // reduced-motion block cannot re-declare light colors over `.dark`.
  permutations: [
    { input: {}, prepare: (contents) => `:root {\n  ${contents}\n}` },
    {
      input: { mode: "dark" },
      only: { modifiers: ["mode"], sets: [] },
      prepare: (contents) => `.dark {\n  ${contents}\n}`,
    },
    {
      input: { motion: "reduced" },
      only: { modifiers: ["motion"], sets: [] },
      prepare: (contents) =>
        `@media (prefers-reduced-motion: reduce) {\n  :root {\n    ${contents}\n  }\n}`,
    },
  ],
};

export default defineConfig({
  tokens: [`${TOKENS_DIR}theme.resolver.json`],
  // TOKENS_OUT_DIR: lets the drift test build into a temp dir.
  outDir: process.env.TOKENS_OUT_DIR ?? TOKENS_DIR,
  plugins: [css(cssPluginOptions)],
});
