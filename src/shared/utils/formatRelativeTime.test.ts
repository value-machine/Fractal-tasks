import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "./formatRelativeTime";

const NOW = Date.parse("2026-01-31T12:00:00Z");

describe("formatRelativeTime", () => {
  it("should return just now when under a minute has passed", () => {
    expect(formatRelativeTime("2026-01-31T11:59:30Z", NOW)).toBe("just now");
  });

  it("should return minutes when under an hour has passed", () => {
    expect(formatRelativeTime("2026-01-31T11:15:00Z", NOW)).toBe("45 min ago");
  });

  it("should return hours when under a day has passed", () => {
    expect(formatRelativeTime("2026-01-31T09:00:00Z", NOW)).toBe("3 h ago");
  });

  it("should return days when under thirty days have passed", () => {
    expect(formatRelativeTime("2026-01-28T12:00:00Z", NOW)).toBe("3 d ago");
  });
});
