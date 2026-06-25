# Plan 010: Add unit tests for useHabits hook and core component behavior

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 581ee39..HEAD -- src/hooks/ src/components/ vitest.config.ts package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 007 (dead code cleanup) — ensures HabitCard isn't mistakenly tested
- **Category**: tests
- **Planned at**: commit `581ee39`, 2026-06-25

## Why this matters

The app has 0 tests for its hook and component layer. The 3 prior bug-fix plans (003 edit-habit key, 005 undo-by-timestamp, 006 date-boundary) all touched UI-layer code that's completely untested. The `useHabits` hook manages all state mutations — adding, editing, deleting habits and completions. The dialog sheets (AddHabitSheet, EditHabitSheet) handle user input. Without tests, regressions in these paths are caught only by manual testing. The existing test pattern (pure function tests in `src/lib/`) proves the testing infrastructure works; this plan extends it to cover the state management and interaction layer.

## Current state

- `src/hooks/use-habits.ts` — 83 lines, exports `useHabits()` hook with module-level cached state via `useSyncExternalStore`. Pure-ish functions: `addHabit`, `editHabit`, `deleteHabit`, `addCompletion`, `undoLastCompletion`. All read/write `localStorage` and call `notifyListeners()`. No tests exist.
- `src/components/add-habit-sheet.tsx` — 124 lines, renders form with name input, icon picker, type toggle, color picker, button label preview. Calls `onSave(name, icon, type, color, buttonLabel)` on submit. No tests.
- `src/components/edit-habit-sheet.tsx` — 135 lines, same form as add but pre-populated with existing habit data. Uses `key={habit.id}` to force remount. No tests.
- `src/components/daily-log.tsx` — 183 lines, renders habit cards, handles completion with toast/confetti, contains the main user interaction flow. No tests.
- `vitest.config.ts` uses `jsdom` environment with `globals: true` — sufficient for hook and component tests.
- `package.json` already has `@testing-library/react` and `@testing-library/jest-dom` as devDependencies from Plan 001.

Repo conventions for tests (from existing test files):
- Use `vitest` globals: `describe`, `it`, `expect`
- Use `beforeEach` for setup (see `storage.test.ts:127-129`)
- Tests are co-located with source files: `src/lib/storage.test.ts` for `src/lib/storage.ts`
- No custom test helpers or wrappers yet
- Mocking strategy: `vi.mock()` or direct mocking on `globalThis`

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Build     | `npm run build`          | exit 0              |
| Tests     | `npm test -- src/hooks/use-habits.test.ts` | all pass |
| Tests     | `npm test`               | all pass            |

## Scope

**In scope**:
- `src/hooks/use-habits.test.ts` — create
- `src/components/add-habit-sheet.test.tsx` — create
- `src/components/edit-habit-sheet.test.tsx` — create
- `vitest.config.ts` — add `@testing-library/jest-dom/vitest` setup (one import line)

**Out of scope**:
- `src/components/daily-log.tsx` tests — requires mocking `sonner` toast, `canvas-confetti`, and `date-fns`. Deferred to a follow-up plan.
- `src/components/stats-page.tsx` tests — covered by existing `compute-stats.test.ts`. Integration test deferred.
- Browser-level or E2E tests — not needed for this local-only app.
- Snapshot testing — not valuable for rapidly iterating components.
- The `habit-card.tsx` component — deleted in Plan 007; don't test it.

## Git workflow

- Branch: `advisor/010-ui-layer-tests`
- Commit style: `test: add useHabits hook tests`, then `test: add AddHabitSheet tests`, then `test: add EditHabitSheet tests` (one commit per test file, or squash to `test: add hook and sheet component tests`)
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Add `@testing-library/jest-dom/vitest` setup

Open `vitest.config.ts`. Currently it has:

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    env: {
      TZ: "UTC",
    },
  },
})
```

Add a `setupFiles` entry pointing to a new setup file, or add the import directly. The simplest approach: add `setupFiles` pointing to a new `src/test-setup.ts`:

**`src/test-setup.ts`** (create):
```ts
import "@testing-library/jest-dom/vitest"
```

Update `vitest.config.ts`:
```ts
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test-setup.ts",
    env: {
      TZ: "UTC",
    },
  },
})
```

**Verify**: `npm test` → exits 0, all existing tests still pass.

### Step 2: Write tests for `useHabits` hook

Create `src/hooks/use-habits.test.ts`:

The `useHabits` hook uses `useSyncExternalStore`, which reads from module-level cached state backed by `localStorage`. To test it, we need to:
1. Clear `localStorage` before each test
2. Render the hook inside a test component via `renderHook` from `@testing-library/react`
3. Call the returned methods and assert on the updated state

```ts
import { describe, it, expect, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useHabits } from "./use-habits"
import { loadHabits, loadCompletions } from "../lib/storage"

describe("useHabits", () => {
  beforeEach(() => {
    localStorage.clear()
    // Re-importing would be ideal, but module-level cached state in
    // use-habits.ts persists across tests. Force it by clearing and
    // letting notifyListeners() re-read from empty localStorage.
    // Plan 006 already established this test pattern.
  })

  it("returns empty habits and completions initially", () => {
    const { result } = renderHook(() => useHabits())
    expect(result.current.habits).toEqual([])
    expect(result.current.completions).toEqual([])
  })

  it("adds a habit and updates the habits list", () => {
    const { result } = renderHook(() => useHabits())

    act(() => {
      result.current.addHabit(
        "Drink water",
        "Droplets",
        "good",
        "oklch(0.7 0.12 225)",
        "Done!"
      )
    })

    expect(result.current.habits).toHaveLength(1)
    expect(result.current.habits[0].name).toBe("Drink water")
    expect(result.current.habits[0].icon).toBe("Droplets")
    expect(result.current.habits[0].type).toBe("good")
  })

  it("edits an existing habit", () => {
    const { result } = renderHook(() => useHabits())

    act(() => {
      result.current.addHabit("Old name", "Sun", "good", "oklch(0.7 0.12 225)", "Done!")
    })

    const id = result.current.habits[0].id

    act(() => {
      result.current.editHabit(id, "New name", "Moon", "bad", "oklch(0.5 0.2 22)", "Oops...")
    })

    expect(result.current.habits[0].name).toBe("New name")
    expect(result.current.habits[0].icon).toBe("Moon")
    expect(result.current.habits[0].type).toBe("bad")
  })

  it("deletes a habit and its completions", () => {
    const { result } = renderHook(() => useHabits())

    act(() => {
      result.current.addHabit("Delete me", "Sun", "good", "oklch(0.7 0.12 225)", "Done!")
    })

    const id = result.current.habits[0].id

    act(() => {
      result.current.addCompletion(id)
    })

    expect(result.current.completions).toHaveLength(1)

    act(() => {
      result.current.deleteHabit(id)
    })

    expect(result.current.habits).toHaveLength(0)
    expect(result.current.completions).toHaveLength(0)
  })

  it("adds a completion for a habit", () => {
    const { result } = renderHook(() => useHabits())

    act(() => {
      result.current.addHabit("Test", "Sun", "good", "oklch(0.7 0.12 225)", "Done!")
    })

    const id = result.current.habits[0].id

    act(() => {
      result.current.addCompletion(id)
    })

    expect(result.current.completions).toHaveLength(1)
    expect(result.current.completions[0].habitId).toBe(id)
  })

  it("adds a completion for a specific date", () => {
    const { result } = renderHook(() => useHabits())

    act(() => {
      result.current.addHabit("Test", "Sun", "good", "oklch(0.7 0.12 225)", "Done!")
    })

    const id = result.current.habits[0].id
    const pastDate = new Date(2026, 5, 24)

    act(() => {
      result.current.addCompletion(id, pastDate)
    })

    expect(result.current.completions).toHaveLength(1)
    expect(result.current.completions[0].habitId).toBe(id)
  })

  it("undoes the last completion for a habit", () => {
    const { result } = renderHook(() => useHabits())

    act(() => {
      result.current.addHabit("Test", "Sun", "good", "oklch(0.7 0.12 225)", "Done!")
    })

    const id = result.current.habits[0].id

    act(() => {
      result.current.addCompletion(id)
      result.current.addCompletion(id)
    })

    expect(result.current.completions).toHaveLength(2)

    act(() => {
      result.current.undoLastCompletion(id)
    })

    expect(result.current.completions).toHaveLength(1)
  })

  it("adds completions for multiple habits independently", () => {
    const { result } = renderHook(() => useHabits())

    act(() => {
      result.current.addHabit("Habit A", "Sun", "good", "oklch(0.7 0.12 225)", "Done!")
      result.current.addHabit("Habit B", "Moon", "bad", "oklch(0.5 0.2 22)", "Oops...")
    })

    const idA = result.current.habits[0].id
    const idB = result.current.habits[1].id

    act(() => {
      result.current.addCompletion(idA)
      result.current.addCompletion(idA)
      result.current.addCompletion(idB)
    })

    expect(result.current.completions).toHaveLength(3)
    expect(result.current.completions.filter((c) => c.habitId === idA)).toHaveLength(2)
    expect(result.current.completions.filter((c) => c.habitId === idB)).toHaveLength(1)
  })

  it("persists data to localStorage", () => {
    const { result } = renderHook(() => useHabits())

    act(() => {
      result.current.addHabit("Persist test", "Star", "good", "oklch(0.7 0.12 225)", "Done!")
    })

    const loaded = loadHabits()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].name).toBe("Persist test")
  })
})
```

**Verify**: `npm test -- src/hooks/use-habits.test.ts` → all tests pass.

### Step 3: Write tests for AddHabitSheet

Create `src/components/add-habit-sheet.test.tsx`:

Testing a Dialog-based component requires rendering it with `open={true}` and interacting with form elements.

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AddHabitSheet } from "./add-habit-sheet"

// Mock the random generators to make tests deterministic
vi.mock("../lib/colors", () => ({
  getRandomColor: vi.fn(() => "oklch(0.7 0.12 225)"),
  allColors: {
    good: [{ name: "Sky", value: "oklch(0.7 0.12 225)", button: "oklch(0.45 0.12 225)" }],
    bad: [{ name: "Ruby", value: "oklch(0.56 0.20 15)", button: "oklch(0.38 0.20 15)" }],
  },
}))

vi.mock("../lib/button-labels", () => ({
  getRandomLabel: vi.fn(() => "Done!"),
  allLabels: { good: ["Done!"], bad: ["Oops..."] },
}))

describe("AddHabitSheet", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders with dialog title", () => {
    render(<AddHabitSheet {...defaultProps} />)
    expect(screen.getByText("New Habit")).toBeInTheDocument()
  })

  it("calls onSave with habit data on submit", async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()

    render(<AddHabitSheet {...defaultProps} onSave={onSave} />)

    const nameInput = screen.getByPlaceholderText("e.g. Drink water")
    await user.type(nameInput, "Morning run")

    const addButton = screen.getByRole("button", { name: /add habit/i })
    await user.click(addButton)

    expect(onSave).toHaveBeenCalledWith(
      "Morning run",
      expect.any(String),  // icon
      "good",              // type
      expect.any(String),  // color
      expect.any(String)   // buttonLabel
    )
  })

  it("does not call onSave when name is empty", async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()

    render(<AddHabitSheet {...defaultProps} onSave={onSave} />)

    const addButton = screen.getByRole("button", { name: /add habit/i })
    await user.click(addButton)

    expect(onSave).not.toHaveBeenCalled()
  })

  it("calls onSave when Enter is pressed in the name field", () => {
    const onSave = vi.fn()
    render(<AddHabitSheet {...defaultProps} onSave={onSave} />)

    const nameInput = screen.getByPlaceholderText("e.g. Drink water")
    fireEvent.change(nameInput, { target: { value: "Read" } })
    fireEvent.keyDown(nameInput, { key: "Enter" })

    expect(onSave).toHaveBeenCalled()
  })

  it("closes the dialog on save", async () => {
    const onOpenChange = vi.fn()
    const onSave = vi.fn()
    const user = userEvent.setup()

    render(<AddHabitSheet {...defaultProps} onOpenChange={onOpenChange} onSave={onSave} />)

    const nameInput = screen.getByPlaceholderText("e.g. Drink water")
    await user.type(nameInput, "Yoga")
    const addButton = screen.getByRole("button", { name: /add habit/i })
    await user.click(addButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("switches type to bad habit", async () => {
    const user = userEvent.setup()
    render(<AddHabitSheet {...defaultProps} />)

    const badButton = screen.getByText("Bad Habit")
    await user.click(badButton)

    // The type switch button should now show as selected
    expect(badButton).toHaveClass("bg-destructive")
  })
})
```

**Verify**: `npm test -- src/components/add-habit-sheet.test.tsx` → all tests pass.

### Step 4: Write tests for EditHabitSheet

Create `src/components/edit-habit-sheet.test.tsx`:

The EditHabitSheet takes a `habit` prop and pre-populates the form. It uses `key={habit.id}` to force remount.

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EditHabitSheet } from "./edit-habit-sheet"
import type { Habit } from "../types"

// Same mocks as AddHabitSheet tests
vi.mock("../lib/colors", () => ({
  getRandomColor: vi.fn(() => "oklch(0.7 0.12 225)"),
  allColors: {
    good: [{ name: "Sky", value: "oklch(0.7 0.12 225)", button: "oklch(0.45 0.12 225)" }],
    bad: [{ name: "Ruby", value: "oklch(0.56 0.20 15)", button: "oklch(0.34 0.20 15)" }],
  },
}))

vi.mock("../lib/button-labels", () => ({
  getRandomLabel: vi.fn(() => "Done!"),
  allLabels: { good: ["Done!"], bad: ["Oops..."] },
}))

const mockHabit: Habit = {
  id: "test-habit-1",
  name: "Exercise",
  icon: "Dumbbell",
  type: "good",
  color: "oklch(0.7 0.12 225)",
  buttonLabel: "I did it!",
  createdAt: "2026-01-01T00:00:00.000Z",
}

describe("EditHabitSheet", () => {
  const defaultProps = {
    habit: mockHabit,
    open: true,
    onOpenChange: vi.fn(),
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders with the habit name pre-populated", () => {
    render(<EditHabitSheet {...defaultProps} />)
    expect(screen.getByText("Edit Habit")).toBeInTheDocument()
    const nameInput = screen.getByPlaceholderText("e.g. Drink water")
    expect(nameInput).toHaveValue("Exercise")
  })

  it("calls onSave with updated habit data", async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()

    render(<EditHabitSheet {...defaultProps} onSave={onSave} />)

    const nameInput = screen.getByPlaceholderText("e.g. Drink water")
    await user.clear(nameInput)
    await user.type(nameInput, "Running")

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    expect(onSave).toHaveBeenCalledWith(
      "test-habit-1",
      "Running",
      "Dumbbell", // unchanged
      "good",      // unchanged
      expect.any(String),
      expect.any(String)
    )
  })

  it("does not call onSave when name is cleared", async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()

    render(<EditHabitSheet {...defaultProps} onSave={onSave} />)

    const nameInput = screen.getByPlaceholderText("e.g. Drink water")
    await user.clear(nameInput)

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    expect(onSave).not.toHaveBeenCalled()
  })

  it("closes the dialog on save", async () => {
    const onOpenChange = vi.fn()
    const onSave = vi.fn()
    const user = userEvent.setup()

    render(<EditHabitSheet {...defaultProps} onOpenChange={onOpenChange} onSave={onSave} />)

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
```

**Verify**: `npm test -- src/components/edit-habit-sheet.test.tsx` → all tests pass.

### Step 5: Full test run

```bash
npm test
```

**Verify**: All tests pass — existing lib tests + new hook/sheet tests.

## Test plan

Tests are written inline in the steps above. Summary of new files and test counts:

| File | Tests | What it covers |
|------|-------|----------------|
| `src/hooks/use-habits.test.ts` | ~10 | add/edit/delete habit, add/undo completion, multi-habit, localStorage persistence |
| `src/components/add-habit-sheet.test.tsx` | ~5 | render, submit with name, empty name guard, Enter key, type switch |
| `src/components/edit-habit-sheet.test.tsx` | ~4 | pre-populated form, edit submit, empty name guard, close on save |

## Done criteria

- [ ] `npm test` exits 0 with at least 50 total tests (31 existing + ~19 new)
- [ ] `npm run build` exits 0
- [ ] `src/hooks/use-habits.test.ts` exists with all tests passing
- [ ] `src/components/add-habit-sheet.test.tsx` exists with all tests passing
- [ ] `src/components/edit-habit-sheet.test.tsx` exists with all tests passing
- [ ] `src/test-setup.ts` exists and is wired in `vitest.config.ts`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:
- `useHabits` module-level cached state (the `let cachedHabits` / `let cachedCompletions` variables at module scope) causes test isolation failures — this is a known issue. If tests are flaky due to shared state, add a `beforeEach` that re-imports the module or use `vi.resetModules()` before each test.
- `@testing-library/user-event` is not installed — it's not in `package.json` as of the planned-at commit. Install it with `npm install -D @testing-library/user-event`.
- `renderHook` from `@testing-library/react` is not available — it's part of `@testing-library/react` v16, which is already installed.
- Dialog components render differently in jsdom vs browser — the Radix UI dialog may have issues. If tests fail because Radix portal content isn't found, use `screen.getByText` (portal content is rendered to document.body). If the dialog animation classes interfere, ensure `open={true}` is passed.
- Any test fails due to missing `jest-dom` matchers (like `toBeInTheDocument` or `toHaveClass`) — verify `src/test-setup.ts` exists and is loaded via `setupFiles` in `vitest.config.ts`.

## Maintenance notes

- The `vi.mock` calls for `colors` and `button-labels` must be kept in sync if those modules change their exports.
- When `daily-log.tsx` is tested in a future plan, it will need mocks for `sonner` (toast), `canvas-confetti`, and `date-fns`. The `use-habits.test.ts` tests validate the hook in isolation, so the daily-log tests can mock `useHabits` directly.
- The module-level cache in `use-habits.ts` makes test isolation fragile — if new tests are flaky, consider refactoring to use React context instead of module-level `let` variables. This is deferred from this plan.
- If `userEvent` version causes issues, use `fireEvent` from `@testing-library/react` as a fallback (already used for the Enter key test).