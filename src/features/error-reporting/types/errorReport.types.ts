/** Where the app was running when the error happened. Matches the database check on `error_logs.environment`. */
export type ReportEnvironment = "local" | "staging" | "production";

/** What caught the error: a window error, an unhandled promise rejection, or the React route boundary. */
export type ErrorReportType = "error" | "unhandledrejection" | "react";

/** One cleaned error report, ready to send. All text fields are already redacted and cut to size. */
export interface ErrorReportPayload {
  hash: string;
  message: string;
  type: ErrorReportType;
  stack?: string;
  environment: ReportEnvironment;
  url: string;
  userAgent: string;
}

export type ErrorReportSender = (payload: ErrorReportPayload) => unknown;

/** Fire-and-forget reporter: never throws and never returns a promise to wait for. */
export type ErrorReporter = (error: unknown, type: ErrorReportType) => void;
