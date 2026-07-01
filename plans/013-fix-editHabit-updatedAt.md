# Plan 013: Fix editHabit to set updatedAt for correct sync conflict resolution

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3351d5c..HEAD -- src/hooks/use-habits.ts src/hooks/use-habits.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `3351d5c`, 2026-07-01

## Why this matters

When a user edits a habit, `editHabit` in `use-habits.ts` saves the new data but doesn't update `updatedAt`. The sync engine uses `updatedAt` for last-writer-wins conflict resolution (see `src/lib/sync.ts:14`). If the user edits a habit locally but sync hasn't run yet, and another device (or a stale sync) pushes a copy with the old `updatedAt`, the stale remote version will win and overwrite the user's edit. The `deleteHabit` function at line 191 correctly sets `updatedAt` — `editHabit` should do the same.

## Current state

- `src/hooks/use-habits.ts:167-184` — the `editHabit` callback
- `src/hooks/use-habits.ts:186-201` — `deleteHabit` (correct reference implementation)

Excerpt from `src/hooks/use-habits.ts:167-184`:

```typescript
const editHabit = useCallback(
  (
    id: string,
    name: string,
    icon: string,
    type: "good" | "bad",
    color: string,
    buttonLabel: string
  ) => {
    const updated = loadHabits().map((h) =>
      h.id === id ? { ...h, name, icon, type, color, buttonLabel } : h
      //    ^^^ BUG: no updatedAt, no syncedAt: null
    );
    saveHabits(updated);
    notifyListeners();
    scheduleSync();
  },
  [scheduleSync]
);
```

Compare with `deleteHabit` (correct):

```typescript
const updated = loadHabits().map((h) =>
  h.id === id
    ? { ...h, deletedAt: now, updatedAt: now, syncedAt: null }  // ← correct
    : h
);
```

## Commands you will need

| Purpose   | Command                            | Expected on success |
|-----------|------------------------------------|---------------------|
| Tests     | `npx vitest run src/hooks/use-habits.test.ts` | all pass |
| Typecheck | `npx tsc -b --noEmit`               | exit 0, no errors   |
| Lint      | `npm exec -- ultracite check`       | exit 0              |

## Scope

**In scope**:
- `src/hooks/use-habits.ts` — fix `editHabit` to set `updatedAt` and `syncedAt: null`
- `src/hooks/use-habits.test.ts` — add test for the fix

**Out of scope**:
- Any other hooks or components
- The sync engine itself

## Git workflow

- Branch: `advisor/013-fix-editHabit-updatedAt`
- Commit: `fix: set updatedAt and syncedAt in editHabit for correct sync resolution`

## Steps

### Step 1: Fix editHabit to set updatedAt and syncedAt

In `src/hooks/use-habits.ts`, modify the `editHabit` callback (lines 167-184). Change the map function to:

```typescript
const editHabit = useCallback(
  (
    id: string,
    name: string,
    icon: string,
    type: "good" | "bad",
    color: string,
    buttonLabel: string
  ) => {
    const now = new Date().toISOString();
    const updated = loadHabits().map((h) =>
      h.id === id
        ? { ...h, name, icon, type, color, buttonLabel, updatedAt: now, syncedAt: null }
        : h
    );
    saveHabits(updated);
    notifyListeners();
    scheduleSync();
  },
  [scheduleSync]
);
```

Two changes:
1. Add `const now = new Date().toISOString();` before the map
2. Add `updatedAt: now, syncedAt: null` to the spread

**Verify**: `npx tsc -b --noEmit` → exit 0

### Step 2: Add test for editHabit setting updatedAt

In `src/hooks/use-habits.test.ts`, add a test that verifies `editHabit` updates `updatedAt` and sets `syncedAt` to `null`. Look at the existing test patterns in this file for how to render the hook and call its methods.

```typescript
it("editHabit sets updatedAt and syncedAt to null for sync", async () => {
  // Arrange: create a habit first
  // Act: edit it
  // Assert: the habit has a fresh updatedAt and syncedAt === null
});
```

Follow the exact test setup pattern used by existing tests in the file (renderHook with providers, etc.).

**Verify**: `npx vitest run src/hooks/use-habits.test.ts` → all pass including new test

### Step 3: Run full verification

**Verify**: `npm exec -- ultracite check` → exit 0
**Verify**: `npx vitest run` → all tests pass

## Test plan

- Add 1 test to `src/hooks/use-habits.test.ts`: create a habit, edit it, verify `updatedAt` changed and `syncedAt` is `null`

## Done criteria

- [ ] `npx tsc -b --noEmit` exits 0
- [ ] `npx vitest run` exits 0; new editHabit test passes
- [ ] `npm exec -- ultracite check` exits 0
- [ ] No files outside `src/hooks/use-habits.ts` and `src/hooks/use-habits.test.ts` are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at `src/hooks/use-habits.ts` lines 167-184 doesn't match the excerpt
- The existing test file structure is too different from the pattern described
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- This fix makes `editHabit` consistent with `deleteHabit`. Any future mutation functions (e.g., bulk edit, import) should follow the same pattern: set `updatedAt` and `syncedAt: null`.
- The `syncedAt: null` is what marks the record for push on next sync — without it, the edit would stay local forever.
