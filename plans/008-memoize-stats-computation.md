# Plan 008: Memoize stats computation in StatsPage

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 581ee39..HEAD -- src/components/stats-page.tsx`
> If `stats-page.tsx` changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `581ee39`, 2026-06-25

## Why this matters

`computeStats()` is called directly in the render body of `StatsPage` on every state change. This function iterates all habits, all completions in the window, and for each habit runs a streak computation that loops day-by-day (up to 366 days per habit). With 5 habits and ~1,000 completions, this is ~1,800 iterations per re-render. Every tab switch, window-days toggle, or state change in a parent component triggers a full recomputation. Wrapping in `useMemo` makes it only recompute when `habits`, `completions`, or `windowDays` actually change.

## Current state

**`src/components/stats-page.tsx`** — the relevant excerpt (lines 40–56):

```tsx
export function StatsPage() {
  const { habits, completions } = useHabits()
  const [windowDays, setWindowDays] = useState(7)

  const stats = computeStats(habits, completions, windowDays) // ← NOT memoized

  const summaryStats = useMemo(() => {
    const totalCompletions = stats.goodHabits.reduce((s, h) => s + h.totalInWindow, 0) +
      stats.badHabits.reduce((s, h) => s + h.totalInWindow, 0)
    const bestStreak = Math.max(
      ...stats.goodHabits.map((h) => h.currentStreak),
      ...stats.badHabits.map((h) => h.currentStreak),
      0
    )
    return { totalCompletions, bestStreak }
  }, [stats])
```

The `summaryStats` useMemo depends on `stats`, but `stats` itself is a new object every render — so `summaryStats` also recomputes every render despite the useMemo wrapper. Both computations should be chained in `useMemo`.

The repo convention (visible in `BackgroundPattern`, `MiniBarChart`, and `summaryStats` itself) is to use `useMemo` from `react` for expensive derivations. Use it here too.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Build     | `npm run build`          | exit 0              |
| Typecheck | `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| Tests     | `npm test`               | all pass            |

## Scope

**In scope**:
- `src/components/stats-page.tsx` — wrap `computeStats(...)` in `useMemo`

**Out of scope**:
- `src/lib/compute-stats.ts` — the compute function itself is fine; only its call site changes
- Any other components or files

## Git workflow

- Branch: `advisor/008-memoize-stats`
- Commit message style: `perf: memoize computeStats in StatsPage to avoid per-render recomputation`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Wrap `computeStats` in `useMemo`

In `src/components/stats-page.tsx`, find line 44 (`const stats = computeStats(habits, completions, windowDays)`).

`useMemo` is already imported at the top of the file (line 1). Wrap the call:

```tsx
const stats = useMemo(
  () => computeStats(habits, completions, windowDays),
  [habits, completions, windowDays]
)
```

**Verify**: `npm run build` → exit 0. `npm test` → all test files pass.

## Test plan

The existing `compute-stats.test.ts` tests already verify the computation logic. No new tests needed — this is a pure performance change with no behavior impact. The existing assertions on `StatsPage` behavior (none exist yet) would continue to pass if they were written.

## Done criteria

- [ ] `npm run build` exits 0
- [ ] `npm test` exits 0 (all 31 tests pass)
- [ ] `grep -rn "const stats = computeStats" src/` returns no matches (confirms the old pattern is gone)
- [ ] The new `useMemo` call has deps `[habits, completions, windowDays]`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:
- `stats-page.tsx` has been significantly restructured since this plan was written
- `useMemo` is not already imported in the file (it is on line 1 as of this writing)
- The build or tests fail after the change
- The function signature of `computeStats` has changed

## Maintenance notes

- If `computeStats` is ever used in another component, memoize it there too with the same pattern.
- The `stats` dependency in the existing `summaryStats` useMemo is now stable (won't change identity unless deps change). This was already correct but is now effective.
- If `windowDays` is ever lifted to a parent or context, adjust the dependency array accordingly.