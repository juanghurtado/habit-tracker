# Plan 001: Consolidate duplicate `access_token` hash checks in App.tsx

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `advisor-plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cb4580b..HEAD -- src/App.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `cb4580b`, 2026-07-03
- **Issue**: —

## Why this matters

`App.tsx` has two separate `useEffect` hooks (lines 25-30 and 32-42) that both check `window.location.hash.includes("access_token")`. The first clears the hash via `replaceState`; the second reads it to decide whether to show the PWA install banner. Because React batches `useEffect` calls within the same render but the effects run sequentially, the second effect may read the hash **before** the first effect has had a chance to clear it — causing the install banner to incorrectly show after a Supabase magic-link callback. This is a real race condition that affects the user experience when signing in via email.

## Current state

### File: `src/App.tsx`

The problematic code spans lines 25-42:

```tsx
// Lines 25-30: Effect 1 — clears the hash
useEffect(() => {
  const hash = window.location.hash;
  if (hash.includes("access_token")) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, []);

// Lines 32-42: Effect 2 — checks the same hash for install banner
useEffect(() => {
  const isFromEmail = window.location.hash.includes("access_token");
  const isStandalone = window.matchMedia(
    "(display-mode: standalone)"
  ).matches;
  const dismissed = localStorage.getItem("pwa-install-banner-dismissed");

  if (isFromEmail && !isStandalone && !dismissed) {
    setShowInstallBanner(true);
  }
}, []);
```

### Convention to match

- The repo uses `useEffect` with `[]` deps for one-time initialization (see `App.tsx:25`, `use-auth.tsx:38`).
- No existing test covers the `access_token` hash flow — the `use-auth.test.tsx` mocks `getSession` but doesn't test hash parsing.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npx tsc -b` | exit 0, no errors |
| Tests | `npm test` | all 107 tests pass |
| Lint | `npm exec -- ultracite check` | exit 0, no issues |

## Scope

**In scope** (the only files you should modify):
- `src/App.tsx`

**Out of scope** (do NOT touch):
- `src/hooks/use-auth.tsx` — the Supabase auth flow is handled there
- `src/components/service-worker-registration.tsx` — PWA registration is separate
- Any test files — no behavioral change means no new tests needed

## Git workflow

- Branch: `advisor/001-consolidate-hash-effects`
- Commit message style: conventional commits (example: `fix: consolidate duplicate hash checks in App.tsx`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Replace the two `useEffect` hooks with a single effect using a ref

Replace the two separate `useEffect` blocks (lines 25-30 and 32-42) with a single `useEffect` that:
1. Reads `window.location.hash` once into a local variable
2. Checks `isFromEmail` from that variable
3. If `isFromEmail`, calls `window.history.replaceState` to clear the hash
4. Then checks `isStandalone` and `dismissed` conditions
5. Sets `showInstallBanner` if all conditions are met

The replacement code should be:

```tsx
const isFromEmailRef = useRef(false);

useEffect(() => {
  const hash = window.location.hash;
  const isFromEmail = hash.includes("access_token");
  isFromEmailRef.current = isFromEmail;

  if (isFromEmail) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, []);

useEffect(() => {
  if (isFromEmailRef.current) {
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    const dismissed = localStorage.getItem("pwa-install-banner-dismissed");

    if (!isStandalone && !dismissed) {
      setShowInstallBanner(true);
    }
  }
}, []);
```

You must also add `useRef` to the import from "react" on line 1:

```tsx
import { lazy, Suspense, useEffect, useRef, useState } from "react";
```

**Verify**: `npx tsc -b` → exit 0, no errors

### Step 2: Verify tests still pass

**Verify**: `npm test` → all 107 tests pass

### Step 3: Verify lint passes

**Verify**: `npm exec -- ultracite check` → exit 0, no issues

## Test plan

No new tests are needed. This is a refactoring that consolidates logic — the observable behavior (install banner shows on email callback, hash is cleared) is identical. The existing `use-auth.test.tsx` tests the auth flow but does not test the install banner trigger. Adding a test for this specific flow would be a separate plan.

If you want to add a test anyway:
- Add to `src/components/topbar.test.tsx` or a new `src/App.test.tsx`
- Mock `window.location.hash` to include `access_token`
- Render `<App />` with a mocked `AuthProvider` that emits `SIGNED_IN`
- Assert that `showInstallBanner` is `true` and the banner DOM element appears

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npx tsc -b` exits 0
- [ ] `npm test` exits 0; all 107 tests pass
- [ ] `npm exec -- ultracite check` exits 0
- [ ] `grep -rn "window.location.hash" src/App.tsx` returns exactly 2 matches (one in each effect)
- [ ] No files outside `src/App.tsx` are modified (`git status`)
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:
- The `use-auth.tsx` `SIGNED_IN` event flow depends on the hash being present after the first effect (it doesn't — the session is read via `getSession`, not the hash). If you find evidence it does, STOP.
- The `service-worker-registration.tsx` component reads `window.location.hash` (it doesn't — only `App.tsx` does). If you find it does, STOP.

## Maintenance notes

- The `isFromEmailRef` pattern ensures the second effect reads the value determined during mount, not the live hash (which is now cleared). This is the correct fix for the race.
- Future changes to the PWA install banner logic should keep this two-effect pattern with a ref — do not merge them back into one effect, as the hash-clearing and banner-showing are semantically distinct concerns.
