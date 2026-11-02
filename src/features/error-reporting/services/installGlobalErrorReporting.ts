import type { ErrorReporter } from "../types/errorReport.types";
import { reportError } from "./errorReportService";

/** Browser notices that are not bugs and fire constantly. */
const IGNORED_MESSAGES = ["ResizeObserver loop"];

let installed = false;

/**
 * Reports uncaught errors and unhandled promise rejections. Safe to call twice: the second call
 * does nothing. Returns a function that removes the listeners (used by tests).
 */
export const installGlobalErrorReporting = (
  report: ErrorReporter = reportError,
  target: Window = window
): (() => void) => {
  if (installed) {
    return () => undefined;
  }
  installed = true;

  const onError = (event: ErrorEvent): void => {
    const subject: unknown = event.error ?? event.message;
    if (!subject || IGNORED_MESSAGES.some((notice) => String(event.message).includes(notice))) {
      return;
    }
    report(subject, "error");
  };
  const onRejection = (event: PromiseRejectionEvent): void => {
    report(event.reason, "unhandledrejection");
  };

  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onRejection);
  return () => {
    target.removeEventListener("error", onError);
    target.removeEventListener("unhandledrejection", onRejection);
    installed = false;
  };
};
