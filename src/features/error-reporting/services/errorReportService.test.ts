import { beforeEach, describe, expect, it, vi } from "vitest";
import { createErrorReporter, toErrorParts } from "./errorReportService";
import type { ErrorReportPayload } from "../types/errorReport.types";

const setup = (overrides: Partial<Parameters<typeof createErrorReporter>[0]> = {}) => {
  const send = vi.fn<(payload: ErrorReportPayload) => Promise<unknown>>().mockResolvedValue({});
  const report = createErrorReporter({
    send,
    getEnvironment: () => "staging",
    isEnabled: () => true,
    getUrl: () => "https://app.test/page?code=secret#frag",
    getUserAgent: () => "TestAgent/1.0",
    ...overrides,
  });
  return { send, report };
};

describe("createErrorReporter", () => {
  it("should send one report with a hash, environment, type and sanitized fields", () => {
    const { send, report } = setup();
    const error = new TypeError("Bad thing for jane@example.com");
    report(error, "error");
    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0];
    expect(payload.hash.length).toBeGreaterThanOrEqual(8);
    expect(payload.environment).toBe("staging");
    expect(payload.type).toBe("error");
    expect(payload.message).toBe("Bad thing for [email]");
    expect(payload.url).toBe("https://app.test/page");
    expect(payload.userAgent).toBe("TestAgent/1.0");
    expect(payload.stack).not.toContain("jane@example.com");
  });

  it("should send the same hash once per page load", () => {
    const { send, report } = setup();
    const error = new Error("same");
    report(error, "error");
    report(error, "error");
    report(new Error("same"), "error");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("should send different errors separately", () => {
    const { send, report } = setup();
    report(new Error("first problem"), "error");
    report(new Error("second problem"), "error");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("should stop after the per-page cap", () => {
    const { send, report } = setup({ maxReports: 3 });
    for (let i = 0; i < 10; i += 1)
      report(new Error(`distinct problem ${"x".repeat(i + 1)}`), "error");
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("should send nothing when reporting is disabled", () => {
    const { send, report } = setup({ isEnabled: () => false });
    report(new Error("boom"), "error");
    expect(send).not.toHaveBeenCalled();
  });

  it("should not throw when send throws synchronously", () => {
    const { report } = setup({
      send: () => {
        throw new Error("sync failure");
      },
    });
    expect(() => report(new Error("boom"), "error")).not.toThrow();
  });

  it("should swallow a rejected send without re-reporting it", async () => {
    const send = vi.fn().mockRejectedValue(new Error("network down"));
    const { report } = setup({ send });
    report(new Error("boom"), "error");
    await Promise.resolve();
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("should accept non-Error values", () => {
    const { send, report } = setup();
    report("plain string failure", "unhandledrejection");
    report({ message: "object failure" }, "unhandledrejection");
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0].message).toBe("plain string failure");
    expect(send.mock.calls[1][0].message).toBe("object failure");
    expect(send.mock.calls[0][0].type).toBe("unhandledrejection");
  });

  it("should cut the message to what the database accepts", () => {
    const { send, report } = setup();
    report(new Error("m".repeat(5000)), "error");
    expect(send.mock.calls[0][0].message.length).toBeLessThanOrEqual(2000);
  });
});

describe("toErrorParts", () => {
  it("should read name, message and stack from an Error", () => {
    const parts = toErrorParts(new RangeError("out of range"));
    expect(parts.name).toBe("RangeError");
    expect(parts.message).toBe("out of range");
    expect(parts.stack).toContain("out of range");
  });

  it("should describe unknown values without throwing", () => {
    expect(toErrorParts(undefined).message).toBe("Unknown error");
    expect(toErrorParts(42).message).toBe("42");
  });
});

describe("default reporter", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should call the upsert_error_log function with p_ parameters", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    vi.doMock("@/shared/services/supabaseService", () => ({
      isSupabaseConfigured: () => true,
      getSupabase: () => ({ rpc }),
    }));
    const { reportError } = await import("./errorReportService");
    reportError(new Error("wired up"), "react");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe("upsert_error_log");
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_message: "wired up",
      p_type: "react",
      p_environment: expect.stringMatching(/^(local|staging|production)$/),
    });
    expect(rpc.mock.calls[0][1].p_hash.length).toBeGreaterThanOrEqual(8);
  });

  it("should not call Supabase when it is not configured", async () => {
    const rpc = vi.fn();
    vi.doMock("@/shared/services/supabaseService", () => ({
      isSupabaseConfigured: () => false,
      getSupabase: () => ({ rpc }),
    }));
    const { reportError } = await import("./errorReportService");
    reportError(new Error("no backend"), "error");
    expect(rpc).not.toHaveBeenCalled();
  });
});
