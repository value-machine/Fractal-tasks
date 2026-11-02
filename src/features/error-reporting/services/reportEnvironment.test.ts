import { describe, expect, it } from "vitest";
import { resolveReportEnvironment } from "./reportEnvironment";

describe("resolveReportEnvironment", () => {
  it("should use a valid override before anything else", () => {
    expect(
      resolveReportEnvironment({ override: "staging", isDev: true, buildBranch: "main" })
    ).toBe("staging");
  });

  it("should ignore an invalid override", () => {
    expect(resolveReportEnvironment({ override: "qa", isDev: true, buildBranch: "" })).toBe(
      "local"
    );
  });

  it("should return local on the dev server", () => {
    expect(
      resolveReportEnvironment({ override: undefined, isDev: true, buildBranch: "feat/x" })
    ).toBe("local");
  });

  it("should return staging when the build branch is not main", () => {
    expect(
      resolveReportEnvironment({
        override: undefined,
        isDev: false,
        buildBranch: "claude/some-branch",
      })
    ).toBe("staging");
  });

  it("should return production when the build branch is main", () => {
    expect(
      resolveReportEnvironment({ override: undefined, isDev: false, buildBranch: "main" })
    ).toBe("production");
  });

  it("should return production when no branch is known", () => {
    expect(resolveReportEnvironment({ override: undefined, isDev: false, buildBranch: "" })).toBe(
      "production"
    );
  });
});
