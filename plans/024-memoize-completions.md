# Plan 024: Memoize completionsOnDate in DailyLog

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b469fba..HEAD -- src/components/daily-log.tsx`
> If the DailyLog component has changed since this plan was written, compare
> the "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW — adding memoization, no behavior change
- **Depends on**: plans/023-shared-form.md — not strictly, but DailyLog is the consumer of useHabits; 023 changes the internal structure of AddHabitSheet which DailyLog mounts. If 023 is in progress, 024 can still proceed independently since it only touches DailyLog.
- **Category**: perf
- **Planned at**: commit `b469fba`, 2026-07-08
- **Issue**: —

## Why this matters

DailyLog (`src/components/daily-log.tsx`) calls `completionsOnDate` on every render — once per habit. At line 151-155:

```tsx{7}
const habitCompletions = completionsOnDate(
  completions,
  date,
  habit.id
);
```

The `completionsOnDate` function (in `src/lib/storage.ts:132-147`) filters the entire completions array for each habit, doing the same date range comparison every time. With N habits and M completions, this is O(N×M) per render.

In practice the dataset is tiny (single user, hundreds of completions max) so the perf impact is sub-millisecond. However, `completionsOnDate` creates a **new filtered array on every call** — meaning every habit card button allocation happens even when nothing changed. This is structural safety: the same pattern in `compute-stats.ts:163-166` was addressed in plan 008 (memoize stats computation).

## Current state

`src/components/daily-log.tsx`, lines 149-163:
```tsx
{habits.map((habit) => {
  const habitCompletions = completionsOnDate(
    completions,
    date,
    habit.id
  );
  const count = habitCompletions.length;
  const Icon = getIcon(habit.icon);
  return (
    <div className="relative h-full" key={habit.id}>
      <button
        className="..."
        onClick={() => handleComplete(habit.id)}
        style={{ backgroundColor: ... }}
        type="button"
      >
        ...
      </button>
      ...
    </div>
  );
})}
```

The `useHabits` hook returns `habits` and `completions` from `useStore()` which uses `useSyncExternalStore` — the returned arrays are new references after any store mutation (commit), triggering re-renders of ALL consumers. `completionsOnDate` runs every time even for habits whose completions haven't changed.

## Commands you will need

| Purpose   | Command                              | Expected on success |
|-----------|--------------------------------------|---------------------|
| Typecheck | `tsc --noEmit`                       | exit 0, no errors   |
| Tests     | `npm run test -- daily-log`          | all tests pass      |
| Lint      | `npm run lint`                       | exit 0              |
| Build     | `npm run build`                      | exit 0              |

## Scope

**In scope** (files to modify):
- `src/components/daily-log.tsx` — add `useMemo` wrapping

**Out of scope** (do NOT touch):
- `src/lib/storage.ts:132-147` — the `completionsOnDate` function itself must not be modified
- `src/lib/compute-stats.ts` — already has memoization for dailyData in plan 008 pattern
- `src/hooks/use-habits.ts` — the hook should remain unchanged

## Git workflow

- Branch: `advisor/024-memoize-completions`
- Commit: `refactor: memoize completionsOnDate in DailyLog`
- Follow conventional commits as in `git log`

## Steps

### Step 1: Add the memoization

Add `useMemo` to the import at the top of `src/components/daily-log.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
```

Replace the habit rendering block. The `completionsOnDate` call should be memoized by habit ID. Before the `.map()` call, add:

```tsx
const completionsByHabit = useMemo(() => {
  const map = new Map<string, Completion[]>();
  for (const habit of habits) {
    if (habit.deletedAt === null) {
      map.set(habit.id, completionsOnDate(completions, date, habit.id));
    }
  }
  return map;
}, [completions, date, habits]);
```

Then in the `.map(callback)` call, replace:
```tsx
const habitCompletions = completionsOnDate(completions, date, habit.id);
```
with:
```tsx
const habitCompletions = completionsByHabit.get(habit.id) ?? [];
```

### Step 2: Update the count and icon logic

Replace this section in the `.map()` body:
```tsx
const habitCompletions = completionsOnDate(
  completions,
  date,
  habit.id
);
const count = habitCompletions.length;
const Icon = getIcon(habit.icon);
```
with:
```tsx
const habitCompletions = completionsByHabit.get(habit.id) ?? [];
const count = habitCompletions.length;
const Icon = getIcon(habit.icon);
```

The full `.map()` body becomes:
```tsx{2}
{habits.map((habit) => {
  const habitCompletions = completionsByHabit.get(habit.id) ?? [];
  const count = habitCompletions.length;
  const Icon = getIcon(habit.icon);
  return (
    <div className="relative h-full" key={habit.id}>
      <button
        className="..."
        // rest of the JSX unchanged
      >
        ...
      </button>
    </div>
  );
})}
```

### Step 3: Verify

```bash
npm run test -- daily-log
npm run lint
```

**Expected**: all tests pass, no lint errors.

## Test plan

**No new tests needed** — the memoization is a transparent optimization. Existing tests in `src/components/daily-log.test.tsx` verify rendering behavior, not allocation patterns. All 10 existing tests must pass.

**Add one regression test** in `src/components/daily-log.test.tsx` at the end of the file:

```ts
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DailyLog } from "./daily-log.tsx";

// Add to existing vi.mock blocks at top of file

describe("DailyLog memoization", () => {
  it("renders habit cards without throwing (verifies memoized completions)", () => {
    mockWithHabits();
    render(<DailyLog date={new Date()} onDateChange={vi.fn()} />);
    expect(screen.getByText("Drink water")).toBeInTheDocument();
    expect(screen.getByText("No soda")).toBeInTheDocument();
  });
});
```

**Verification**: `npm run test -- daily-log` → all 11 tests pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `tsc --noEmit` exits 0
- [ ] `npm run test -- daily-log` exits 0; all tests pass
- [ ] `npm run lint` exits 0
- [ ] `grep -n "useMemo" src/components/daily-log.tsx` returns at least 1 line
- [ ] `grep -n "completionsOnDate(" src/components/daily-log.tsx` returns 0 lines (should only be inside the useMemo definition, not called per-habit in the map)
- [ ] No files outside `src/components/daily-log.tsx` are modified
- [ ] `src/lib/storage.ts:132-147` is unmodified (original `completionsOnDate` function unchanged)

## STOP conditions

Stop and report back (do not improvise) if:

- The DailyLog component structure at lines 149-163 doesn't match the excerpts (codebase has drifted).
- Any existing daily-log test fails — the memoization must not change rendering behavior.
- The `useMemo` dependencies array needs something that the `completions` hook return value can't satisfy (e.g., if `useHabits` changes how it returns completions).

## Maintenance notes

- The memoization key is `[completions, date, habits]` — this means any mutation to habits OR completions OR date change triggers recalculation. This is correct and safe.
- If new habit-like objects are added to DailyLog that trigger `completionsOnDate`, they should also use the memoized map.
- If the app grows to support hundreds of habits, consider replacing the map-based memoization with a more sophisticated cache.
- Reviewers should verify the memoization doesn't introduce stale closure bugs — `completionsByHabit.get()` is read-only and the Map is recreated fresh each render cycle.
