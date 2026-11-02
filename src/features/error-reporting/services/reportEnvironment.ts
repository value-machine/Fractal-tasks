import type { ReportEnvironment } from "../types/errorReport.types";

/** Builds from this branch are production; builds from any other branch are previews. */
const PRODUCTION_BRANCH = "main";

interface ResolveEnvironmentInput {
  /** Explicit `VITE_APP_ENV`, if the owner set one. */
  override: string | undefined;
  /** True on the Vite dev server. */
  isDev: boolean;
  /** Git branch of the build (`WORKERS_CI_BRANCH` on Cloudflare Workers Builds), or "" if unknown. */
  buildBranch: string;
}

const isReportEnvironment = (value: unknown): value is ReportEnvironment =>
  value === "local" || value === "staging" || value === "production";

export const resolveReportEnvironment = ({
  override,
  isDev,
  buildBranch,
}: ResolveEnvironmentInput): ReportEnvironment => {
  if (isReportEnvironment(override)) {
    return override;
  }
  if (isDev) {
    return "local";
  }
  return buildBranch && buildBranch !== PRODUCTION_BRANCH ? "staging" : "production";
};

export const getReportEnvironment = (): ReportEnvironment =>
  resolveReportEnvironment({
    override: import.meta.env.VITE_APP_ENV,
    isDev: import.meta.env.DEV,
    buildBranch: typeof __BUILD_BRANCH__ === "string" ? __BUILD_BRANCH__ : "",
  });
