import { afterEach, describe, expect, it, vi } from "vitest";
import { installGlobalErrorReporting } from "./installGlobalErrorReporting";

const rejection = (reason: unknown) => Object.assign(new Event("unhandledrejection"), { reason });

describe("installGlobalErrorReporting", () => {
  let uninstall: (() => void) | undefined;
  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
  });

  it("should report an uncaught error", () => {
    const report = vi.fn();
    uninstall = installGlobalErrorReporting(report);
    const error = new Error("uncaught");
    window.dispatchEvent(new ErrorEvent("error", { error, message: "uncaught" }));
    expect(report).toHaveBeenCalledWith(error, "error");
  });

  it("should report an unhandled rejection with its reason", () => {
    const report = vi.fn();
    uninstall = installGlobalErrorReporting(report);
    const reason = new Error("rejected");
    window.dispatchEvent(rejection(reason));
    expect(report).toHaveBeenCalledWith(reason, "unhandledrejection");
  });

  it("should ignore events that carry neither an error nor a message", () => {
    const report = vi.fn();
    uninstall = installGlobalErrorReporting(report);
    window.dispatchEvent(new Event("error"));
    expect(report).not.toHaveBeenCalled();
  });

  it("should ignore the ResizeObserver browser notice", () => {
    const report = vi.fn();
    uninstall = installGlobalErrorReporting(report);
    window.dispatchEvent(
      new ErrorEvent("error", {
        message: "ResizeObserver loop completed with undelivered notifications.",
      })
    );
    expect(report).not.toHaveBeenCalled();
  });

  it("should install only once", () => {
    const report = vi.fn();
    uninstall = installGlobalErrorReporting(report);
    const second = installGlobalErrorReporting(report);
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("once"), message: "once" }));
    second();
    expect(report).toHaveBeenCalledTimes(1);
  });

  it("should stop reporting after uninstall", () => {
    const report = vi.fn();
    const stop = installGlobalErrorReporting(report);
    stop();
    // Message only: vitest re-throws window errors that carry an error object when nobody listens.
    window.dispatchEvent(new ErrorEvent("error", { message: "late" }));
    expect(report).not.toHaveBeenCalled();
  });
});
