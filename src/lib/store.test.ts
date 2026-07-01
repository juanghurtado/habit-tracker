import { beforeEach, describe, expect, it } from "vitest";
import { loadHabits } from "../lib/storage.ts";
import { commit, getState, reset, subscribe } from "../lib/store.ts";
import type { Completion, Habit } from "../types.ts";

function createHabit(overrides?: Partial<Habit>): Habit {
  return {
    id: "1",
    name: "Test",
    icon: "Sun",
    type: "good",
    color: "oklch(0.7 0.12 225)",
    buttonLabel: "Done!",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    syncedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function createCompletion(overrides?: Partial<Completion>): Completion {
  return {
    id: "c1",
    habitId: "1",
    timestamp: "2026-01-01T12:00:00.000Z",
    syncedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

describe("store", () => {
  beforeEach(() => {
    reset();
  });

  it("getState returns empty state after reset", () => {
    const state = getState();
    expect(state.habits).toEqual([]);
    expect(state.completions).toEqual([]);
  });

  it("getState returns committed habits and completions", () => {
    const habit = createHabit();
    commit({ habits: [habit], completions: [] });
    const state = getState();
    expect(state.habits).toEqual([habit]);
    expect(state.completions).toEqual([]);
  });

  it("commit with partial transforms only updates the given collection", () => {
    const habit = createHabit();
    commit({ habits: [habit] });
    expect(getState().habits).toHaveLength(1);
    expect(getState().completions).toEqual([]);

    const completion = createCompletion();
    commit({ completions: [completion] });
    expect(getState().habits).toHaveLength(1);
    expect(getState().completions).toHaveLength(1);
  });

  it("commit persists to localStorage", () => {
    const habit = createHabit();
    commit({ habits: [habit] });
    const loaded = loadHabits();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("Test");
  });

  it("reset clears in-memory state and localStorage", () => {
    const habit = createHabit();
    commit({ habits: [habit] });
    reset();
    expect(getState().habits).toEqual([]);
    expect(loadHabits()).toEqual([]);
  });

  it("subscribe callback fires after commit", () => {
    let callCount = 0;
    const unsub = subscribe(() => {
      callCount++;
    });
    commit({ habits: [createHabit()] });
    expect(callCount).toBe(1);
    commit({ completions: [createCompletion()] });
    expect(callCount).toBe(2);
    unsub();
    commit({ habits: [] });
    expect(callCount).toBe(2);
  });

  it("getSnapshot filters out deleted habits", () => {
    const active = createHabit({ id: "1", name: "Active" });
    const deleted = createHabit({
      id: "2",
      name: "Deleted",
      deletedAt: "2026-01-02T00:00:00.000Z",
    });
    commit({ habits: [active, deleted] });
    const raw = getState();
    expect(raw.habits).toHaveLength(2);
  });

  it("getSnapshot filters out deleted completions", () => {
    const active = createCompletion({ id: "c1" });
    const deleted = createCompletion({
      id: "c2",
      deletedAt: "2026-01-02T00:00:00.000Z",
    });
    commit({ completions: [active, deleted] });
    const raw = getState();
    expect(raw.completions).toHaveLength(2);
  });
});
