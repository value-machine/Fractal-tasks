import { describe, expect, it } from "vitest";
import { getErrorHash } from "./errorFingerprint";

const chromeStack = (file: string, line: number) =>
  `TypeError: x is undefined\n    at render (https://app.test/assets/${file}:${line}:17)\n    at other (https://app.test/assets/${file}:9:1)`;

describe("getErrorHash", () => {
  it("should return the same hash when the same error is reported twice", () => {
    const stack = chromeStack("index-AbCdEf12.js", 40);
    expect(getErrorHash("x is undefined", stack)).toBe(getErrorHash("x is undefined", stack));
  });

  it("should return different hashes when the messages differ", () => {
    const stack = chromeStack("index-AbCdEf12.js", 40);
    expect(getErrorHash("x is undefined", stack)).not.toBe(getErrorHash("y is null", stack));
  });

  it("should ignore ids and numbers in the message", () => {
    expect(getErrorHash("User 123 failed", undefined)).toBe(
      getErrorHash("User 456 failed", undefined)
    );
    expect(getErrorHash("Row 3b9f2c1e-0a4d-4f6e-9b1a-2c3d4e5f6a7b gone", undefined)).toBe(
      getErrorHash("Row 7d8e9f0a-1b2c-4d3e-8f4a-5b6c7d8e9f0a gone", undefined)
    );
  });

  it("should stay stable across deploys that only change asset hashes and line numbers", () => {
    expect(getErrorHash("x is undefined", chromeStack("index-AbCdEf12.js", 40))).toBe(
      getErrorHash("x is undefined", chromeStack("index-ZyXwVu98.js", 41))
    );
  });

  it("should differ when the top stack frame is a different function", () => {
    const other = chromeStack("index-AbCdEf12.js", 40).replace("at render", "at paint");
    expect(getErrorHash("x is undefined", chromeStack("index-AbCdEf12.js", 40))).not.toBe(
      getErrorHash("x is undefined", other)
    );
  });

  it("should read the Firefox stack format too", () => {
    const ff =
      "render@https://app.test/assets/index-AbCdEf12.js:40:17\nother@https://app.test/assets/index-AbCdEf12.js:9:1";
    const ffMoved = ff.replace("AbCdEf12", "ZyXwVu98").replace(":40:", ":50:");
    expect(getErrorHash("m", ff)).toBe(getErrorHash("m", ffMoved));
  });

  it("should return 8 to 128 characters", () => {
    const hash = getErrorHash("m", undefined);
    expect(hash.length).toBeGreaterThanOrEqual(8);
    expect(hash.length).toBeLessThanOrEqual(128);
  });
});
