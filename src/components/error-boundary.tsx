import * as React from "react"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center bg-bg px-4 text-center">
          <div className="mb-6 flex size-20 items-center justify-center rounded-3xl bg-destructive/10">
            <span className="text-3xl">!</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Something went wrong</h2>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            An unexpected error occurred. You can try reloading, or reset your data to start fresh.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95"
            >
              Reload
            </button>
            <button
              onClick={this.handleReset}
              className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted active:scale-95"
            >
              Try again
            </button>
          </div>
          <button
            onClick={() => {
              localStorage.clear()
              window.location.reload()
            }}
            className="mt-4 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Reset all data
          </button>
        </div>
      )
    }
    return this.props.children
  }
}