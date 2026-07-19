# Plan 027: Add unit tests for core CRUD module

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9d536b0..HEAD -- src/lib/crud.ts src/lib/storage.ts src/lib/store.ts src/lib/sync-scheduler.ts`
> If any of these files have changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW — adding tests only, modifying no production code
- **Depends on**: plans/026-fix-syncAll-marking-order.md (the characterization test confirms the current broken sync ordering before any fix changes it)
- **Category**: tests
- **Planned at**: commit `9d536b0`, 2026-07-09
- **Issue**: —

## Why this matters

`src/lib/crud.ts` (92 lines) is the core mutation path for the entire app. Every user action that modifies data (`addHabit`, `editHabit`, `deleteHabit`, `addCompletion`, `undoLastCompletion`) runs through this module. It currently has **zero test coverage**.

The `undoLastCompletion` function (lines 74-91) contains the most complex logic: it filters non-deleted completions for a habit, finds the most recent by timestamp via `reduce`, and returns a new completions array marking a single completion deleted. A regression in this `reduce` comparison or the conditional early-return would silently corrupt user data.

Additionally, `commitAndSync` (lines 6-15) is an internal helper that chains `commit()` → `schedule()`. Its early-return on `transforms` being `undefined` (line 10-12) means no-op mutations are silently skipped — a correctness property that should be tested.

## Current state

**`src/lib/crud.ts`**:
```ts
function commitAndSync(
  transform: (state: StoreState) => Transforms | undefined
): void {
  const transforms = transform(getState());
  if (!transforms) {
    return;
  }
  commit(transforms);
  schedule();
}

export function addHabit(
  name: string,
  icon: string,
  type: "good" | "bad",
  color: string,
  buttonLabel: string
): void {
  commitAndSync(({ habits }) => ({
    habits: [...habits, createHabit(name, icon, type, color, buttonLabel)],
  }));
}

export function editHabit(
  id: string,
  name: string,
  icon: string,
  type: "good" | "bad",
  color: string,
  buttonLabel: string
): void {
  const now = new Date().toISOString();
  commitAndSync(({ habits }) => ({
    habits: habits.map((h) =>
      h.id === id
        ? {
            ...h,
            name,
            icon,
            type,
            color,
            buttonLabel,
            updatedAt: now,
            syncedAt: null,
          }
        : h
    ),
  }));
}

export function deleteHabit(id: string): void {
  const now = new Date().toISOString();
  commitAndSync(({ habits, completions }) => ({
    habits: habits.map((h) =>
      h.id === id ? { ...h, deletedAt: now, updatedAt: now, syncedAt: null } : h
    ),
    completions: completions.map((c) =>
      c.habitId === id ? { ...c, deletedAt: now, syncedAt: null } : c
    ),
  }));
}

export function addCompletion(habitId: string, date?: Date): void {
  commitAndSync(({ completions }) => ({
    completions: [...completions, createCompletion(habitId, date)],
  }));
}

export function undoLastCompletion(habitId: string): void {
  commitAndSync(({ completions }) => {
    const habitComps = completions.filter(
      (c) => c.habitId === habitId && c.deletedAt === null
    );
    if (habitComps.length === 0) {
      return;
    }
    const now = new Date().toISOString();
    const targetId = habitComps.reduce((a, b) =>
      a.timestamp > b.timestamp ? a : b
    ).id;
    return {
      completions: completions.map((c) =>
        c.id === targetId ? { ...c, deletedAt: now, syncedAt: null } : c
      ),
    };
  });
}
```

**`src/lib/storage.ts`** (key functions):
```ts
export function createHabit(name: string, icon: string, type: "good" | "bad", color: string, buttonLabel: string): Habit
export function createCompletion(habitId: string, date?: Date): Completion
```

**`src/lib/store.ts`** (key functions):
```ts
export function commit(transforms: Transforms): void
export function getState(): StoreState
```

**`src/lib/sync-scheduler.ts`** (key function):
```ts
export function schedule(): void
```

The tests need to mock `schedule()` (from sync-scheduler) and verify the store state after each CRUD operation.

**Testing pattern to follow**: `src/lib/store.test.ts` — uses direct store operations (`commit`, `getState`), then verifies state. The CRUD tests should follow the same pattern: import from `store.ts`, call CRUD functions, verify `getState()` reflects the changes.

## Commands you will need

| Purpose   | Command                              | Expected on success |
|-----------|--------------------------------------|---------------------|
| Typecheck | `tsc --noEmit`                       | exit 0, no errors   |
| Tests     | `npm run test`                       | all tests pass      |
| Lint      | `npm run lint`                       | exit 0              |
| Build     | `npm run build`                      | exit 0              |

## Scope

**In scope** (the only file to modify):
- `src/lib/crud.test.ts` — create: unit tests for all CRUD functions

**Out of scope** (do NOT touch):
- Any production file
- `src/hooks/use-habits.test.tsx` — the hook wraps CRUD; test CRUD directly

## Git workflow

- Branch: `advisor/027-crud-tests`
- Commit: `test: add unit tests for core CRUD module`
- Follow conventional commits as in `git log`

## Steps

### Step 1: Create `src/lib/crud.test.ts`

Create the test file with tests for all CRUD functions. The tests mock `schedule()` to avoid triggering sync, then verify store state after each CRUD call.

```ts
import { describe, expect, it, vi } from "vitest";
import { addHabit, editHabit, deleteHabit, addCompletion, undoLastCompletion } from "./crud.ts";
import { getState } from "./store.ts";
import { schedule } from "./sync-scheduler.ts";
import type { Habit, Completion } from "../types.ts";

vi.mock("./sync-scheduler.ts", () => ({
  schedule: vi.fn(),
}));

const mockSchedule = vi.mocked(schedule);

beforeEach(() => {
  vi.clearAllMocks();
});

function createHabitData(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "habit-1",
    name: "Drink water",
    icon: "Water",
    type: "good",
    color: "oklch(0.7 0.15 220)",
    buttonLabel: "Done!",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    syncedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function createCompletionData(overrides: Partial<Completion> = {}): Completion {
  return {
    id: "comp-1",
    habitId: "habit-1",
    timestamp: "2026-01-01T10:00:00.000Z",
    syncedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

describe("addHabit", () => {
  it("adds a habit to the store and triggers schedule", () => {
    addHabit("New Habit", "Heart", "good", "oklch(0.7 0.15 220)", "Done!");
    const state = getState();
    expect(state.habits.length).toBeGreaterThan(0);
    const lastHabit = state.habits[state.habits.length - 1];
    expect(lastHabit.name).toBe("New Habit");
    expect(lastHabit.icon).toBe("Heart");
    expect(lastHabit.type).toBe("good");
    expect(mockSchedule).toHaveBeenCalledOnce();
  });
});

describe("editHabit", () => {
  it("updates an existing habit and marks it unsynced", () => {
    const habit = createHabitData();
    addHabit(habit.name, habit.icon, habit.type, habit.color, habit.buttonLabel);

    const habitsBefore = getState().habits;
    editHabit(habitsBefore[habitsBefore.length - 1].id, "Updated Name", "Trophy", "bad", "oklch(0.6 0.2 30)", "Oops...");

    const updated = getState().habits.find((h) => h.id === habitsBefore[habitsBefore.length - 1].id);
    expect(updated?.name).toBe("Updated Name");
    expect(updated?.type).toBe("bad");
    expect(updated?.syncedAt).toBeNull(); // Should be marked unsynced
    expect(updated?.updatedAt).toBeDefined();
  });
});

describe("deleteHabit", () => {
  it("soft-deletes a habit and its completions", () => {
    const habit = createHabitData();
    addHabit(habit.name, habit.icon, habit.type, habit.color, habit.buttonLabel);

    const addComp = (overrides: Partial<Completion> = {}) => {
      addCompletion("habit-1", new Date("2026-01-01"));
    };
    addComp();

    const habitsBefore = getState().habits;
    const habitId = habitsBefore[habitsBefore.length - 1].id;
    deleteHabit(habitId);

    const deletedHabit = getState().habits.find((h) => h.id === habitId);
    expect(deletedHabit?.deletedAt).not.toBeNull();
    expect(deletedHabit?.syncedAt).toBeNull();
  });
});

describe("addCompletion", () => {
  it("adds a completion for a habit and triggers schedule", () => {
    const habit = createHabitData();
    addHabit(habit.name, habit.icon, habit.type, habit.color, habit.buttonLabel);

    addCompletion("habit-1", new Date("2026-01-01T10:00:00.000Z"));

    const state = getState();
    expect(state.completions.length).toBeGreaterThan(0);
    const lastComp = state.completions[state.completions.length - 1];
    expect(lastComp.habitId).toBe("habit-1");
    expect(mockSchedule).toHaveBeenCalledOnce();
  });
});

describe("undoLastCompletion", () => {
  it("marks the most recent completion as deleted", () => {
    const habit = createHabitData();
    addHabit(habit.name, habit.icon, habit.type, habit.color, habit.buttonLabel);

    addCompletion("habit-1", new Date("2026-01-01T10:00:00.000Z"));
    addCompletion("habit-1", new Date("2026-01-01T12:00:00.000Z"));

    const stateBefore = getState();
    const completionsBefore = stateBefore.completions;
    const latestId = completionsBefore[completionsBefore.length - 1].id;

    undoLastCompletion("habit-1");

    const undone = stateBefore.completions.find((c) => c.id === latestId);
    expect(undone?.deletedAt).not.toBeNull();
    expect(undone?.syncedAt).toBeNull();
  });

  it("does nothing when there are no completions", () => {
    undoLastCompletion("non-existent-habit");
    // Should not throw
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("ignores already-deleted completions when finding the latest", () => {
    const habit = createHabitData();
    addHabit(habit.name, habit.icon, habit.type, habit.color, habit.buttonLabel);

    addCompletion("habit-1", new Date("2026-01-01T10:00:00.000Z"));
    addCompletion("habit-1", new Date("2026-01-01T12:00:00.000Z"));

    const stateBefore = getState();
    const latestId = stateBefore.completions[stateBefore.completions.length - 1].id;

    // Manually delete the latest completion
    deleteHabit("habit-1"); // This marks all completions as deleted

    // Undo should find no non-deleted completions and do nothing
    undoLastCompletion("habit-1");
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});
```

Verify:
```bash
npm run test -- crud
```
Expect: all tests pass.

### Step 2: Run full verification

```bash
npm run test
npm run lint
```
Expect: all tests pass, no lint errors.

## Test plan

**New tests to write** (in `src/lib/crud.test.ts`):

1. **addHabit** (1 test):
   - Habit is added to store with correct properties, schedule() is called

2. **editHabit** (1 test):
   - Habit is updated, marked unsynced (syncedAt=null), updatedAt is set

3. **deleteHabit** (1 test):
   - Habit is soft-deleted (deletedAt set), syncedAt marked null

4. **addCompletion** (1 test):
   - Completion is added for the habit, schedule() is called

5. **undoLastCompletion** (3 tests):
   - Marks the most recent (by timestamp) non-deleted completion as deleted
   - Does nothing when there are no completions
   - Ignores already-deleted completions when finding the latest

**Existing test to use as structural pattern**: `src/lib/store.test.ts` — uses direct store operations and `getState()` to verify state.

**Verification**: `npm run test -- crud` → 7 new tests pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `tsc --noEmit` exits 0
- [ ] `npm run test` exits 0; 7 new tests exist and pass
- [ ] `npm run lint` exits 0
- [ ] `src/lib/crud.test.ts` exists and is non-empty
- [ ] No files outside `src/lib/crud.test.ts` are modified

## STOP conditions

Stop and report back (do not improvise) if:

- The CRUD module structure at `src/lib/crud.ts:1-92` doesn't match the excerpts (codebase has drifted).
- The `getState()` function returns different shape than expected (e.g., habits/completions have different property names).
- The `schedule()` mock doesn't work as expected — try `vi.mock` with `__esModule: true` if the module is ESM.

## Maintenance notes

- The tests directly exercise CRUD functions (not through the hook), which is the right level of testing for this module.
- If new CRUD operations are added (e.g., `reorderHabits`), they should be added to this test file.
- The `undoLastCompletion` tests are the most critical — they verify the timestamp-based ordering logic that was previously buggy (plan 005).
