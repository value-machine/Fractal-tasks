import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { afterAll, describe, expect, it } from "vitest";
import { THEME_COLOR_TOKENS, THEME_TOKENS } from "./themeTokens";

/*
 * Contract for the W3C DTCG 2025.10 token source (src/shared/theme/tokens/):
 * spec conformance, generated CSS in sync, and CSS names in sync with THEME_TOKENS.
 * Guide: documentation/DOC_THEMING.md
 */

const repoRoot = resolve(__dirname, "../../..");
const tokensDir = resolve(__dirname, "tokens");
const generatedCss = readFileSync(join(tokensDir, "tokens.generated.css"), "utf8");

/** Tokens `applyTheme` accepts that the DTCG files leave out on purpose (derived in index.css). */
const OPTIONAL_TOKENS = ["card-radius", "input-radius"];
const BRAND_ELEVATIONS = ["elevation-brand", "elevation-brand-active"];
const MOTION_DURATIONS = ["duration-fast", "duration-normal", "duration-slow"];

type ColorValue = { colorSpace: string; components: number[]; hex?: string };

const FORMAT_SCHEMA = "https://www.designtokens.org/schemas/2025.10/format.json";
const RESOLVER_SCHEMA = "https://www.designtokens.org/schemas/2025.10/resolver.json";

const createSpecValidator = () => {
  const bundle = JSON.parse(
    readFileSync(join(repoRoot, "scripts/dtcg-schemas-2025.10.json"), "utf8")
  ) as { schemas: Record<string, object> };
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  for (const schema of Object.values(bundle.schemas)) ajv.addSchema(schema);
  return (schemaId: string, document: unknown) => {
    const validate = ajv.getSchema(schemaId);
    if (!validate) throw new Error(`Missing vendored schema ${schemaId}`);
    return validate(document) ? [] : (validate.errors ?? []);
  };
};

/** Custom property names declared in the block that starts with `prelude {`. */
const declaredIn = (prelude: string): string[] => {
  const start = generatedCss.indexOf(`${prelude} {`);
  if (start === -1) return [];
  const end = generatedCss.indexOf("\n}", start);
  return [...generatedCss.slice(start, end).matchAll(/^\s*--([a-z0-9-]+):/gm)].map((m) => m[1]);
};

describe("DTCG token files", () => {
  const validate = createSpecValidator();
  const files = readdirSync(tokensDir).filter((file) => file.endsWith(".json"));

  it.each(files)("should conform to the DTCG 2025.10 schema: %s", (file) => {
    const document = JSON.parse(readFileSync(join(tokensDir, file), "utf8"));
    const schemaId = file.endsWith(".resolver.json") ? RESOLVER_SCHEMA : FORMAT_SCHEMA;

    expect(validate(schemaId, document)).toEqual([]);
  });

  it("should keep every hex fallback equal to its sRGB components", () => {
    const mismatches: string[] = [];
    const visit = (node: unknown, path: string): void => {
      if (!node || typeof node !== "object") return;
      const value = (node as { $value?: unknown }).$value as ColorValue | undefined;
      if (value?.colorSpace === "srgb" && value.hex) {
        const hex = `#${value.components
          .map((c) =>
            Math.round(c * 255)
              .toString(16)
              .padStart(2, "0")
          )
          .join("")}`;
        if (hex !== value.hex.toLowerCase()) mismatches.push(`${path}: ${value.hex} vs ${hex}`);
      }
      for (const [key, child] of Object.entries(node)) visit(child, `${path}/${key}`);
    };
    for (const file of files) visit(JSON.parse(readFileSync(join(tokensDir, file), "utf8")), file);

    expect(mismatches).toEqual([]);
  });

  it("should reject tokens that break the spec", () => {
    const notASpecType = { label: { $type: "string", $value: "x" } };
    const colorWithoutSpace = { brand: { $type: "color", $value: { components: [1, 0, 0] } } };

    expect(validate(FORMAT_SCHEMA, notASpecType)).not.toEqual([]);
    expect(validate(FORMAT_SCHEMA, colorWithoutSpace)).not.toEqual([]);
  });
});

describe("generated token CSS", () => {
  const outDir = mkdtempSync(join(tmpdir(), "dtcg-tokens-"));
  afterAll(() => rmSync(outDir, { recursive: true, force: true }));

  it("should match a fresh build (run pnpm tokens:build after editing token files)", () => {
    // Run the CLI's JS entry through node: .bin/tz is a shell script that Windows can't execute.
    execFileSync(
      process.execPath,
      [
        join(repoRoot, "node_modules/@terrazzo/cli/bin/cli.js"),
        "build",
        "-c",
        "scripts/terrazzo.config.js",
        "--quiet",
      ],
      { cwd: repoRoot, env: { ...process.env, TOKENS_OUT_DIR: `${outDir}/` }, stdio: "pipe" }
    );
    const fresh = readFileSync(join(outDir, "tokens.generated.css"), "utf8");

    expect(fresh).toBe(generatedCss);
  }, 30_000);

  it("should declare every theme token in :root except the optional ones", () => {
    const expected = THEME_TOKENS.filter((token) => !OPTIONAL_TOKENS.includes(token));

    expect([...declaredIn(":root")].sort()).toEqual([...expected].sort());
  });

  it("should override only mode-dependent tokens in .dark", () => {
    const expected = [...THEME_COLOR_TOKENS, ...BRAND_ELEVATIONS];

    expect([...declaredIn(".dark")].sort()).toEqual([...expected].sort());
  });

  it("should override only durations for reduced motion", () => {
    const reduced = declaredIn("@media (prefers-reduced-motion: reduce)");

    expect([...reduced].sort()).toEqual([...MOTION_DURATIONS].sort());
  });
});
