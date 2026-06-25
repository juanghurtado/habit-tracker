# Plan 005: Fix undoLastCompletion to use timestamps, not array order

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat bcfcb39..HEAD -- src/hooks/use-habits.ts src/lib/storage.ts`
> If either file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 001 (test infrastructure — characterization tests must exist before changing this logic)
- **Category**: correctness
- **Planned at**: commit `bcfcb39`, 2026-06-25

## Why this matters

`undoLastCompletion` uses `lastIndexOf` on a mapped array to find the "last" completion for a habit, which depends on element ordering in the completions array. Currently, completions are always appended (newest last), so array order matches insertion order. But if any future change alters insertion order (e.g. bulk import, prepend, sorted insertion from a sync feature), `lastIndexOf` silently removes the wrong completion. Using the `timestamp` field (which is always set to the completion time in UTC) makes the behavior correct regardless of array ordering.

## Current state

`src/hooks/use-habits.ts:70-77`:
```ts
const undoLastCompletion = useCallback((habitId: string) => {
  const comps = loadCompletions()
  const lastIndex = comps.map((c) => c.habitId).lastIndexOf(habitId)
  if (lastIndex === -1) return
  const updated = comps.filter((_, i) => i !== lastIndex)
  saveCompletions(updated)
  notifyListeners()
}, [])
```

The current algorithm:
1. Loads all completions.
2. Maps to `habitId` values, then finds the last index where `habitId` matches.
3. Filters out that index.

This works *because* completions are always appended to the end of the array (via spread in `addCompletion` -> `createCompletion`). The "last" completion in array order is the most recent one — today.

Repo conventions:
- Functions in `use-habits.ts` use `useCallback` with `[]` deps (see existing callbacks).
- Mutations call `saveCompletions` then `notifyListeners`.
- Completions have `timestamp` field as an ISO 8601 UTC string (set by `new Date().toISOString()` in `createCompletion`).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build | `npm run build` | exit 0 |
| Test | `npm test` | exit 0, all tests pass |

## Scope

**In scope**:
- `src/hooks/use-habits.ts` — change `undoLastCompletion` to use timestamp sorting

**Out of scope**:
- `src/lib/storage.ts` — not touched
- Any test file (characterization tests from plan 001 already cover the behavior)
- `addCompletion` — insertion logic stays the same (append)

## Git workflow

- Branch: `advisor/005-undo-by-timestamp`
- Commit style: `fix: use timestamps not array order to determine most recent completion`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Verify plan 001 tests exist (prerequisite)

Run: `ls src/lib/storage.test.ts`

If the file does not exist, STOP and report: plan 001 must be executed first. The characterization tests define the expected behavior of the completion query functions that this fix relies on.

### Step 2: Change undoLastCompletion to use timestamps

Replace the body of `undoLastCompletion` in `src/hooks/use-habits.ts`:

Before:
```ts
const undoLastCompletion = useCallback((habitId: string) => {
  const comps = loadCompletions()
  const lastIndex = comps.map((c) => c.habitId).lastIndexOf(habitId)
  if (lastIndex === -1) return
  const updated = comps.filter((_, i) => i !== lastIndex)
  saveCompletions(updated)
  notifyListeners()
}, [])
```

After:
```ts
const undoLastCompletion = useCallback((habitId: string) => {
  const comps = loadCompletions()
  const habitComps = comps.filter((c) => c.habitId === habitId)
  if (habitComps.length === 0) return
  const mostRecent = habitComps.reduce((a, b) =>
    a.timestamp > b.timestamp ? a : b
  )
  const updated = comps.filter((c) => c.id !== mostRecent.id)
  saveCompletions(updated)
  notifyListeners()
}, [])
```

The new algorithm:
1. Loads all completions.
2. Filters to only completions for the given habit.
3. Finds the one with the most recent `timestamp` (using lexicographic comparison, which works for ISO 8601 UTC strings).
4. Removes it by its unique `id`.

This is correct regardless of:
- Array insertion order (prepend, append, random order, sorted).
- Batch imports from external sources.
- Timestamps being off by a few milliseconds (the `reduce` picks the larger string, which corresponds to the later time in ISO 8601).
- Multiple completions having the same timestamp (only one is removed — the first encountered by reduce in case of exact tie, which is fine).

**Verify**: `npm run build` — exits 0.

### Step 3: Run existing tests

**Verify**: `npm test` — exits 0, all tests pass.

## Test plan

The characterization tests from plan 001 do not directly test `undoLastCompletion` (it's inside the React hook). To verify manually:

1. `npm run dev`, open the app.
2. Create a habit.
3. Log 3 completions for it (tap the button 3 times).
4. Open `localStorage` in dev tools → `habit-tracker-completions` — note the 3 entries with their timestamps.
5. Tap the menu → "Undo last" — verify only the most recent completion is removed.
6. Repeat — verify the next most recent is removed.
7. Verify that other habits' completions are unaffected.

If plan 001 is done, a future improvement would be to add a test for this function. For now, manual verification is sufficient.

## Done criteria

- [ ] `npm run build` exits 0
- [ ] `npm test` exits 0 (all existing tests pass)
- [ ] `src/hooks/use-habits.ts` `undoLastCompletion` uses `c.timestamp` comparison instead of `lastIndexOf`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `npm test` fails — the characterization tests may be stricter than expected.
- `src/lib/storage.test.ts` does not exist (plan 001 not executed).
- The `timestamp` field in the `Completion` type changes format — verify that ISO 8601 UTC strings are still comparable with `>`.
- The `useCallback` dependency array `[]` causes a stale closure over `loadCompletions` (it won't — `loadCompletions` is a module-level function, not a prop/state).

## Maintenance notes

- The `reduce` pattern for finding the most recent timestamp works with lexicographic string comparison because ISO 8601 strings (e.g. `2026-06-25T10:00:00.000Z`) are length-normalized with zero-padding. As long as `timestamp` remains an ISO 8601 string, this is correct. If the format changes (e.g. to a Unix timestamp number), update this comparison.
- If performance becomes an issue with thousands of completions, consider indexing completions by `habitId` with a Map lookup instead of filtering the array each time.
- The `undoLastCompletion` callback's `[]` deps are safe because it only accesses module-scoped functions and creates local variables. If React's rules-of-hooks linting is added later, this pattern should be preserved.