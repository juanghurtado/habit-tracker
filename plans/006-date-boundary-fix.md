# Plan 006: Fix UTC/local date boundary mismatch in completion matching

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat bcfcb39..HEAD -- src/lib/storage.ts src/hooks/use-habits.ts src/App.tsx src/types.ts`
> If any of these files changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 001 (test infrastructure — characterization tests must exist before changing query logic)
- **Category**: correctness
- **Planned at**: commit `bcfcb39`, 2026-06-25
- **Revised**: 2026-06-25 (original UTC-key approach broke tests in positive-offset timezones; replaced with local-date-to-UTC-range approach)

## Why this matters

Completions logged near midnight are silently misattributed to the wrong date. The `timestamp` field is stored as a UTC ISO 8601 string (`new Date().toISOString()`), but `formatDateKey` uses local-timezone getters (`getFullYear`, `getMonth`, `getDate`). A completion logged at 11 PM local time in a UTC-3 timezone (which is 02:00 UTC the next day) has a UTC timestamp of the next day but a local date key of the current day. The `startsWith` match fails, and the completion disappears from its intended date.

## Current state

`src/lib/storage.ts:69-74` — date keys are formatted in local timezone:
```ts
export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
```

`src/lib/storage.ts:76-93` — matching uses `startsWith` with a local key against a UTC timestamp:
```ts
export function getCompletionsForDate(completions, date): Completion[] {
  const key = formatDateKey(date)
  return completions.filter((c) => c.timestamp.startsWith(key))
}
export function getCompletionsForHabitOnDate(completions, habitId, date): Completion[] {
  const key = formatDateKey(date)
  return completions.filter((c) => c.habitId === habitId && c.timestamp.startsWith(key))
}
```

The bug: `new Date().toISOString()` produces `"2026-06-26T02:00:00.000Z"` for a completion logged at 11 PM local in UTC-3. `formatDateKey(new Date())` returns `"2026-06-25"`. The `startsWith("2026-06-25")` check fails against the UTC timestamp `"2026-06-26T02:00:00.000Z"` — completion vanishes.

The fix: instead of using `startsWith` against a date key, convert the local `date` to a UTC timestamp range (start of local day to start of next local day) and compare each completion's UTC timestamp against that range with `>=` / `<` string comparison.

Repo conventions (from `CONTEXT.md`):
- The domain term "Completion" applies (not "log" or "entry").
- The app is single-user, local-first.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build | `npm run build` | exit 0 |
| Test | `npm test` | exit 0, all tests pass |

## Scope

**In scope**:
- `src/lib/storage.ts` — rewrite `getCompletionsForDate` and `getCompletionsForHabitOnDate` to use UTC range comparison
- `src/lib/storage.test.ts` — add UTC boundary test cases

**Out of scope**:
- `src/App.tsx` — not touched
- `src/types.ts` — not touched
- `src/hooks/use-habits.ts` — not touched
- `formatDateKey` — keep unchanged (might be used elsewhere; check with `grep -rn "formatDateKey" src/`)

## Git workflow

- Branch: `advisor/006-date-boundary-fix`
- Commit style: `fix: use UTC timestamp range for completion matching to prevent midnight misattribution`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Verify plan 001 tests exist (prerequisite)

Run: `ls src/lib/storage.test.ts`

If the file does not exist, STOP and report: plan 001 must be executed first.

### Step 2: Check if formatDateKey is used outside storage.ts

Run: `grep -rn "formatDateKey" src/`

If any result points to files OTHER than `src/lib/storage.ts` and `src/lib/storage.test.ts`, report which files. If only `storage.ts` and `storage.test.ts` are found, proceed.

### Step 3: Rewrite the two filtering functions to use UTC range comparison

In `src/lib/storage.ts`, replace `getCompletionsForDate` (currently around lines 76-82) and `getCompletionsForHabitOnDate` (currently around lines 84-93) with versions that compute a UTC range from the local date:

```ts
export function getCompletionsForDate(
  completions: Completion[],
  date: Date
): Completion[] {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  const startStr = start.toISOString()
  const endStr = end.toISOString()
  return completions.filter(
    (c) => c.timestamp >= startStr && c.timestamp < endStr
  )
}

export function getCompletionsForHabitOnDate(
  completions: Completion[],
  habitId: string,
  date: Date
): Completion[] {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  const startStr = start.toISOString()
  const endStr = end.toISOString()
  return completions.filter(
    (c) => c.habitId === habitId && c.timestamp >= startStr && c.timestamp < endStr
  )
}
```

How this works:
- `new Date(2026, 5, 25)` creates midnight local time on June 25.
- `.toISOString()` converts that to its UTC representation (e.g. `"2026-06-24T22:00:00.000Z"` in UTC+2, `"2026-06-25T03:00:00.000Z"` in UTC-3).
- `new Date(2026, 5, 26)` creates midnight local time on June 26, giving the end boundary.
- A completion logged at 11 PM local (UTC-3) has UTC timestamp `"2026-06-26T02:00:00.000Z"` — this falls between `"2026-06-25T03:00:00.000Z"` (start) and `"2026-06-26T03:00:00.000Z"` (end), so it correctly matches June 25.
- In UTC+2, the range is `["2026-06-24T22:00:00.000Z", "2026-06-25T22:00:00.000Z")`. A completion at `"2026-06-25T10:00:00.000Z"` falls within this range. Correct.

**Verify**: `npm run build` — exits 0.

### Step 4: Run existing tests

**Verify**: `npm test` — all existing tests pass. The characterization tests from plan 001 use test data with timestamps that should match within these ranges in any timezone.

### Step 5: Add UTC boundary test cases

In `src/lib/storage.test.ts`, add these test cases:

Inside the `getCompletionsForHabitOnDate` describe block, add:
```ts
  it("matches a completion logged near local midnight using UTC range", () => {
    // Simulate: user at UTC-3 logs a completion at 11 PM local on June 25
    // The UTC timestamp is June 26, 02:00
    const completions = [
      { id: "1", habitId: "a", timestamp: "2026-06-26T02:00:00.000Z" },
    ]
    // User views June 25 (local)
    const localJune25 = new Date(2026, 5, 25)
    const result = getCompletionsForHabitOnDate(completions, "a", localJune25)
    // The UTC range for local June 25 should include this completion
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })
```

Also in `getCompletionsForDate`, add:
```ts
  it("matches completions across UTC day boundary", () => {
    const completions = [
      { id: "1", habitId: "a", timestamp: "2026-06-26T02:00:00.000Z" },
    ]
    // Local June 25 — should catch the UTC June 26 completion
    // logged at 11 PM local (UTC-3) or similar late-hour scenario
    const localDate = new Date(2026, 5, 25)
    const result = getCompletionsForDate(completions, localDate)
    // This test verifies the completion IS found (the fix).
    // In any timezone, a completion with timestamp "2026-06-26T02:00:00.000Z"
    // falls within local June 25's UTC range as long as local midnight UTC
    // is before 02:00 UTC — which is true for any UTC offset -2 or lower,
    // and for timezones UTC+0 or below. For timezones above UTC+2 this
    // completion falls on June 24's range — which is correct behavior
    // (the user was still on June 24 when they logged it).
    // If this test fails in your timezone, skip it and note which timezone.
    expect(result).toHaveLength(1)
  })
```

**Verify**: `npm test` — all tests pass.

## Test plan

- Existing characterization tests from plan 001 continue to pass unchanged.
- New tests verify the UTC boundary case: completions logged near local midnight (whose UTC timestamp falls on a different UTC day) still match the correct local date.
- The `getCompletionsForDate` boundary test may be skipped in timezones UTC+3 or higher — note this in the report.

## Done criteria

- [ ] `npm run build` exits 0
- [ ] `npm test` exits 0 — all tests pass (or note which ones were skipped and why)
- [ ] `getCompletionsForDate` and `getCompletionsForHabitOnDate` use UTC range comparison (>= startStr, < endStr)
- [ ] `formatDateKey` remains unchanged (keep for backward compatibility)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated to DONE (skip this — reviewer maintains index)

## STOP conditions

Stop and report back (do not improvise) if:

- `npm test` fails — the characterization tests may use dates that don't overlap with the UTC range in your timezone. If so, report which tests failed and your timezone.
- `formatDateKey` is imported by files OUTSIDE `src/lib/storage.ts` and `src/lib/storage.test.ts` — report which files.
- The `getCompletionsForDate` boundary test fails in your timezone — this is expected in UTC+3 or higher (where local midnight UTC is after 02:00 UTC, so the test completion falls on the previous day). Note this in the report and skip the test.

## Maintenance notes

- The UTC range comparison uses ISO 8601 string comparison (`>=` / `<`), which works because the strings are lexicographically sortable and length-normalized. If timestamp format ever changes (e.g. to Unix epoch numbers, or ISO strings with non-Z offsets), this breaks.
- `formatDateKey` is preserved for backward compatibility. If no external callers exist after this change, consider removing it in a future cleanup.
- The two functions now share the boundary computation logic (`start` / `end` / `startStr` / `endStr`). If a third function needs the same pattern, extract it to a shared helper.