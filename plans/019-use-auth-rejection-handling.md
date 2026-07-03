# Plan 019: Fix unhandled promise rejection in use-auth session checks

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c0c1fd9..HEAD -- src/hooks/use-auth.tsx src/hooks/use-auth.test.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c0c1fd9`, 2026-07-03
- **Issue**: —

## Why this matters

`use-auth.tsx:44` and `:75` call `supabase.auth.getSession().then(...)` without a `.catch()` handler. If `getSession()` rejects (network failure, Supabase outage, OAuth token refresh failure), the promise rejection is unhandled. In modern Node/Vite environments, unhandled rejections eventually crash the process or surface as error events. In the browser, the `loading` state stays `true` indefinitely, freezing the entire app on the spinner — the user never sees any content. There is no recovery path without a manual reload.

## Current state

### File: `src/hooks/use-auth.tsx`

Two `.then()` chains without `.catch()`:

**Effect 1 — initial mount (lines 38-70):**
```tsx
useEffect(() => {
  if (initialized.current) {
    return;
  }
  initialized.current = true;

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email ?? "",
      });
    }
    setLoading(false);
  });
  // ... onAuthStateChange subscription follows
}, [supabase]);
```

**Effect 2 — visibility change (lines 72-90):**
```tsx
useEffect(() => {
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? "",
          });
        }
      });
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}, [supabase]);
```

Note: The visibility change handler does NOT call `setLoading(false)` on success either — it only sets `setUser`. This is fine because `loading` is already `false` after the initial mount, but it means a rejection there also silently fails.

### Convention to match

- The repo uses `async/await` for async code (see `sync-scheduler.ts:30` for `doSync`).
- The repo uses `try/catch` for error handling (see `crud.ts:63-71` in `topbar.tsx` for the `handleSend` pattern).
- Tests mock `getSession` via `vi.fn(async () => ({ data: { session: null } }))` — see `use-auth.test.tsx:13`.

## Commands you will need

| Purpose   | Command                      | Expected on success |
|-----------|------------------------------|---------------------|
| Typecheck | `npm run build`              | exit 0, no errors   |
| Tests     | `npm test`                   | all 118+ tests pass |
| Lint      | `npm run lint`               | exit 0, no issues   |

## Scope

**In scope** (the only files you should modify):
- `src/hooks/use-auth.tsx` — add `.catch()` to both `getSession()` calls
- `src/hooks/use-auth.test.tsx` — add a test for the rejection case

**Out of scope** (do NOT touch):
- `src/lib/supabase.ts` — the supabase client is fine
- `src/App.tsx` — the `loading` state is consumed here but the fix is in the provider
- Any other files

## Git workflow

- Branch: `advisor/019-use-auth-rejection-handling`
- Commit message style: conventional commits (example: `fix: handle getSession promise rejection in useAuth to prevent UI freeze`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Convert the two `.then()` chains to `async/await` with try/catch

**Replace Effect 1 (lines 38-70)** — the initial mount effect:

```tsx
useEffect(() => {
  if (initialized.current) {
    return;
  }
  initialized.current = true;

  (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
        });
      }
    } catch {
      // getSession failed — user stays logged out, loading ends
    } finally {
      setLoading(false);
    }
  })();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email ?? "",
      });
    } else {
      setUser(null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}, [supabase]);
```

**Replace Effect 2 (lines 72-90)** — the visibility change effect:

```tsx
useEffect(() => {
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? "",
          });
        }
      }).catch(() => {
        // getSession failed on visibility change — silent fallback
      });
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}, [supabase]);
```

Note: The visibility change effect keeps the `.then().catch()` pattern because it doesn't need `setLoading(false)` (loading is already false). Converting it to IIFE async would be unnecessary churn — the `.catch(() => {})` is sufficient.

**Verify**: `npm run build` → exit 0, no errors

### Step 2: Add a test for getSession rejection

Add a new test to `src/hooks/use-auth.test.tsx`. Add a new mock Supabase that has `getSession` returning a rejected promise, then test that `loading` resolves to `false`:

```tsx
it("finishes loading even when getSession rejects", async () => {
  const failingMock = createMockSupabase();
  failingMock.auth.getSession = vi.fn(async () => {
    throw new Error("Network error");
  });

  function failingWrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider supabase={failingMock as never}>{children}</AuthProvider>
    );
  }

  const { result } = renderHook(() => useAuth(), { wrapper: failingWrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.user).toBeNull();
  expect(result.current.isAuthenticated).toBe(false);
});
```

**Verify**: `npm test -- src/hooks/use-auth.test.tsx` → all 7 tests pass

### Step 3: Run full test suite

**Verify**: `npm test` → all tests pass (no regressions)

### Step 4: Run linter

**Verify**: `npm run lint` → exit 0, no issues

## Test plan

- New test in `src/hooks/use-auth.test.tsx`: "finishes loading even when getSession rejects"
- Model after the existing "finishes loading after session check" test at line 55 — same `renderHook` + `waitFor` pattern.
- The mock overrides `getSession` to return a rejected promise, then verifies that `loading` becomes `false` and `user` stays `null`.
- Verification: `npm test -- src/hooks/use-auth.test.tsx` → all tests pass including new one

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run build` exits 0
- [ ] `npm test` exits 0; new rejection-handling test passes
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "catch" src/hooks/use-auth.tsx` returns at least 2 matches (one per getSession call)
- [ ] `grep -rn "\\.then" src/hooks/use-auth.tsx` returns exactly 1 match (the visibility change handler — the initial mount is now async/await)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The IIFE async pattern `(async () => { ... })()` inside `useEffect` triggers a linting warning. If so, convert back to `.then().catch()` with `.finally(() => setLoading(false))` instead.
- The existing test "finishes loading after session check" (line 55) fails because the IIFE changes timing. The `waitFor` should handle this, but if the test shows intermittent failures, add `await act(async () => {})` after the renderHook call.

## Maintenance notes

- The `.catch(() => {})` on the visibility-change handler is intentionally a no-op — the user sees no error because the app works offline. A future enhancement might surface this as a toast.
- The `finally` block in the initial mount ensures `setLoading(false)` is always called, even on rejection. This is the critical fix: the app never gets stuck on the spinner.
- If a future change adds a third `getSession()` call, it must also handle rejection.