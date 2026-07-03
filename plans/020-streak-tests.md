# Plan 020: Add streak computation tests in compute-stats

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c0c1fd9..HEAD -- src/lib/compute-stats.ts src/lib/compute-stats.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `c0c1fd9`, 2026-07-03
- **Issue**: —

## Why this matters

`compute-stats.ts` contains 85 lines of streak logic (`computeCurrentStreak` at lines 55-91, `computeLongestStreak` at lines 93-140) — the most complex business logic in the codebase. These functions handle: good-habit streaks (consecutive completion days), bad-habit streaks (consecutive non-completion days), lookback limits (365 days), longest-vs-current differentiation, and boundary conditions (no completions, single day, broken streaks). Despite this complexity, the existing test file (`compute-stats.test.ts`) has 9 tests covering `grandTotal`, `totalInWindow`, `averagePerDay`, `dailyData`, and empty states — but **zero** tests for `currentStreak` or `longestStreak`. A regression in streak logic would go completely undetected.

## Current state

### File: `src/lib/compute-stats.ts`

The streak functions (lines 55-91 and 93-140) accept `completions: Completion[]`, `habitId`, `habitType`, and (for current streak) `createdAt`. They build a `Set<string>` of date keys and iterate day by day:

```tsx
function computeCurrentStreak(
  completions: Completion[],
  habitId: string,
  habitType: "good" | "bad",
  createdAt: string
): number {
  const completionDates = getCompletionDateSet(completions, habitId);
  const earliestDate = createdAt
    ? new Date(Math.max(new Date(createdAt).getTime(), Date.now() - 365 * 86_400_000))
    : new Date(Date.now() - 365 * 86_400_000);
  let streak = 0;
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  const earliest = startOfDay(earliestDate);
  while (current >= earliest) {
    const key = formatDateKey(current);
    const hasCompletion = completionDates.has(key);
    if (habitType === "good" && hasCompletion) { streak++; }
    else if (habitType === "bad" && !hasCompletion) { streak++; }
    else { break; }
    current.setDate(current.getDate() - 1);
  }
  return streak;
}

function computeLongestStreak(
  completions: Completion[], habitId: string, habitType: "good" | "bad"
): number {
  const completionDates = getCompletionDateSet(completions, habitId);
  const allDates = [...completionDates].sort();
  if (allDates.length === 0) return 0;
  const firstDate = new Date(allDates[0]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxSpan = Math.min(366, Math.ceil((today.getTime() - firstDate.getTime()) / 86_400_000) + 1);
  // ... iterates forward from firstDate to today counting runs
}
```

The functions use `Date.now()` internally, making them non-deterministic and impossible to test with controlled dates.

### File: `src/lib/compute-stats.test.ts`

The existing tests (127 lines total) cover totals, averages, daily data, and empty arrays. Example test:

```tsx
function makeCompletion(habitId: string, daysAgo: number): Completion {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  // ... constructs completion with timestamp at noon
}

it("counts lifetime total per habit", () => {
  const completions = [
    makeCompletion("h1", 0),
    makeCompletion("h1", 100),
  ];
  const result = computeStats(habits, completions, 7);
  expect(result.goodHabits[0].lifetimeTotal).toBe(2);
});
```

### Convention to match

- Tests use `describe`/`it`/`expect` from vitest (see `compute-stats.test.ts:1`).
- Test data uses the `Completion` and `Habit` types from `src/types.ts`.
- The `makeCompletion` helper at line 32 constructs completion objects with timestamps at noon UTC.
- Tests avoid mocking — they test real functions with real data.

## Commands you will need

| Purpose   | Command                                 | Expected on success |
|-----------|-----------------------------------------|---------------------|
| Typecheck | `npm run build`                         | exit 0, no errors   |
| Tests     | `npm test -- src/lib/compute-stats.test.ts` | all 9+ tests pass |
| Lint      | `npm run lint`                          | exit 0, no issues   |

## Scope

**In scope** (the only files you should modify):
- `src/lib/compute-stats.test.ts` — add streak tests

**Out of scope** (do NOT touch):
- `src/lib/compute-stats.ts` — no source changes; tests only
- Any other files

## Git workflow

- Branch: `advisor/020-streak-tests`
- Commit message style: conventional commits (example: `test: add streak computation tests for good and bad habits`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add streak test helpers and test cases

Add new tests to `src/lib/compute-stats.test.ts` inside the existing `describe("computeStats")` block. Add them after the existing tests (after line 127).

These tests work by constructing completions with known dates (days ago), then asserting the expected streak values from `computeStats`. Because `computeCurrentStreak` internally calls `Date.now()`, the tests must construct completions relative to the current date. The existing `makeCompletion` helper does this. The streak values will be deterministic for the test data because `currentStreak` walks backwards from today.

Add these tests:

```tsx
it("computes current streak for good habit with daily completions", () => {
  // Exercise done every day for the last 5 days
  const completions = Array.from({ length: 5 }, (_, i) =>
    makeCompletion("h1", i)
  );
  const result = computeStats(habits, completions, 7);
  const h1 = result.goodHabits[0];
  expect(h1.currentStreak).toBe(5);
});

it("computes current streak of 0 for good habit with no completions", () => {
  const result = computeStats(habits, [], 7);
  expect(result.goodHabits[0].currentStreak).toBe(0);
});

it("breaks streak when a day is missed for good habit", () => {
  // Completed today, yesterday, but not 2 days ago, then completed 3 days ago
  const completions = [
    makeCompletion("h1", 0), // today
    makeCompletion("h1", 1), // yesterday
    // 2 days ago — skipped
    makeCompletion("h1", 3), // 3 days ago
  ];
  const result = computeStats(habits, completions, 7);
  const h1 = result.goodHabits[0];
  expect(h1.currentStreak).toBe(2); // only the consecutive streak from today
});

it("computes current streak for bad habit with no completions", () => {
  // Bad habit — streak = consecutive days WITHOUT completions
  const completions: Completion[] = [];
  const result = computeStats(habits, completions, 7);
  const h2 = result.badHabits[0];
  // h2 was created "2026-01-01" (far in the past), so streak is capped at 365
  expect(h2.currentStreak).toBeGreaterThan(0);
});

it("breaks streak for bad habit when a completion is logged", () => {
  // Bad habit "No soda" — a completion today should break the streak
  // (bad habit streak = consecutive days WITHOUT a completion)
  // First, check streak with no completions
  const completions: Completion[] = [];
  const streakNoComps = computeStats(habits, completions, 7).badHabits[0].currentStreak;

  // Now add a completion for today — streak should drop
  const completionsWithToday = [makeCompletion("h2", 0)];
  const streakWithToday = computeStats(habits, completionsWithToday, 7).badHabits[0].currentStreak;
  expect(streakWithToday).toBeLessThan(streakNoComps);
  // Streak should be 0 — a completion today means the streak of non-completion days is broken
  expect(streakWithToday).toBe(0);
});

it("computes longest streak longer than current streak when there are gaps", () => {
  // Exercise done daily for 10 days, then missed for 3 days, then done daily for 5 more days
  const completions: Completion[] = [];
  // Recent 5 days: days 0-4 (today to 4 days ago)
  for (let i = 0; i < 5; i++) {
    completions.push(makeCompletion("h1", i));
  }
  // Skip days 5-7 (3-day gap)
  // Previous 10-day streak: days 8-17
  for (let i = 8; i < 18; i++) {
    completions.push(makeCompletion("h1", i));
  }
  const result = computeStats(habits, completions, 30);
  const h1 = result.goodHabits[0];
  expect(h1.currentStreak).toBe(5);
  expect(h1.longestStreak).toBeGreaterThanOrEqual(10);
});

it("returns 0 longest streak when there are no completions", () => {
  const result = computeStats(habits, [], 7);
  expect(result.goodHabits[0].longestStreak).toBe(0);
  expect(result.badHabits[0].longestStreak).toBe(0);
});

it("returns longest streak of 1 for a single completion", () => {
  const completions = [makeCompletion("h1", 0)];
  const result = computeStats(habits, completions, 7);
  expect(result.goodHabits[0].longestStreak).toBe(1);
});
```

**Verify**: `npm test -- src/lib/compute-stats.test.ts` → all 16+ tests pass

### Step 2: Run full test suite

**Verify**: `npm test` → all tests pass (no regressions)

### Step 3: Run linter

**Verify**: `npm run lint` → exit 0, no issues

## Test plan

- 9 new test cases in `src/lib/compute-stats.test.ts` in the existing `describe("computeStats")` block
- Cover: good-habit streak 5, good-habit streak 0, broken streak resets, bad-habit streak (no completions = max streak), bad-habit streak broken by a completion, longest > current with gaps, empty completions = 0 longest streak, single-completion longest streak
- All tests use the existing `makeCompletion` helper and `habits` fixture — no new test infrastructure needed
- Verification: `npm test -- src/lib/compute-stats.test.ts` → all tests pass

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run build` exits 0
- [ ] `npm test -- src/lib/compute-stats.test.ts` exits 0; 9+ new streak tests pass
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "currentStreak\|longestStreak" src/lib/compute-stats.test.ts` returns at least 9 matches (one per test assertion)
- [ ] No files outside `src/lib/compute-stats.test.ts` are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any streak test fails because `Date.now()` makes the function non-deterministic. For example, the bad-habit streak test "computes current streak for bad habit with no completions" may return a value that changes depending on when the test runs. If this happens, verify the streak is at least > 0 (which is always true for a bad habit with no completions since its creation date). Adjust assertions accordingly — use `.toBeGreaterThan(0)` instead of exact values for time-dependent streaks.
- The "breaks streak for bad habit" test fails because the streak is 1 instead of 0. This is correct if there's a bug in the streak code. If it fails, report the actual value — do not adjust the test to pass against broken code.

## Maintenance notes

- These tests are time-dependent — they use `Date.now()` indirectly through `computeCurrentStreak`. The functions are NOT refactored to accept a reference date (that's a future improvement). The tests compensate by using relative date construction (completions measured in "days ago") and relative assertions (`.toBeGreaterThan`).
- If a future refactor makes `computeCurrentStreak` accept a reference date, these tests should be updated to pass a fixed date and use exact-match assertions.
- The longest streak tests are more stable than current streak tests because `longestStreak` iterates over known completion dates, not from today backward.