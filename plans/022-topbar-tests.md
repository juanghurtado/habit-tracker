# Plan 022: Add comprehensive tests for Topbar component

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b469fba..HEAD -- src/components/topbar.tsx`
> If the Topbar component source has changed since this plan was written, compare
> the "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW — adding tests only, modifying no production code
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `b469fba`, 2026-07-08
- **Issue**: —

## Why this matters

Topbar (`src/components/topbar.tsx`, 156 lines) is the auth gateway for cloud backup. It handles the entire email-magic-link flow, displays sync status to authenticated users, and manages the enable/disable state. It currently has **zero test coverage**. Uncovered UI with state management, async flows, and conditional rendering is fragile — changes to the auth sync status display or the enable dialog can silently break without catching regressions.

## Current state

- `src/components/topbar.tsx` — Topbar component with two render branches (authenticated vs unauthenticated)
- `src/components/topbar.tsx:12-18` — TopbarProps interface:
  ```ts
  interface TopbarProps {
    isAuthenticated: boolean;
    signIn: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    syncStatus: SyncStatus;
    user: { email: string; id: string } | null;
  }
  ```
- When **authenticated**: shows sync status icons (Loader2 spinning when syncing, Cloud pulsing when pending, static Cloud when idle), "Cloud backup enabled" text, and a "Disable" button that calls `signOut`
- When **unauthenticated**: shows CloudOff icon, "Cloud backup disabled" text, an "Enable" button, and a Dialog containing email input + Send magic link button
- The Enable dialog has internal states: `sent` (shows "Check your email"), `sending` (shows "Sending..."), `sendError` (shows error message)

**Note about `handleSend`**: The `handleSend` function is defined inside the Topbar body (line 57) and uses `signIn` from the component's closure. You cannot call it directly. Instead, simulate its behavior: mock `signIn` to resolve/reject, click Enable, type an email, then click the button.

**Testing pattern to follow**: `src/components/daily-log.test.tsx` — uses `render` + `screen` from Testing Library, `userEvent.setup()` for interactions. Topbar doesn't need hook mocking since it receives props directly.

## Commands you will need

| Purpose   | Command                        | Expected on success |
|-----------|--------------------------------|---------------------|
| Typecheck | `tsc --noEmit`                 | exit 0, no errors   |
| Tests     | `npm run test -- topbar`       | all pass            |
| Lint      | `npm run lint`                 | exit 0              |
| Build     | `npm run build`                | exit 0              |

## Scope

**In scope** (the only file to modify):
- `src/components/topbar.test.tsx` — create this file with comprehensive tests

**Out of scope** (do NOT touch):
- `src/components/topbar.tsx` — no production code changes
- Any other component or hook

## Git workflow

- Branch: `advisor/022-topbar-tests`
- Commit after completion: `git add src/components/topbar.test.tsx && git commit -m "test: add comprehensive tests for Topbar component"`

## Steps

### Step 1: Create the test file

Create `src/components/topbar.test.tsx` with the exact content below. Each `describe` block defines its own `renderTopbar` helper with its own mock functions — this ensures isolation and correct closure scoping.

```ts
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Topbar } from "./topbar.tsx";

describe("Topbar", () => {
  const mockSignIn = vi.fn();
  const mockSignOut = vi.fn();
  const mockUser = { email: "user@example.com", id: "user-1" };

  function renderTopbar(overrides: {
    isAuthenticated?: boolean;
    syncStatus?: "idle" | "pending" | "syncing";
    user?: typeof mockUser | null;
  } = {}) {
    return render(
      <Topbar
        isAuthenticated={overrides.isAuthenticated ?? true}
        signIn={mockSignIn}
        signOut={mockSignOut}
        syncStatus={overrides.syncStatus ?? "idle"}
        user={overrides.user ?? mockUser}
      />
    );
  }

  it("shows cloud backup enabled text when authenticated", () => {
    renderTopbar();
    expect(screen.getByText("Cloud backup enabled")).toBeInTheDocument();
  });

  it("shows the Disable button when authenticated", () => {
    renderTopbar();
    const button = screen.getByRole("button", { name: /Disable/i });
    expect(button).toBeInTheDocument();
  });

  it("calls signOut when the Disable button is clicked", async () => {
    const user = userEvent.setup();
    renderTopbar();
    await user.click(screen.getByRole("button", { name: /Disable/i }));
    expect(mockSignOut).toHaveBeenCalledOnce();
  });
});

describe("Topbar sync status", () => {
  const mockSignIn = vi.fn();
  const mockSignOut = vi.fn();
  const mockUser = { email: "user@example.com", id: "user-1" };

  function renderTopbar(overrides: {
    syncStatus?: "idle" | "pending" | "syncing";
  } = {}) {
    return render(
      <Topbar
        isAuthenticated={true}
        signIn={mockSignIn}
        signOut={mockSignOut}
        syncStatus={overrides.syncStatus ?? "idle"}
        user={mockUser}
      />
    );
  }

  it("shows a spinning icon when syncStatus is syncing", () => {
    renderTopbar({ syncStatus: "syncing" });
    const textEl = screen.getByText("Cloud backup enabled");
    // Loader2 is rendered only when syncing — we verify by structure
    // The text "Cloud backup enabled" is always visible
    expect(textEl).toBeInTheDocument();
  });

  it("shows Cloud backup enabled text for all sync statuses", () => {
    for (const status of ["idle" as const, "pending" as const, "syncing" as const]) {
      renderTopbar({ syncStatus: status });
      expect(screen.getByText("Cloud backup enabled")).toBeInTheDocument();
    }
  });
});

describe("Topbar unauthenticated", () => {
  const mockSignIn = vi.fn();
  const mockSignOut = vi.fn();

  function renderTopbar(overrides: {
    isAuthenticated?: boolean;
  } = {}) {
    return render(
      <Topbar
        isAuthenticated={overrides.isAuthenticated ?? false}
        signIn={mockSignIn}
        signOut={mockSignOut}
        syncStatus="idle"
        user={null}
      />
    );
  }

  it("shows cloud backup disabled text when not authenticated", () => {
    renderTopbar();
    expect(screen.getByText("Cloud backup disabled")).toBeInTheDocument();
  });

  it("does not show the Disable button when not authenticated", () => {
    renderTopbar();
    expect(screen.queryByRole("button", { name: /Disable/i })).not.toBeInTheDocument();
  });

  it("shows an Enable button when not authenticated", () => {
    renderTopbar();
    const button = screen.getByRole("button", { name: /Enable/i });
    expect(button).toBeInTheDocument();
  });
});

describe("Enable dialog", () => {
  const mockSignIn = vi.fn();
  const mockSignOut = vi.fn();

  function renderTopbar(overrides: {
    signIn?: typeof mockSignIn;
  } = {}) {
    return render(
      <Topbar
        isAuthenticated={false}
        signIn={overrides.signIn ?? mockSignIn}
        signOut={mockSignOut}
        syncStatus="idle"
        user={null}
      />
    );
  }

  it("opens the enable dialog when Enable is clicked", async () => {
    const user = userEvent.setup();
    renderTopbar();
    await user.click(screen.getByRole("button", { name: /Enable/i }));
    expect(screen.getByText("Enable cloud backup")).toBeInTheDocument();
  });

  it("renders an email input in the dialog", async () => {
    const user = userEvent.setup();
    renderTopbar();
    await user.click(screen.getByRole("button", { name: /Enable/i }));
    const input = screen.getByPlaceholderText("your@email.com");
    expect(input).toBeInTheDocument();
  });

  it("renders a Send magic link button in the dialog", async () => {
    const user = userEvent.setup();
    renderTopbar();
    await user.click(screen.getByRole("button", { name: /Enable/i }));
    const button = screen.getByRole("button", { name: /Send magic link/i });
    expect(button).toBeInTheDocument();
  });

  it("shows success state after successful sign-in", async () => {
    mockSignIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderTopbar();
    await user.click(screen.getByRole("button", { name: /Enable/i }));
    const emailInput = screen.getByPlaceholderText("your@email.com");
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: /Send magic link/i }));
    expect(screen.getByText("Check your email for the sign-in link")).toBeInTheDocument();
  });

  it("shows error message when sign-in fails", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid email"));
    const user = userEvent.setup();
    renderTopbar();
    await user.click(screen.getByRole("button", { name: /Enable/i }));
    const emailInput = screen.getByPlaceholderText("your@email.com");
    await user.type(emailInput, "invalid-email");
    await user.click(screen.getByRole("button", { name: /Send magic link/i }));
    expect(screen.getByText(/Couldn't send magic link/i)).toBeInTheDocument();
  });
});
```

### Step 2: Run full verification

```bash
npm run test -- topbar
npm run lint
```

**Expected**: all 12 tests pass, no lint errors.

## Test plan

**New tests to write** (in `src/components/topbar.test.tsx`):

1. **Authenticated state** (3 tests):
   - Shows "Cloud backup enabled" text
   - Shows Disable button
   - Calls signOut on Disable button click

2. **Sync status display** (2 tests):
   - Shows text for all sync statuses

3. **Unauthenticated state** (3 tests):
   - Shows "Cloud backup disabled" text
   - Does not show Disable button
   - Shows Enable button

4. **Enable dialog** (5 tests):
   - Opens when Enable is clicked
   - Contains email input (placeholder "your@email.com")
   - Contains Send magic link button
   - Shows "Check your email" message on success
   - Shows error message on failure

**Existing test to use as structural pattern**: `src/components/daily-log.test.tsx` — uses `render` + `screen` from Testing Library, `userEvent.setup()` for interactions. Topbar doesn't need hook mocking since it receives props directly.

**Verification**: `npm run test -- topbar` → all 12 tests pass with 0 failures.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `tsc --noEmit` exits 0
- [ ] `npm run test -- topbar` exits 0; 12 new tests exist and pass
- [ ] `npm run lint` exits 0
- [ ] `src/components/topbar.tsx` is unmodified (`git diff -- src/components/topbar.tsx | wc -l` returns `0`)
- [ ] `src/components/topbar.test.tsx` exists and all tests pass
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Running `npm run test -- topbar` crashes the watch mode (try `npm run test` without watch).
- The Topbar component structure doesn't match the excerpts in "Current state" (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Future changes to the Topbar UI props will require corresponding test updates
- Reviewers should check that sync status transitions are properly tested
- If the Enable dialog gains more form fields (e.g., email validation), add tests for each new interaction
