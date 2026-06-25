import * as React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center bg-bg px-4 text-center">
          <div className="mb-6 flex size-20 items-center justify-center rounded-3xl bg-destructive/10">
            <span className="text-3xl">!</span>
          </div>
          <h2 className="font-bold text-2xl text-foreground">
            Something went wrong
          </h2>
          <p className="mt-2 max-w-xs text-muted-foreground text-sm leading-relaxed">
            An unexpected error occurred. You can try reloading, or reset your
            data to start fresh.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 font-medium text-primary-foreground text-sm shadow-sm transition-all hover:brightness-110 active:scale-95"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <button
              className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-card px-5 font-medium text-foreground text-sm shadow-sm transition-all hover:bg-muted active:scale-95"
              onClick={this.handleReset}
            >
              Try again
            </button>
          </div>
          <button
            className="mt-4 text-muted-foreground text-sm underline underline-offset-2 hover:text-foreground"
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
          >
            Reset all data
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
