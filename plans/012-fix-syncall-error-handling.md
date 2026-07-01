# Plan 012: Fix syncAll to check upsert errors and mark unsynced records

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
- **Effort**: S
- **Risk**: MED
- **Depends on**: plans/011-sync-engine-tests.md
- **Category**: bug
- **Planned at**: commit `3351d5c`, 2026-07-01

## Why this matters

When a Supabase upsert fails during sync, the current code still marks the record as synced (`syncedAt` gets a timestamp). This means the failed record will never be retried — it's permanently lost. For a single-user habit tracker where the whole point of cloud backup is data durability, silent data loss on network errors is a critical correctness bug.

## Current state

- `src/lib/sync.ts:51-135` — the `syncAll` function
- Lines 61-75: loop upserts habits one-by-one, never checking `error` on the response
- Lines 77-87: same for completions
- Lines 89-94: unconditionally sets `syncedAt` on ALL records that had `syncedAt === null`, regardless of whether the upsert succeeded

Relevant excerpt from `src/lib/sync.ts`:

```typescript
// Lines 60-94 — the bug
const habitsToPush = habits.filter((h) => h.syncedAt === null);
for (const habit of habitsToPush) {
  await supabase.from("habits").upsert({  // ← error not checked
    id: habit.id,
    // ...
  });
}

const completionsToPush = completions.filter((c) => c.syncedAt === null);
for (const completion of completionsToPush) {
  await supabase.from("completions").upsert({  // ← error not checked
    id: completion.id,
    // ...
  });
}

// BUG: sets syncedAt on ALL unsynced records, even failed ones
const syncedHabits = habits.map((h) =>
  h.syncedAt === null ? { ...h, syncedAt: now } : h
);
```

The repo uses Supabase JS v2 — `from().upsert()` returns `{ data, error }` where `error` is `null` on success or a `PostgrestError` object on failure.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Tests     | `npx vitest run src/lib/sync.test.ts` | all pass |
| Typecheck | `npx tsc -b --noEmit`          | exit 0, no errors   |
| Lint      | `npm exec -- ultracite check`  | exit 0              |

## Scope

**In scope**:
- `src/lib/sync.ts` — fix error handling in `syncAll`
- `src/lib/sync.test.ts` — update characterization tests from plan 011 to assert correct behavior

**Out of scope**:
- Batching upserts (that's plan 016's territory if pursued)
- Changes to `mergeHabits` or `mergeCompletions`
- Any UI files

## Git workflow

- Branch: `advisor/012-fix-syncall-error-handling`
- Commit: `fix: check upsert errors in syncAll to prevent silent data loss`

## Steps

### Step 1: Capture the IDs of failed upserts

Replace the push loops (lines 60-87) with versions that collect failed IDs:

```typescript
const habitsToPush = habits.filter((h) => h.syncedAt === null);
const failedHabitIds = new Set<string>();
for (const habit of habitsToPush) {
  const { error } = await supabase.from("habits").upsert({
    id: habit.id,
    user_id: userId,
    name: habit.name,
    icon: habit.icon,
    type: habit.type,
    color: habit.color,
    button_label: habit.buttonLabel,
    created_at: habit.createdAt,
    synced_at: now,
    updated_at: habit.updatedAt,
    deleted_at: habit.deletedAt,
  });
  if (error) {
    failedHabitIds.add(habit.id);
  }
}

const completionsToPush = completions.filter((c) => c.syncedAt === null);
const failedCompletionIds = new Set<string>();
for (const completion of completionsToPush) {
  const { error } = await supabase.from("completions").upsert({
    id: completion.id,
    user_id: userId,
    habit_id: completion.habitId,
    timestamp: completion.timestamp,
    synced_at: now,
    deleted_at: completion.deletedAt,
  });
  if (error) {
    failedCompletionIds.add(completion.id);
  }
}
```

**Verify**: `npx tsc -b --noEmit` → exit 0

### Step 2: Only mark successfully synced records

Replace lines 89-94 (the unconditional `syncedAt` mapping) with:

```typescript
const syncedHabits = habits.map((h) =>
  h.syncedAt === null && !failedHabitIds.has(h.id)
    ? { ...h, syncedAt: now }
    : h
);
const syncedCompletions = completions.map((c) =>
  c.syncedAt === null && !failedCompletionIds.has(c.id)
    ? { ...c, syncedAt: now }
    : c
);
```

**Verify**: `npx tsc -b --noEmit` → exit 0

### Step 3: Update characterization tests from plan 011

In `src/lib/sync.test.ts`, update the three tests added by plan 011 to assert correct behavior:

1. Change the test name from `marks habit as synced even when upsert fails (documents bug)` to `leaves syncedAt null when habit upsert fails`
2. Change the assertion from `expect(result.habits[0].syncedAt).not.toBeNull()` to `expect(result.habits[0].syncedAt).toBeNull()`
3. Apply the same pattern for the completion and mixed tests

**Verify**: `npx vitest run src/lib/sync.test.ts` → all pass

### Step 4: Add a test for successful sync still setting syncedAt

Ensure the happy path still works after the change:

```typescript
it("sets syncedAt only on successfully synced habits", async () => {
  const habits = [
    habit({ id: "h1", syncedAt: null }),
    habit({ id: "h2", syncedAt: null }),
  ];
  let callCount = 0;
  const mockUpsert = vi.fn().mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      return { error: { message: "fail" } };
    }
    return { error: null };
  });
  const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert, select: mockSelect });
  const supabase = { from: mockFrom } as unknown as SupabaseClient;

  const result = await syncAll({ habits, completions: [], supabase, userId: "uid" });

  expect(result.habits[0].syncedAt).toBeNull();  // failed
  expect(result.habits[1].syncedAt).not.toBeNull(); // succeeded
});
```

**Verify**: `npx vitest run src/lib/sync.test.ts` → all pass

### Step 5: Run full verification

**Verify**: `npm exec -- ultracite check` → exit 0
**Verify**: `npx vitest run` → all tests pass
**Verify**: `npx tsc -b --noEmit` → exit 0

## Test plan

- Update 3 characterization tests from plan 011 to assert correct behavior (syncedAt stays null on failure)
- Add 1 new test: partial failure where some habits succeed and some fail
- Verify existing syncAll happy-path tests still pass

## Done criteria

- [ ] `npx tsc -b --noEmit` exits 0
- [ ] `npx vitest run` exits 0; all syncAll tests pass
- [ ] `npm exec -- ultracite check` exits 0
- [ ] No files outside `src/lib/sync.ts` and `src/lib/sync.test.ts` are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at `src/lib/sync.ts` lines 60-94 doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The fix requires touching files outside scope

## Maintenance notes

- If the app later adds pagination or batch upserts, the error-tracking set pattern here needs to adapt — each batch would need its own error check.
- The `failedHabitIds` / `failedCompletionIds` sets are intentionally simple. If retry logic is added later, these sets become the retry queue input.
