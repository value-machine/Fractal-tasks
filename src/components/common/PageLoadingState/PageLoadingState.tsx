import { Spinner } from "@/components/common/Spinner";

interface PageLoadingStateProps {
  message?: string;
}

/**
 * Fallback UI for React Suspense (e.g. lazy-loaded routes).
 * Shows a centered spinner while the lazy component loads.
 */
export const PageLoadingState = ({ message }: PageLoadingStateProps) => (
  <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 py-8">
    <Spinner />
    {message && <p>{message}</p>}
  </div>
);
