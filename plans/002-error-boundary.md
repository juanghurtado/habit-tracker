# Plan 002: Add React error boundary to prevent full-app crashes

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat bcfcb39..HEAD -- src/`
> If any file under `src/` changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `bcfcb39`, 2026-06-25

## Why this matters

A single corrupt habit (e.g. from manually edited localStorage, or a render error in any component) crashes the entire app to a white screen. There is no error recovery UI, no console-friendly fallback, and no way for the user to know what happened. An error boundary catches render errors, logs them, and shows a recovery fallback that lets the user reset their data or reload.

## Current state

- `src/main.tsx:6-9` renders `<App />` directly inside `<StrictMode>` with no error boundary:
  ```tsx
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  ```
- `src/App.tsx` does not catch any errors. Neither does any component.
- No `react-error-boundary` package is installed (grep `package.json` — not present).

Repo conventions:
- Components are in `src/components/` with PascalCase names.
- Utility components use `cn()` from `src/lib/utils.ts` for class merging (see `src/components/ui/button.tsx:46`).
- The app uses `sonner` for toasts and `lucide-react` for icons.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `npm install` | exit 0 |
| Build | `npm run build` | exit 0 |
| Typecheck | `npm run build` (includes `tsc -b`) | exit 0 |

## Scope

**In scope**:
- `src/components/error-fallback.tsx` — create
- `src/components/error-boundary.tsx` — create (class component, since React error boundaries require class components)
- `src/main.tsx` — wrap `<App />` with error boundary
- `package.json` — no new dependencies needed (React 19 class component error boundary works without external packages)

**Out of scope**:
- `src/lib/storage.ts` — not touched
- `src/App.tsx` — not touched
- Any other component changes

## Git workflow

- Branch: `advisor/002-error-boundary`
- Commit style: conventional commits — `fix: add error boundary to prevent full-app crash on render error`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Create the error boundary class component

Create `src/components/error-boundary.tsx`:

```tsx
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
```

The fallback UI uses the same CSS custom properties (`--color-bg`, `--color-foreground`, etc.) as the rest of the app, so it works in both light and dark mode without additional CSS.

**Verify**: `npm run build` — exits 0.

### Step 2: Wrap App in error boundary in main.tsx

Open `src/main.tsx` and import the ErrorBoundary, then wrap `<App />`:

Before:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

After:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/error-boundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
```

**Verify**: `npm run build` — exits 0.

### Step 3: Verify the build

**Verify**: `npm run build` — exits 0 with no errors. Open `dist/index.html` in a browser, the app loads normally.

## Test plan

No automated tests for this plan — error boundaries are class components and would require React testing library + simulating a thrown error. The verifications below are manual but definitive:

1. `npm run build` succeeds.
2. Open the dev build (`npm run dev`) and verify the app renders normally.
3. No visual regression — the error boundary fallback only shows when there's an error.

## Done criteria

- [ ] `npm run build` exits 0
- [ ] `src/components/error-boundary.tsx` exists and exports `ErrorBoundary`
- [ ] `src/main.tsx` wraps `<App />` in `<ErrorBoundary>`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `npm run build` fails after changes.
- The code at the locations in "Current state" doesn't match the excerpts.
- React's strict mode double-invocation causes unexpected behavior with the error boundary (React 19 StrictMode calls `constructor` and `render` twice; `getDerivedStateFromError` should only fire once on actual errors).

## Maintenance notes

- The "Reset all data" button clears all localStorage keys. If new storage keys are added in the future, this button will clear them too — which is the desired behavior for "start fresh."
- The fallback UI uses hardcoded Tailwind-like classes that reference CSS custom properties. If the app's theme variables change, the fallback will need updating.
- The `handleReset` method resets the error boundary state but does NOT clear the underlying error cause. If the error is persistent (e.g. corrupt data in localStorage), the app will crash again immediately. The user would then use "Reset all data" or "Reload." This is intentional — the alternative (auto-retrying) would cause an infinite crash loop.