# Plan 011: Add characterization tests for syncAll error paths

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3351d5c..HEAD -- src/lib/sync.ts src/lib/sync.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `3351d5c`, 2026-07-01

## Why this matters

The sync engine (`syncAll`) is the most critical module in the app — it's the only path that pushes local data to Supabase. The existing tests in `src/lib/sync.test.ts` cover `mergeHabits` and `mergeCompletions` thoroughly, and test `syncAll` happy paths. But there are zero tests for what happens when Supabase upserts fail — the exact scenario that causes silent data loss (plan 012 will fix the bug, but we need characterization tests first to confirm the current broken behavior and prevent regressions).

## Current state

- `src/lib/sync.test.ts` — 311 lines, covers merge functions and syncAll happy paths
- The mock at lines 170-208 always returns `{ error: null }` from upserts
- No test verifies behavior when `supabase.from().upsert()` returns `{ error: { message: "..." } }`
- No test verifies that `syncedAt` is set even when upserts fail (the current bug)

The repo convention for test files: co-located with source (`sync.test.ts` next to `sync.ts`), uses `describe`/`it` blocks, factory functions for test data (`habit()`, `completion()`), vi.fn() mocks for Supabase client. Match this exactly.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Tests     | `npx vitest run src/lib/sync.test.ts` | all pass |
| Lint      | `npm exec -- ultracite check`  | exit 0              |

## Scope

**In scope**:
- `src/lib/sync.test.ts` (add new tests to existing file)

**Out of scope**:
- `src/lib/sync.ts` — do NOT modify the implementation yet (plan 012 fixes it)
- Any other test files

## Git workflow

- Branch: `advisor/011-sync-engine-tests`
- Commit: `test: add characterization tests for syncAll error paths`

## Steps

### Step 1: Add test for syncAll when a habit upsert fails

Add a new `it` block inside the existing `describe("syncAll", ...)` in `src/lib/sync.test.ts`. The test should:

1. Create a mock Supabase where `upsert` returns `{ error: { message: "fail" } }` for habits
2. Pass one unsynced habit and zero completions to `syncAll`
3. Assert that `syncedAt` is still set on the returned habit (this documents the current bug — the fix in plan 012 will change this behavior)

Use the existing `createMockSupabase` helper but override `mockUpsert` to return an error:

```typescript
it("marks habit as synced even when upsert fails (documents bug — plan 012 fixes)", async () => {
  const habits = [habit({ id: "h1", syncedAt: null })];
  const mockUpsert = vi.fn().mockResolvedValue({ error: { message: "fail" } });
  const mockHabitsEq = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockSelectHabits = vi.fn().mockReturnValue({ eq: mockHabitsEq });
  const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert, select: mockSelectHabits });
  const supabase = { from: mockFrom } as unknown as SupabaseClient;

  const result = await syncAll({ habits, completions: [], supabase, userId: "uid" });

  // Current bug: syncedAt is set despite upsert failure
  expect(result.habits[0].syncedAt).not.toBeNull();
});
```

**Verify**: `npx vitest run src/lib/sync.test.ts` → all tests pass including the new one

### Step 2: Add test for syncAll when a completion upsert fails

Same pattern but for completions:

```typescript
it("marks completion as synced even when upsert fails (documents bug — plan 012 fixes)", async () => {
  const completions = [completion({ id: "c1", syncedAt: null })];
  let callCount = 0;
  const mockUpsert = vi.fn().mockImplementation(() => {
    callCount++;
    // First call is habits (empty), second is completions (fail)
    if (callCount === 2) {
      return { error: { message: "fail" } };
    }
    return { error: null };
  });
  const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert, select: mockSelect });
  const supabase = { from: mockFrom } as unknown as SupabaseClient;

  const result = await syncAll({ habits: [], completions, supabase, userId: "uid" });

  // Current bug: syncedAt is set despite upsert failure
  expect(result.completions[0].syncedAt).not.toBeNull();
});
```

**Verify**: `npx vitest run src/lib/sync.test.ts` → all tests pass

### Step 3: Add test for mixed success/failure across multiple habits

```typescript
it("marks all habits as synced even when some upserts fail", async () => {
  const habits = [
    habit({ id: "h1", syncedAt: null }),
    habit({ id: "h2", syncedAt: null }),
  ];
  let callCount = 0;
  const mockUpsert = vi.fn().mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      return { error: { message: "fail" } }; // first habit fails
    }
    return { error: null }; // second habit succeeds
  });
  const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert, select: mockSelect });
  const supabase = { from: mockFrom } as unknown as SupabaseClient;

  const result = await syncAll({ habits, completions: [], supabase, userId: "uid" });

  // Current bug: both marked as synced despite first failing
  expect(result.habits.every((h) => h.syncedAt !== null)).toBe(true);
});
```

**Verify**: `npx vitest run src/lib/sync.test.ts` → all tests pass

### Step 4: Run linter and full test suite

**Verify**: `npm exec -- ultracite check` → exit 0
**Verify**: `npx vitest run` → all tests pass (10 files, 82+ tests)

## Test plan

New tests added to `src/lib/sync.test.ts`:
- `syncAll > marks habit as synced even when upsert fails` — documents bug #1
- `syncAll > marks completion as synced even when upsert fails` — documents bug #1 (completions)
- `syncAll > marks all habits as synced even when some upserts fail` — documents partial failure

These are characterization tests — they assert the current (broken) behavior so that plan 012's fix has a clear before/after.

## Done criteria

- [ ] `npx vitest run src/lib/sync.test.ts` exits 0; 3+ new tests exist and pass
- [ ] `npm exec -- ultracite check` exits 0
- [ ] No files outside `src/lib/sync.test.ts` are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at `src/lib/sync.test.ts` doesn't match the excerpts (codebase has drifted)
- A test fails and the failure isn't explained by the characterization-test intent
- The fix appears to require touching `src/lib/sync.ts` (it shouldn't — this plan is tests-only)

## Maintenance notes

- These tests intentionally assert the *wrong* behavior. When plan 012 fixes syncAll, these tests should either be updated to assert correct behavior or removed if they become redundant.
- The test at step 1 is the key regression test — after plan 012, it should assert that `syncedAt` remains `null` when upsert fails.
