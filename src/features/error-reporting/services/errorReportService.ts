import { getSupabase, isSupabaseConfigured } from "@/shared/services/supabaseService";
import type {
  ErrorReportPayload,
  ErrorReporter,
  ErrorReportSender,
  ErrorReportType,
  ReportEnvironment,
} from "../types/errorReport.types";
import { getErrorHash } from "./errorFingerprint";
import { redactSensitiveText, sanitizeUrl } from "./redactSensitive";
import { getReportEnvironment } from "./reportEnvironment";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_STACK_LENGTH = 8000;
const MAX_USER_AGENT_LENGTH = 500;
/** Distinct errors sent per page load. The database also caps distinct clusters. */
const MAX_REPORTS_PER_PAGE = 20;

interface ErrorParts {
  name: string;
  message: string;
  stack?: string;
}

/** Reads name, message and stack from whatever was thrown or rejected. */
export const toErrorParts = (error: unknown): ErrorParts => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  if (typeof error === "string") {
    return { name: "Error", message: error };
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return { name: "Error", message: error.message };
  }
  if (error === undefined || error === null) {
    return { name: "Error", message: "Unknown error" };
  }
  return { name: "Error", message: String(error) };
};

interface ErrorReporterOptions {
  send: ErrorReportSender;
  getEnvironment: () => ReportEnvironment;
  /** Reporting is skipped while this returns false (for example when Supabase is not configured). */
  isEnabled: () => boolean;
  getUrl?: () => string;
  getUserAgent?: () => string;
  maxReports?: number;
}

type PayloadSources = Required<
  Pick<ErrorReporterOptions, "getEnvironment" | "getUrl" | "getUserAgent">
>;

const buildPayload = (
  error: unknown,
  type: ErrorReportType,
  sources: PayloadSources
): ErrorReportPayload => {
  const parts = toErrorParts(error);
  const message = redactSensitiveText(parts.message).slice(0, MAX_MESSAGE_LENGTH);
  const stack = parts.stack
    ? redactSensitiveText(parts.stack).slice(0, MAX_STACK_LENGTH)
    : undefined;
  return {
    hash: getErrorHash(message, stack),
    message,
    type,
    stack,
    environment: sources.getEnvironment(),
    url: sanitizeUrl(sources.getUrl()),
    userAgent: sources.getUserAgent().slice(0, MAX_USER_AGENT_LENGTH),
  };
};

/**
 * Builds a reporter that sends each distinct error once per page load, at most `maxReports`
 * in total, and never throws or reports its own failures. The counts live in the database, so
 * one send per hash per page load is enough.
 */
export const createErrorReporter = (options: ErrorReporterOptions): ErrorReporter => {
  const { send, isEnabled, maxReports = MAX_REPORTS_PER_PAGE } = options;
  const sources: PayloadSources = {
    getEnvironment: options.getEnvironment,
    getUrl: options.getUrl ?? (() => window.location.href),
    getUserAgent: options.getUserAgent ?? (() => navigator.userAgent),
  };
  const sentHashes = new Set<string>();
  let reporting = false;

  return (error, type) => {
    if (reporting || sentHashes.size >= maxReports || !isEnabled()) {
      return;
    }
    reporting = true;
    try {
      const payload = buildPayload(error, type, sources);
      if (sentHashes.has(payload.hash)) {
        return;
      }
      sentHashes.add(payload.hash);
      void Promise.resolve(send(payload)).catch(() => undefined);
    } catch {
      // Reporting must never break the app or report itself.
    } finally {
      reporting = false;
    }
  };
};

const sendToSupabase: ErrorReportSender = (payload) =>
  getSupabase().rpc("upsert_error_log", {
    p_hash: payload.hash,
    p_message: payload.message,
    p_environment: payload.environment,
    p_type: payload.type,
    p_stack: payload.stack ?? null,
    p_url: payload.url,
    p_user_agent: payload.userAgent,
  });

/** The app-wide reporter: writes through `upsert_error_log()` when Supabase is configured. */
export const reportError: ErrorReporter = createErrorReporter({
  send: sendToSupabase,
  getEnvironment: getReportEnvironment,
  isEnabled: isSupabaseConfigured,
});
