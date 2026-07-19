# Plan 026: Fix syncAll() marking records as synced before fetching remote data

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9d536b0..HEAD -- src/lib/sync.ts`
> If the sync.ts source has changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW — reordering operations within an existing function
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `9d536b0`, 2026-07-09
- **Issue**: —

## Why this matters

`syncAll()` in `src/lib/sync.ts` marks local records as `syncedAt: now` **before** fetching remote data. If the remote fetch fails (network error, malformed DB record triggering `validateHabitRecord`), the function throws and the caller never receives the result. But the local records were already marked as synced — meaning locally-upserted habits/completions are treated as successfully synced even though the server state is unknown. If a habit was deleted on the server but this sync didn't complete, the client permanently retains a stale record it believes is synced.

## Current state

`src/lib/sync.ts`, lines 131-231 (the `syncAll` function):

```ts
export async function syncAll(options: {
  habits: Habit[];
  completions: Completion[];
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ habits: Habit[]; completions: Completion[] }> {
  const { habits, completions, supabase, userId } = options;
  const now = new Date().toISOString();

  // Step 1: Upsert local habits (lines 140-159)
  const habitsToPush = habits.filter((h) => h.syncedAt === null);
  const failedHabitIds = new Set<string>();
  for (const habit of habitsToPush) {
    const { error } = await supabase.from("habits").upsert({
      id: habit.id,
      user_id: userId,
      // ... fields
    });
    if (error) {
      failedHabitIds.add(habit.id);
    }
  }

  // Step 2: Upsert local completions (lines 161-175)
  const completionsToPush = completions.filter((c) => c.syncedAt === null);
  const failedCompletionIds = new Set<string>();
  for (const completion of completionsToPush) {
    const { error } = await supabase.from("completions").upsert({
      id: completion.id,
      user_id: userId,
      // ... fields
    });
    if (error) {
      failedCompletionIds.add(completion.id);
    }
  }

  // Step 3: Mark local records as synced (lines 177-186) — BUG: before remote fetch
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

  // Step 4: Fetch remote data (lines 188-225) — if this throws, step 3's work is lost
  const { data: remoteHabits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId);

  const { data: remoteCompletions } = await supabase
    .from("completions")
    .select("*")
    .eq("user_id", userId);

  const mappedRemoteHabits: Habit[] = (remoteHabits ?? []).map((r) => {
    validateHabitRecord(r);  // Can throw — if it does, step 3's marking is already done
    return { /* ... */ };
  });

  const mappedRemoteCompletions: Completion[] = (remoteCompletions ?? []).map(
    (r) => {
      validateCompletionRecord(r);
      return { /* ... */ };
    }
  );

  // Step 5: Merge and return (lines 227-230)
  return {
    habits: mergeHabits(syncedHabits, mappedRemoteHabits),
    completions: mergeCompletions(syncedCompletions, mappedRemoteCompletions),
  };
}
```

The bug: Step 3 marks records as synced, then Step 4 can throw. The throw propagates to the caller, the local state was already mutated (records marked `syncedAt: now`), and the caller never gets the merged result.

## Commands you will need

| Purpose   | Command                              | Expected on success |
|-----------|--------------------------------------|---------------------|
| Typecheck | `tsc --noEmit`                       | exit 0, no errors   |
| Tests     | `npm run test`                       | all tests pass      |
| Lint      | `npm run lint`                       | exit 0              |
| Build     | `npm run build`                      | exit 0              |

## Scope

**In scope** (the only file to modify):
- `src/lib/sync.ts` — reorder operations within `syncAll`

**Out of scope** (do NOT touch):
- Any other file
- The sync-scheduler, store, or CRUD modules

## Git workflow

- Branch: `advisor/026-fix-syncAll-marking-order`
- Commit: `fix: reorder syncAll to fetch remote data before marking records as synced`
- Follow conventional commits as in `git log`

## Steps

### Step 1: Move the remote fetch before marking records as synced

In `src/lib/sync.ts`, restructure `syncAll` so that the remote data fetch (Step 4 in current code) happens **before** marking local records as synced (Step 3). The new order:

1. Upsert local habits (unchanged)
2. Upsert local completions (unchanged)
3. **Fetch remote data** (move from old Step 4)
4. **Validate and map remote data** (move from old Step 4)
5. **Mark local records as synced** (move from old Step 3)
6. Merge and return (unchanged)

The key change: the remote fetch and validation happen before any `syncedAt` timestamps are written. If the remote fetch throws, no local records are mislabeled.

The refactored function body should look like:

```ts
export async function syncAll(options: {
  habits: Habit[];
  completions: Completion[];
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ habits: Habit[]; completions: Completion[] }> {
  const { habits, completions, supabase, userId } = options;
  const now = new Date().toISOString();

  // Step 1: Upsert local habits
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

  // Step 2: Upsert local completions
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

  // Step 3: Fetch remote data FIRST (moved from old Step 4)
  const { data: remoteHabits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId);

  const { data: remoteCompletions } = await supabase
    .from("completions")
    .select("*")
    .eq("user_id", userId);

  // Step 4: Validate and map remote data (moved from old Step 4)
  const mappedRemoteHabits: Habit[] = (remoteHabits ?? []).map((r) => {
    validateHabitRecord(r);
    return {
      id: r.id,
      name: r.name,
      icon: r.icon,
      type: r.type,
      color: r.color,
      buttonLabel: r.button_label,
      createdAt: r.created_at,
      syncedAt: r.synced_at,
      updatedAt: r.updated_at,
      deletedAt: r.deleted_at,
    };
  });

  const mappedRemoteCompletions: Completion[] = (remoteCompletions ?? []).map(
    (r) => {
      validateCompletionRecord(r);
      return {
        id: r.id,
        habitId: r.habit_id,
        timestamp: r.timestamp,
        syncedAt: r.synced_at,
        deletedAt: r.deleted_at,
      };
    }
  );

  // Step 5: Mark local records as synced (moved from old Step 3)
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

  // Step 6: Merge and return (unchanged)
  return {
    habits: mergeHabits(syncedHabits, mappedRemoteHabits),
    completions: mergeCompletions(syncedCompletions, mappedRemoteCompletions),
  };
}
```

Verify:
```bash
tsc --noEmit
```
Expect: exit 0, no errors.

### Step 2: Run full verification

```bash
npm run test
npm run lint
```
Expect: all tests pass, no lint errors.

## Test plan

**No new tests needed** — the existing `src/lib/sync.test.ts` already exercises `syncAll` with mocked Supabase. The reordering is transparent to callers. All existing tests must pass.

**Verification**: `npm run test -- sync` → all existing tests pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `tsc --noEmit` exits 0
- [ ] `npm run test` exits 0; all tests pass
- [ ] `npm run lint` exits 0
- [ ] The remote fetch (`supabase.from("habits").select("*")`) appears **before** the `syncedHabits` / `syncedCompletions` marking in the source
- [ ] No files outside `src/lib/sync.ts` are modified

## STOP conditions

Stop and report back (do not improvise) if:

- The `syncAll` function structure at `src/lib/sync.ts:131-231` doesn't match the excerpts (codebase has drifted).
- Any existing sync test fails — the reordering must not change behavior.
- The `validateHabitRecord` / `validateCompletionRecord` functions have been changed to not throw (then this ordering issue is moot, but STOP and report).

## Maintenance notes

- The reordering means the function now takes slightly longer before marking records as synced (remote fetch is now a prerequisite). This is correct — marking should only happen after the full round-trip succeeds.
- If the Supabase fetch is slow, this will delay the marking. Consider adding a try/catch around the entire function at the call site (in `sync-scheduler.ts`) to handle network errors gracefully and retry.
