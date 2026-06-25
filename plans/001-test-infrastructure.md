# Plan 001: Add vitest, jsdom, and write initial unit tests

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat bcfcb39..HEAD -- src/ package.json tsconfig.app.json`
> If any file under `src/` or `package.json` or `tsconfig.app.json` changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `bcfcb39`, 2026-06-25

## Why this matters

The codebase has zero tests across 18 source files (~1.2K SLOC). Plans 005 and 006 involve changing storage/query logic (date matching, undo) and need a regression safety net before they can be made safely. A characterization test suite for the pure functions in `src/lib/storage.ts` and `src/lib/colors.ts` provides that baseline and establishes the testing pattern for all future work.

## Current state

- `package.json` has no vitest, `@testing-library/react`, jsdom, or any test dependency.
- `tsconfig.app.json` exists with `strict: true` but no vitest types config.
- Pure, testable functions exist in these files:
  - `src/lib/storage.ts:44-67` — `createHabit`, `createCompletion` (pure factory functions)
  - `src/lib/storage.ts:69-74` — `formatDateKey` (pure date formatting)
  - `src/lib/storage.ts:76-93` — `getCompletionsForDate`, `getCompletionsForHabitOnDate` (pure filtering)
  - `src/lib/colors.ts:42-45` — `getRandomColor`
  - `src/lib/button-labels.ts:34-37` — `getRandomLabel`
- `dist/` is gitignored; `node_modules/` is gitignored.
- No test files exist anywhere (`*.test.*`, `*.spec.*`, `__tests__/`).

**Notable**: `src/lib/storage.ts:9` uses `crypto.randomUUID()` which requires the `crypto` API — this is a browser API. Some of these functions are pure (no browser API dependency), some are not. The plan focuses on the pure ones first.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `npm install` | exit 0 |
| Build | `npm run build` | exit 0 |
| Test | `npx vitest run` | exit 0, all tests pass |
| Typecheck | `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |

## Scope

**In scope**:
- `package.json` — add vitest, `@testing-library/react`, `jsdom` devDependencies, add `"test"` script
- `tsconfig.app.json` — add vitest types to `types` array (or create `vitest.config.ts`)
- `vitest.config.ts` — create (inline with tsconfig)
- `src/lib/storage.test.ts` — create
- `src/lib/colors.test.ts` — create

**Out of scope**:
- `src/lib/icons.ts` tests — icon lookup is a plain object map, trivial
- `src/lib/utils.ts` tests — `cn()` is a one-liner wrapping twMerge
- `src/hooks/` tests — requires React testing library and mocking; follow-up work
- `src/components/` tests — requires React testing library; follow-up work
- Any changes to `.gitignore`, CI config, or deploy scripts

## Git workflow

- Branch: `advisor/001-test-infrastructure`
- Commit message style: `chore: add vitest and jsdom as dev dependencies` (matches existing `b60deaf chore: add app source, config, and docs`)
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Install vitest and jsdom

Run:
```
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

**Verify**: `npx vitest --version` → prints a version string (not "command not found").

### Step 2: Create vitest config

Create `vitest.config.ts` at repo root:

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
})
```

This tells vitest to use jsdom (needed for `localStorage` and `crypto` availability in later tests), and makes test helpers like `describe`/`it`/`expect` globally available.

**Verify**: `npx vitest run` → exits 0 (no tests yet, but prints "No test files matching ...").

### Step 3: Add test script to package.json

Add `"test": "vitest run"` to the `scripts` object in `package.json`, between `"preview"` and `"deploy"`:

```json
    "test": "vitest run",
```

**Verify**: `npm test` → runs vitest, exits 0.

### Step 4: Write characterization tests for `formatDateKey` and completion filtering

Create `src/lib/storage.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { formatDateKey, getCompletionsForDate, getCompletionsForHabitOnDate, createHabit, createCompletion } from "./storage"

describe("formatDateKey", () => {
  it("formats a date as YYYY-MM-DD", () => {
    const date = new Date(2026, 5, 25) // June 25, 2026
    expect(formatDateKey(date)).toBe("2026-06-25")
  })

  it("pads single-digit month and day", () => {
    const date = new Date(2026, 0, 5) // Jan 5, 2026
    expect(formatDateKey(date)).toBe("2026-01-05")
  })

  it("handles December date", () => {
    const date = new Date(2026, 11, 31)
    expect(formatDateKey(date)).toBe("2026-12-31")
  })
})

describe("getCompletionsForDate", () => {
  const completions = [
    { id: "1", habitId: "a", timestamp: "2026-06-25T10:00:00.000Z" },
    { id: "2", habitId: "b", timestamp: "2026-06-25T14:30:00.000Z" },
    { id: "3", habitId: "a", timestamp: "2026-06-24T23:00:00.000Z" },
  ]

  it("returns completions matching the date key", () => {
    const date = new Date(2026, 5, 25)
    const result = getCompletionsForDate(completions, date)
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.id)).toEqual(["1", "2"])
  })

  it("returns empty array when no completions match", () => {
    const date = new Date(2026, 6, 1)
    expect(getCompletionsForDate(completions, date)).toEqual([])
  })

  it("matches timestamp prefix exactly", () => {
    const date = new Date(2026, 5, 24)
    const result = getCompletionsForDate(completions, date)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("3")
  })
})

describe("getCompletionsForHabitOnDate", () => {
  const completions = [
    { id: "1", habitId: "a", timestamp: "2026-06-25T10:00:00.000Z" },
    { id: "2", habitId: "b", timestamp: "2026-06-25T14:30:00.000Z" },
    { id: "3", habitId: "a", timestamp: "2026-06-24T23:00:00.000Z" },
  ]

  it("returns completions for specific habit and date", () => {
    const date = new Date(2026, 5, 25)
    const result = getCompletionsForHabitOnDate(completions, "a", date)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })

  it("returns empty array for habit with no completions on date", () => {
    const date = new Date(2026, 5, 25)
    expect(getCompletionsForHabitOnDate(completions, "c", date)).toEqual([])
  })

  it("handles empty completions array", () => {
    const date = new Date(2026, 5, 25)
    expect(getCompletionsForHabitOnDate([], "a", date)).toEqual([])
  })
})

describe("createHabit", () => {
  it("creates a habit with given fields and a generated id", () => {
    const habit = createHabit("Drink water", "Droplets", "good", "oklch(0.7 0.12 225)", "I did it!")
    expect(habit.name).toBe("Drink water")
    expect(habit.icon).toBe("Droplets")
    expect(habit.type).toBe("good")
    expect(habit.color).toBe("oklch(0.7 0.12 225)")
    expect(habit.buttonLabel).toBe("I did it!")
    expect(habit.id).toBeDefined()
    expect(typeof habit.id).toBe("string")
    expect(habit.createdAt).toBeDefined()
    expect(() => new Date(habit.createdAt)).not.toThrow()
  })
})

describe("createCompletion", () => {
  it("creates a completion with a given habitId", () => {
    const completion = createCompletion("habit-1")
    expect(completion.habitId).toBe("habit-1")
    expect(completion.id).toBeDefined()
    expect(typeof completion.id).toBe("string")
    expect(completion.timestamp).toBeDefined()
    expect(() => new Date(completion.timestamp)).not.toThrow()
  })
})
```

Note: `createHabit` and `createCompletion` call `crypto.randomUUID()` internally, which vitest in jsdom environment provides as a mock. These tests characterize the current behavior as-is.

**Verify**: `npx vitest run src/lib/storage.test.ts` — all 12 tests pass.

### Step 5: Write characterization tests for `getRandomColor` and `getRandomLabel`

Create `src/lib/colors.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { getRandomColor, allColors } from "./colors"
import { getRandomLabel, allLabels } from "./button-labels"

describe("getRandomColor", () => {
  it("returns a color from the good palette for type 'good'", () => {
    const color = getRandomColor("good")
    expect(allColors.good.some((c) => c.value === color)).toBe(true)
  })

  it("returns a color from the bad palette for type 'bad'", () => {
    const color = getRandomColor("bad")
    expect(allColors.bad.some((c) => c.value === color)).toBe(true)
  })

  it("returns different colors across multiple calls (non-deterministic)", () => {
    const results = new Set(Array.from({ length: 50 }, () => getRandomColor("good")))
    expect(results.size).toBeGreaterThan(1)
  })
})

describe("getRandomLabel", () => {
  it("returns a label from the good list for type 'good'", () => {
    const label = getRandomLabel("good")
    expect(allLabels.good).toContain(label)
  })

  it("returns a label from the bad list for type 'bad'", () => {
    const label = getRandomLabel("bad")
    expect(allLabels.bad).toContain(label)
  })
})
```

**Verify**: `npx vitest run src/lib/colors.test.ts` — both test files pass.

### Step 6: Full test run

**Verify**: `npx vitest run` — all tests pass, exit 0. Build still works: `npm run build` — exit 0.

## Test plan

Tests are written inline in the steps above. They characterize existing behavior — they should all pass without modifying any source code. If any test fails, the source has drifted from what the plan expects (STOP condition).

## Done criteria

- [ ] `npx vitest run` exits 0 with at least 18 passing tests across `src/lib/storage.test.ts` and `src/lib/colors.test.ts`
- [ ] `npm run build` exits 0 after adding vitest config (tsc -b must not see vitest.config.ts as an error)
- [ ] `npm test` runs vitest (not "missing script" error)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Any existing test file already exists — plans may have been partially executed.
- `npx vitest run` fails with configuration errors after a reasonable fix attempt.
- A source-code test reveals unexpected behavior that differs from what's described above (the characterization tests should pass without source changes).
- Adding vitest devDependencies breaks the existing `npm run build` command.

## Maintenance notes

- When the `tsconfig.app.json` `types` array is expanded in the future, ensure vitest's types (`vitest/globals`) don't conflict with app types.
- These tests use `jsdom` environment. jsdom provides a mock `crypto.randomUUID` — if a real browser test is needed later, switch to `@vitest/browser` or playwright.
- vitest configuration lives in its own file (`vitest.config.ts`), separate from vite and tsconfig. This is intentional — vitest's Vite integration picks up `vite.config.ts` by default for transforms, but test-specific config stays here.