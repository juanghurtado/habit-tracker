# Plan 018: Add try/catch around localStorage saves in commit()

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c0c1fd9..HEAD -- src/lib/store.ts src/lib/store.test.ts`
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

`store.ts:46-60` — `commit()` calls `saveHabits()` and `saveCompletions()` which both call `localStorage.setItem()`. If localStorage is full (`QuotaExceededError`, roughly 5-10 MB), `setItem` throws synchronously. The exception propagates uncaught from `commit()`, so `updateCaches()` (line 56) has already run and React has re-rendered with the new data — but the data was never written to disk. On page reload, everything since the last successful save is gone. There is no fallback, no warning to the user.

## Current state

### File: `src/lib/store.ts`

The `commit()` function (lines 46-60):

```tsx
export function commit(transforms: {
  habits?: Habit[];
  completions?: Completion[];
}): void {
  if (transforms.habits !== undefined) {
    state.habits = transforms.habits;
  }
  if (transforms.completions !== undefined) {
    state.completions = transforms.completions;
  }
  updateCaches();
  saveHabits(state.habits);
  saveCompletions(state.completions);
  notify();
}
```

`saveHabits` and `saveCompletions` in `storage.ts` (lines 54-56, 85-87):

```tsx
export function saveHabits(habits: Habit[]): void {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

export function saveCompletions(completions: Completion[]): void {
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
}
```

### Convention to match

- The repo uses `Error` objects (not strings) for errors (AGENTS.md).
- The existing `loadHabits` and `loadCompletions` functions in `storage.ts:49-51` already use `try/catch { return []; }` for parse errors — follow the same defensive pattern.
- Tests in `store.test.ts` import `commit` directly and test via `getState()` + `loadHabits()` — they do NOT mock `storage.ts`. For this plan you will add a test that DOES mock `saveHabits` to throw.

## Commands you will need

| Purpose   | Command                      | Expected on success |
|-----------|------------------------------|---------------------|
| Typecheck | `npm run build`              | exit 0, no errors   |
| Tests     | `npm test`                   | all 118+ tests pass |
| Lint      | `npm run lint`               | exit 0, no issues   |

## Scope

**In scope** (the only files you should modify):
- `src/lib/store.ts` — add try/catch around save calls
- `src/lib/store.test.ts` — add a test for graceful localStorage error handling

**Out of scope** (do NOT touch):
- `src/lib/storage.ts` — the save functions themselves are fine; the caller should handle errors
- `src/lib/sync.ts` or any other file
- Do NOT add a toast or user-facing notification — this is a defensive first step; surfaces can be added later

## Git workflow

- Branch: `advisor/018-localstorage-error-handling`
- Commit message style: conventional commits (example: `fix: prevent silent data loss when localStorage writes fail in commit`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Wrap save calls in `commit()` with try/catch

Modify the `commit` function in `src/lib/store.ts`. Wrap both `saveHabits` and `saveCompletions` calls in a single try/catch that logs the error and still calls `notify()`:

```tsx
export function commit(transforms: {
  habits?: Habit[];
  completions?: Completion[];
}): void {
  if (transforms.habits !== undefined) {
    state.habits = transforms.habits;
  }
  if (transforms.completions !== undefined) {
    state.completions = transforms.completions;
  }
  updateCaches();
  try {
    saveHabits(state.habits);
    saveCompletions(state.completions);
  } catch (e) {
    console.error(
      "Failed to persist data to localStorage. Data in memory is intact but will be lost on reload.",
      e instanceof Error ? e.message : e
    );
  }
  notify();
}
```

Key points:
- `updateCaches()` runs before the try/catch — the in-memory state is always updated consistently.
- `notify()` runs after the try/catch — React always re-renders with the current state, even if save failed.
- The error message tells a developer what happened (console) but does not show a UI message (yet); consider this the minimum viable fix.

**Verify**: `npm run build` → exit 0, no errors

### Step 2: Add a test for localStorage write failure

Add a new test to `src/lib/store.test.ts`. Add it to the existing `describe("store")` block (after line 115, before the closing `});`).

You must mock `saveHabits` to throw. Import the storage module at the top of the test file:

```tsx
import { loadHabits } from "../lib/storage.ts";
```
(This import already exists on line 2.)

Add a `vi.mock` call near the top of the file (after the existing imports, before `function createHabit`):

```tsx
vi.mock("../lib/storage.ts", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/storage.ts")>();
  return {
    ...original,
    saveHabits: vi.fn().mockImplementation(() => {
      throw new Error("QuotaExceededError");
    }),
  };
});
```

Then add the test inside the `describe("store")` block:

```tsx
it("does not crash when localStorage write fails", () => {
  const habit = createHabit();
  // saveHabits is mocked to throw above
  expect(() => commit({ habits: [habit] })).not.toThrow();
  // In-memory state should still be updated
  expect(getState().habits).toHaveLength(1);
});
```

**Important**: The `vi.mock` call must be hoisted to the top of the file by Vitest. Verify that the existing imports are compatible — the existing `loadHabits` import on line 2 will get the mocked version (which won't throw because only `saveHabits` is mocked). The test verifies `commit` does not throw and in-memory state is intact.

**Verify**: `npm test -- src/lib/store.test.ts` → all 8+ tests pass

### Step 3: Run full test suite

**Verify**: `npm test` → all tests pass (no regressions)

### Step 4: Run linter

**Verify**: `npm run lint` → exit 0, no issues

## Test plan

- New test in `src/lib/store.test.ts`: "does not crash when localStorage write fails"
- Uses `vi.mock` to make `saveHabits` throw — model after the pattern in `sync.test.ts:12-16` where `vi.mock` wraps an existing module.
- Verification: `npm test -- src/lib/store.test.ts` → all tests pass including new one
- Edge case: the test does not verify `notify()` was called (hard to observe from outside); the `not.toThrow()` assertion is the primary check.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run build` exits 0
- [ ] `npm test` exits 0; new localStorage-error test passes
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "try" src/lib/store.ts` returns at least 1 match (the try block)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The `vi.mock` hoisting doesn't work because `loadHabits` is used as the actual function inside the test (it's imported at line 2 and used in the "commit persists to localStorage" test). If mocking `saveHabits` breaks the persistence test, use a more selective mock: instead of mocking the whole module, mock only `saveHabits` by extracting it into a separate file, or use `vi.spyOn` on the storage module after import. Report back with what you find.
- If the error message in the `catch` block triggers a linting rule about `console.error`, add `// biome-ignore lint/suspicious/noConsole: expected error logging during localStorage failures` above the console.error line.

## Maintenance notes

- This fix prevents crashes but does not alert the user — data silently fails to persist. A future enhancement should surface a toast: "Storage full — some data may not be saved" when the catch fires.
- If the app later migrates to IndexedDB, the error handling pattern stays the same (wrap write calls, keep in-memory state, log on failure).
- The `console.error` is intentional — it lets developers see write failures during development without a UI surface. Remove or gate it if a user-facing notification is added later.