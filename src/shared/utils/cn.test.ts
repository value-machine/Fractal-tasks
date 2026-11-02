import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("should let a later elevation override an earlier one", () => {
    expect(cn("elevation-md", "elevation-lg")).toBe("elevation-lg");
  });

  it("should treat elevation and built-in shadows as the same group", () => {
    expect(cn("shadow-md", "elevation-lg")).toBe("elevation-lg");
  });

  it("should resolve theme radius tokens against built-in radii", () => {
    expect(cn("rounded-button", "rounded-none")).toBe("rounded-none");
    expect(cn("rounded-md", "rounded-input")).toBe("rounded-input");
  });

  it("should drop falsy inputs and keep unrelated classes", () => {
    const hidden = false;
    expect(cn("px-2", hidden && "hidden", "rounded-card")).toBe("px-2 rounded-card");
  });
});
