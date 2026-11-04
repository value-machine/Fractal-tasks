import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Alert } from "@/components/common/Alert";
import { PageLoadingState } from "@/components/common/PageLoadingState";

const isNotConfigured = (error: unknown): boolean =>
  error instanceof Error && error.name === "GoalTreeNotConfiguredError";

/**
 * Renders loading, error and "Supabase not configured" states for a goal query, and the
 * children (given the data) once it has loaded.
 */
export const GoalQueryState = <TData,>({
  query,
  children,
}: {
  query: Pick<UseQueryResult<TData>, "data" | "error" | "isPending">;
  children: (data: TData) => ReactNode;
}) => {
  if (query.isPending && !query.error) return <PageLoadingState />;
  if (isNotConfigured(query.error)) {
    return (
      <Alert variant="info">
        <b>Supabase is not configured.</b> Set <code>VITE_SUPABASE_URL</code> and{" "}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to load goals.
      </Alert>
    );
  }
  if (query.error || query.data === undefined) {
    return (
      <Alert variant="destructive">
        <b>Could not load this.</b>{" "}
        {query.error instanceof Error ? query.error.message : "Unknown error"}
      </Alert>
    );
  }
  return <>{children(query.data)}</>;
};
