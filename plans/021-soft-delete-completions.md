# Plan 021: Fix deleteHabit to soft-delete completions instead of hard-removing them

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c0c1fd9..HEAD -- src/lib/crud.ts src/lib/sync.ts src/hooks/use-habits.test.tsx src/lib/sync.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c0c1fd9`, 2026-07-03
- **Issue**: —

## Why this matters

`crud.ts:49-58` — `deleteHabit` soft-deletes the habit (sets `deletedAt` + `updatedAt`) but hard-removes ALL its completions via `completions.filter((c) => c.habitId !== id)`. This has three problems:

1. **Irreversible**: Unlike `undoLastCompletion` which soft-deletes a single completion via `deletedAt`, habit deletion permanently destroys every completion record with no recovery path.
2. **Remote orphans**: Already-synced completions remain on Supabase perpetually — the sync engine only pushes records where `syncedAt === null`, so the hard-removed completions are never sent as deletes.
3. **Resurrection risk**: If a habit is re-created with the same UUID (astronomically rare but possible via localStorage tampering), `mergeCompletions` would import the orphaned remote completions.

The fix: soft-delete completions (set `deletedAt` + `syncedAt: null`) instead of filtering them out. The existing `mergeCompletions` in `sync.ts:34-49` already skips remote completions with `deletedAt !== null`, so the merge logic is correct. The `store.ts` cached-visible-completions filter already excludes deleted completions, so the UI is unaffected.

## Current state

### File: `src/lib/crud.ts`

`deleteHabit` (lines 49-58):

```tsx
export function deleteHabit(id: string): void {
  const now = new Date().toISOString();
  const { habits, completions } = getState();
  const updatedHabits = habits.map((h) =>
    h.id === id ? { ...h, deletedAt: now, updatedAt: now, syncedAt: null } : h
  );
  const updatedCompletions = completions.filter((c) => c.habitId !== id);
  commit({ habits: updatedHabits, completions: updatedCompletions });
  schedule();
}
```

The `undoLastCompletion` function (lines 67-84) already uses the correct soft-delete pattern:

```tsx
const updated = completions.map((c) =>
  c.id === targetId ? { ...c, deletedAt: now, syncedAt: null } : c
);
commit({ completions: updated });
schedule();
```

### File: `src/lib/sync.ts`

`mergeCompletions` (lines 34-49) already handles `deletedAt` correctly — it only imports remote completions that have `deletedAt === null`:

```tsx
export function mergeCompletions(local: Completion[], remote: Completion[]): Completion[] {
  const localIds = new Set(local.map((c) => c.id));
  const merged = [...local];
  for (const remoteCompletion of remote) {
    if (!localIds.has(remoteCompletion.id) && remoteCompletion.deletedAt === null) {
      merged.push(remoteCompletion);
    }
  }
  return merged;
}
```

And the `store.ts` cache already filters out soft-deleted completions (line 31-33):

```tsx
cachedVisibleCompletions = state.completions.filter((c) => c.deletedAt === null);
```

So the infrastructure is already in place — `deleteHabit` just needs to switch from `filter` to `map` with soft-delete.

### File: `src/hooks/use-habits.test.tsx`

The existing delete test (lines 86-109) asserts completions are hard-removed:

```tsx
it("deletes a habit and its completions", () => {
  const { result } = renderHook(() => useHabits(), { wrapper: createWrapper() });
  // ... adds habit, adds completion
  expect(result.current.completions).toHaveLength(1);
  act(() => { result.current.deleteHabit(id); });
  expect(result.current.habits).toHaveLength(0);
  expect(result.current.completions).toHaveLength(0); // <-- this assertion must change
});
```

### Convention to match

- Soft-delete pattern uses `deletedAt: now` + `syncedAt: null` — see `undoLastCompletion` in `crud.ts:79-81` for the exact pattern.
- The `deletedAt` field is `string | null` (see `types.ts:19`) — set it to an ISO 8601 string.
- Tests use `act()` wrappers around CRUD operations — see `use-habits.test.tsx:90-109`.

## Commands you will need

| Purpose   | Command                                          | Expected on success |
|-----------|--------------------------------------------------|---------------------|
| Typecheck | `npm run build`                                  | exit 0, no errors   |
| Tests     | `npm test`                                       | all 118+ tests pass |
| Lint      | `npm run lint`                                   | exit 0, no issues   |

## Scope

**In scope** (the only files you should modify):
- `src/lib/crud.ts` — change `deleteHabit` to soft-delete completions
- `src/hooks/use-habits.test.tsx` — update the delete test assertion

**Out of scope** (do NOT touch):
- `src/lib/sync.ts` — `mergeCompletions` already handles deletedAt correctly, no change needed
- `src/lib/store.ts` — the cache filter already excludes soft-deleted completions
- `src/lib/sync.test.ts` — no change needed; merge logic is unaffected
- Any other files

## Git workflow

- Branch: `advisor/021-soft-delete-completions`
- Commit message style: conventional commits (example: `fix: soft-delete completions on habit delete instead of removing them`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Change `deleteHabit` to soft-delete completions

Replace the `filter` call with a `map` that sets `deletedAt` and `syncedAt: null` on matching completions:

```tsx
export function deleteHabit(id: string): void {
  const now = new Date().toISOString();
  const { habits, completions } = getState();
  const updatedHabits = habits.map((h) =>
    h.id === id ? { ...h, deletedAt: now, updatedAt: now, syncedAt: null } : h
  );
  const updatedCompletions = completions.map((c) =>
    c.habitId === id ? { ...c, deletedAt: now, syncedAt: null } : c
  );
  commit({ habits: updatedHabits, completions: updatedCompletions });
  schedule();
}
```

The only change is line 55: from `completions.filter((c) => c.habitId !== id)` to `completions.map((c) => c.habitId === id ? { ...c, deletedAt: now, syncedAt: null } : c)`.

This follows the exact same pattern as `undoLastCompletion` at lines 79-81.

**Verify**: `npm run build` → exit 0, no errors

### Step 2: Update the delete test assertion

Change the existing test in `src/hooks/use-habits.test.tsx` (lines 86-109):

The `expect(result.current.completions).toHaveLength(0)` on line 108 should become:

```tsx
expect(result.current.completions).toHaveLength(1);
expect(result.current.completions[0].deletedAt).not.toBeNull();
```

This asserts that completions still exist in the array but are marked as deleted (soft-delete) instead of being removed.

The full updated test:

```tsx
it("deletes a habit and its completions", () => {
  const { result } = renderHook(() => useHabits(), {
    wrapper: createWrapper(),
  });
  act(() => {
    result.current.addHabit(
      "Delete me",
      "Sun",
      "good",
      "oklch(0.7 0.12 225)",
      "Done!"
    );
  });
  const id = result.current.habits[0].id;
  act(() => {
    result.current.addCompletion(id);
  });
  expect(result.current.completions).toHaveLength(1);
  act(() => {
    result.current.deleteHabit(id);
  });
  expect(result.current.habits).toHaveLength(0);
  expect(result.current.completions).toHaveLength(1);
  expect(result.current.completions[0].deletedAt).not.toBeNull();
});
```

**Verify**: `npm test -- src/hooks/use-habits.test.tsx` → all tests pass

### Step 3: Run full test suite

**Verify**: `npm test` → all tests pass (no regressions)

### Step 4: Run linter

**Verify**: `npm run lint` → exit 0, no issues

## Test plan

- Existing test "deletes a habit and its completions" in `use-habits.test.tsx` is updated to verify soft-delete behavior instead of hard-removal.
- No new tests needed — the existing integration test through `useHabits` covers the CRUD path.
- The store's cache filter test (`store.test.ts:106-115` "getSnapshot filters out deleted completions") already covers the display layer.
- Verification: `npm test -- src/hooks/use-habits.test.tsx` → all tests pass; `npm test` → all tests pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run build` exits 0
- [ ] `npm test` exits 0; the updated delete test passes
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "map" src/lib/crud.ts` returns a match for the completions deletion logic (the `map` call replacing `filter`)
- [ ] `grep -rn "\.filter" src/lib/crud.ts` does NOT match `completions.filter` — the hard filter is removed
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The `mergeCompletions` test in `sync.test.ts` fails because it assumed completions are hard-removed. Read `src/lib/sync.test.ts` around lines 33-108 to check. If you find such a test, report it — do NOT change `sync.test.ts`.
- The `use-habits.test.tsx` delete test returns zero completions even after the code change (i.e., the commit cache still filters them). This would mean `cachedVisibleCompletions` in `store.ts` is being used, but the test accesses `result.current.completions` which goes through `useSyncExternalStore` with `getSnapshotCompletions` — which returns `cachedVisibleCompletions` (filtered by deletedAt). If the test shows zero completions after the change, this is CORRECT behavior: the UI doesn't show deleted completions. Update the test assertion to check `getState()` directly instead:

  ```tsx
  import { getState } from "../lib/store.ts";
  // ...
  expect(result.current.completions).toHaveLength(0); // UI doesn't show deleted
  expect(getState().completions).toHaveLength(1); // but in-memory still has them
  expect(getState().completions[0].deletedAt).not.toBeNull();
  ```

## Maintenance notes

- After this change, the delete dialog text should eventually be updated from "This will permanently delete this habit and all of its completions" to something more accurate like "This will hide this habit and its completions. Data can be recovered if you contact support." But that's a separate UX plan.
- If a future "garbage collection" feature is added to purge old soft-deleted completions from localStorage, the sync push must happen BEFORE the local purge, so the deletion propagates to Supabase.
- The `undoLastCompletion` function already uses the same soft-delete pattern — these two fixes keep the codebase consistent. Any future "undo delete habit" feature can simply clear the `deletedAt` field on both the habit and its completions.