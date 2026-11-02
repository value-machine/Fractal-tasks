import type { ReactNode } from "react";
import { Component } from "react";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";

interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

interface QueryErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for catching query and render errors in the child tree.
 * Renders a fallback UI with retry option when an error occurs.
 *
 * Note: Catches all errors in children, not just TanStack Query errors.
 * Use at route level or around sections where query errors should be handled.
 */
export class QueryErrorBoundary extends Component<
  QueryErrorBoundaryProps,
  QueryErrorBoundaryState
> {
  constructor(props: QueryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): QueryErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error);
    if (import.meta.env.DEV) {
      console.error("QueryErrorBoundary caught:", error);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8">
          <Alert variant="destructive" className="max-w-[400px]">
            Something went wrong. Please try again.
          </Alert>
          <Button onClick={this.handleRetry}>Retry</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
