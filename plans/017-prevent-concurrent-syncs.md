# Plan 017: Prevent concurrent syncs in sync-scheduler

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c0c1fd9..HEAD -- src/lib/sync-scheduler.ts src/lib/sync-scheduler.test.ts`
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

`sync-scheduler.ts:30-52` has no guard against concurrent syncs. Three entry points call `doSync()`: `schedule()` (debounced 2s), `flush()` (visibility change), and `syncNow()` (App mount). If a visibility change fires while a debounced sync is running, two `syncAll()` calls execute in parallel. Both call `commit()` with their results — the second commit overwrites the first, potentially losing merged data from the earlier sync. While Supabase upserts are idempotent, the local merge result from the first sync is discarded.

## Current state

### File: `src/lib/sync-scheduler.ts`

The problematic function (lines 30-52):

```tsx
async function doSync(): Promise<void> {
  if (!currentUserId) {
    return;
  }

  syncStatus = "syncing";
  notifyStatusListeners();

  const { habits, completions } = getState();

  try {
    const result = await syncAll({
      habits,
      completions,
      supabase,
      userId: currentUserId,
    });
    commit(result);
  } finally {
    syncStatus = "idle";
    notifyStatusListeners();
  }
}
```

There is no mutex. `doSync` can be called again while an earlier invocation is awaiting `syncAll`.

### Convention to match

- Module-level mutable state with listeners — see `store.ts:27-28` for the same `Set<() => void>` pattern.
- Tests use `vi.useFakeTimers()`, `vi.advanceTimersByTimeAsync()`, and mock `syncAll` via `vi.mock("../lib/sync.ts")` (see `sync-scheduler.test.ts:28-37` for the setup pattern).
- The repo throws `Error` objects with descriptive messages (AGENTS.md).

## Commands you will need

| Purpose   | Command                      | Expected on success |
|-----------|------------------------------|---------------------|
| Typecheck | `npm run build`              | exit 0, no errors   |
| Tests     | `npm test`                   | all 118+ tests pass |
| Lint      | `npm run lint`               | exit 0, no issues   |

## Scope

**In scope** (the only files you should modify):
- `src/lib/sync-scheduler.ts`
- `src/lib/sync-scheduler.test.ts`

**Out of scope** (do NOT touch):
- `src/lib/sync.ts` — the sync logic itself is correct
- `src/lib/store.ts` — not related to the sync guard
- Any other files

## Git workflow

- Branch: `advisor/017-prevent-concurrent-syncs`
- Commit message style: conventional commits (example: `fix: prevent concurrent syncs by adding a mutex guard in doSync`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a `syncing` flag to guard concurrent syncs

Add a module-level boolean `syncing` flag after line 5 (after `currentUserId`):

```tsx
let syncing = false;
```

Then guard `doSync` at the top (before the `currentUserId` check, or right after it):

```tsx
async function doSync(): Promise<void> {
  if (!currentUserId) {
    return;
  }
  if (syncing) {
    return;
  }

  syncing = true;
  syncStatus = "syncing";
  notifyStatusListeners();

  const { habits, completions } = getState();

  try {
    const result = await syncAll({
      habits,
      completions,
      supabase,
      userId: currentUserId,
    });
    commit(result);
  } finally {
    syncing = false;
    syncStatus = "idle";
    notifyStatusListeners();
  }
}
```

Key details:
- The `if (syncing) return;` guard runs before the `try` block, so it does not need resetting in `finally`.
- The `syncing = true` assignment is synchronous, right before the async work starts — no other call can slip past it in a single-threaded JS context.
- Add `syncing = false` in the `finally` block alongside the existing `syncStatus = "idle"`.

Also reset `syncing` in the existing `reset()` function (line 100):

Add `syncing = false;` after line 105 (`syncStatus = "idle";`).

**Verify**: `npm run build` → exit 0, no errors

### Step 2: Add a test for concurrent sync prevention

Add a new test to `src/lib/sync-scheduler.test.ts` inside the existing `describe("sync-scheduler")` block. Add it after the "syncNow syncs immediately" test (after line 117):

```tsx
it("does not start a second sync while one is in progress", async () => {
  let resolveFirstSync: () => void;
  const firstSyncPromise = new Promise<void>((resolve) => {
    resolveFirstSync = resolve;
  });
  mockSyncAll.mockReturnValue(firstSyncPromise.then(() => ({ habits: [], completions: [] })));

  schedule();
  // Wait for debounce so doSync starts
  await vi.advanceTimersByTimeAsync(2000);

  // At this point doSync is awaiting syncAll — syncing flag is true
  // Call syncNow, which should bail because syncing is true
  syncNow();

  // Resolve the first sync
  resolveFirstSync!();
  await vi.waitFor(() => {
    expect(mockSyncAll).toHaveBeenCalledTimes(1);
  });
});
```

**Verify**: `npm test -- src/lib/sync-scheduler.test.ts` → all tests pass (including the new test)

### Step 3: Run full test suite

**Verify**: `npm test` → all tests pass (no regressions)

### Step 4: Run linter

**Verify**: `npm run lint` → exit 0, no issues

## Test plan

- New test in `src/lib/sync-scheduler.test.ts`: "does not start a second sync while one is in progress"
- Model after the existing "syncNow syncs immediately regardless of pending state" test at line 111 — same mock pattern, same `vi.advanceTimersByTimeAsync` setup.
- This test verifies the mutex: `schedule()` kicks off `doSync`, `syncNow()` is called while the first sync is awaiting, then `mockSyncAll` is asserted to have been called only once.
- Verification: `npm test -- src/lib/sync-scheduler.test.ts` → all tests pass including the new one

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run build` exits 0
- [ ] `npm test` exits 0; new concurrent-sync test passes
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "syncing" src/lib/sync-scheduler.ts` returns at least 3 matches (declaration, guard check, finally reset)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The `mockSyncAll` is not hoisted with `vi.hoisted` — check the existing imports at `sync-scheduler.test.ts:12`. If it's already hoisted (as it appears to be), proceed. If the test mock doesn't work with the `Promise` pattern, fall back to a simpler approach: set `mockSyncAll.mockImplementation(() => new Promise(() => {}))` to make it never resolve, call `schedule()`, advance timers, call `syncNow()`, assert `mockSyncAll` was called once, then call `reset()`.

## Maintenance notes

- The `syncing` flag is a simple boolean mutex, sufficient because JS is single-threaded and all sync entry points (`schedule`, `flush`, `syncNow`) run on the main thread.
- If the sync engine is ever extended to support queued retries or background sync, this mutex may need to become a counter (to allow one running + one queued).
- The `reset()` function must clear `syncing` — confirmed in step 1.