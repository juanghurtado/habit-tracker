import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Completion, Habit } from "../types.ts";
import { mergeCompletions, mergeHabits, syncAll } from "./sync.ts";

function habit(overrides: Partial<Habit> & { id: string }): Habit {
  return {
    name: "Test",
    icon: "Star",
    type: "good",
    color: "oklch(0.7 0.12 225)",
    buttonLabel: "Go!",
    createdAt: "2026-01-01T00:00:00.000Z",
    syncedAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

function completion(
  overrides: Partial<Completion> & { id: string }
): Completion {
  return {
    habitId: "h1",
    timestamp: "2026-01-01T12:00:00.000Z",
    syncedAt: null,
    ...overrides,
  };
}

describe("mergeHabits", () => {
  it("returns merged array when IDs don't overlap", () => {
    const local = [habit({ id: "h1" })];
    const remote = [habit({ id: "h2" })];
    const result = mergeHabits(local, remote);
    expect(result).toHaveLength(2);
    expect(result.find((h) => h.id === "h1")).toBeDefined();
    expect(result.find((h) => h.id === "h2")).toBeDefined();
  });

  it("later updatedAt wins when IDs conflict", () => {
    const local = [
      habit({ id: "h1", name: "Local", updatedAt: "2026-01-02T00:00:00.000Z" }),
    ];
    const remote = [
      habit({
        id: "h1",
        name: "Remote",
        updatedAt: "2026-01-03T00:00:00.000Z",
      }),
    ];
    const result = mergeHabits(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Remote");
  });

  it("local wins when local updatedAt is later", () => {
    const local = [
      habit({ id: "h1", name: "Local", updatedAt: "2026-01-03T00:00:00.000Z" }),
    ];
    const remote = [
      habit({
        id: "h1",
        name: "Remote",
        updatedAt: "2026-01-02T00:00:00.000Z",
      }),
    ];
    const result = mergeHabits(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Local");
  });

  it("excludes soft-deleted habits from result", () => {
    const local = [
      habit({
        id: "h1",
        deletedAt: "2026-01-03T00:00:00.000Z",
        updatedAt: "2026-01-03T00:00:00.000Z",
      }),
    ];
    const remote = [
      habit({
        id: "h1",
        name: "Remote",
        updatedAt: "2026-01-02T00:00:00.000Z",
      }),
    ];
    const result = mergeHabits(local, remote);
    expect(result).toHaveLength(0);
  });

  it("excludes remote-only deleted habits", () => {
    const local: Habit[] = [];
    const remote = [habit({ id: "h1", deletedAt: "2026-01-03T00:00:00.000Z" })];
    const result = mergeHabits(local, remote);
    expect(result).toHaveLength(0);
  });

  it("keeps local habits not present in remote", () => {
    const local = [habit({ id: "h1" }), habit({ id: "h2" })];
    const remote = [habit({ id: "h2", name: "Remote" })];
    const result = mergeHabits(local, remote);
    expect(result).toHaveLength(2);
    expect(result.find((h) => h.id === "h1")?.name).toBe("Test");
  });
});

describe("mergeCompletions", () => {
  it("appends remote completions with new IDs", () => {
    const local = [completion({ id: "c1" })];
    const remote = [completion({ id: "c2" })];
    const result = mergeCompletions(local, remote);
    expect(result).toHaveLength(2);
    expect(result.find((c) => c.id === "c1")).toBeDefined();
    expect(result.find((c) => c.id === "c2")).toBeDefined();
  });

  it("skips remote completions whose IDs already exist locally", () => {
    const local = [
      completion({ id: "c1", timestamp: "2026-01-01T12:00:00.000Z" }),
    ];
    const remote = [
      completion({ id: "c1", timestamp: "2026-01-02T12:00:00.000Z" }),
    ];
    const result = mergeCompletions(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe("2026-01-01T12:00:00.000Z");
  });

  it("preserves all local completions", () => {
    const local = [completion({ id: "c1" }), completion({ id: "c2" })];
    const remote: Completion[] = [];
    const result = mergeCompletions(local, remote);
    expect(result).toHaveLength(2);
  });

  it("handles empty arrays", () => {
    expect(mergeCompletions([], [])).toEqual([]);
    expect(mergeCompletions([completion({ id: "c1" })], [])).toHaveLength(1);
    expect(mergeCompletions([], [completion({ id: "c1" })])).toHaveLength(1);
  });
});

describe("syncAll", () => {
  function createMockSupabase(options?: {
    remoteHabits?: Record<string, unknown>[];
    remoteCompletions?: Record<string, unknown>[];
  }) {
    const { remoteHabits = [], remoteCompletions = [] } = options ?? {};
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockHabitsEq = vi.fn().mockResolvedValue({
      data: remoteHabits,
      error: null,
    });
    const mockCompletionsEq = vi.fn().mockResolvedValue({
      data: remoteCompletions,
      error: null,
    });
    const mockSelectHabits = vi.fn().mockReturnValue({ eq: mockHabitsEq });
    const mockSelectCompletions = vi.fn().mockReturnValue({
      eq: mockCompletionsEq,
    });
    let habitsSelectCalled = false;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "habits") {
        if (!habitsSelectCalled) {
          habitsSelectCalled = true;
          return { upsert: mockUpsert, select: mockSelectHabits };
        }
        return { upsert: mockUpsert, select: mockSelectHabits };
      }
      if (table === "completions") {
        return { upsert: mockUpsert, select: mockSelectCompletions };
      }
      return { upsert: mockUpsert, select: mockSelectHabits };
    });

    return {
      supabase: { from: mockFrom } as unknown as SupabaseClient,
      mockUpsert,
      mockFrom,
    };
  }

  it("pushes unsynced habits and completions", async () => {
    const habits = [habit({ id: "h1", syncedAt: null })];
    const completions = [completion({ id: "c1", syncedAt: null })];
    const { supabase, mockUpsert, mockFrom } = createMockSupabase();
    const result = await syncAll({
      habits,
      completions,
      supabase,
      userId: "uid",
    });
    expect(mockFrom).toHaveBeenCalledWith("habits");
    expect(mockFrom).toHaveBeenCalledWith("completions");
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(result.habits[0].syncedAt).not.toBeNull();
    expect(result.completions[0].syncedAt).not.toBeNull();
  });

  it("does not push already synced records", async () => {
    const habits = [habit({ id: "h1", syncedAt: "2026-01-01T00:00:00.000Z" })];
    const completions = [
      completion({ id: "c1", syncedAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const { supabase, mockUpsert } = createMockSupabase();
    await syncAll({
      habits,
      completions,
      supabase,
      userId: "uid",
    });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("pulls remote records and merges them", async () => {
    const localHabits = [habit({ id: "h1", name: "Local" })];
    const localCompletions: Completion[] = [];
    const remoteHabits = [
      {
        id: "h2",
        name: "Remote",
        icon: "Star",
        type: "good",
        color: "oklch(0.7 0.12 225)",
        button_label: "Go!",
        created_at: "2026-01-01T00:00:00.000Z",
        synced_at: null,
        updated_at: "2026-01-02T00:00:00.000Z",
        deleted_at: null,
        user_id: "uid",
      },
    ];
    const remoteCompletions = [
      {
        id: "c2",
        habit_id: "h2",
        timestamp: "2026-01-02T12:00:00.000Z",
        synced_at: null,
        user_id: "uid",
      },
    ];
    const { supabase } = createMockSupabase({
      remoteHabits,
      remoteCompletions,
    });
    const result = await syncAll({
      habits: localHabits,
      completions: localCompletions,
      supabase,
      userId: "uid",
    });
    expect(result.habits).toHaveLength(2);
    expect(result.completions).toHaveLength(1);
    expect(result.completions[0].id).toBe("c2");
  });

  it("is a no-op when no user provided (handled by caller)", async () => {
    // syncAll itself doesn't check the user; the caller does
    // This test ensures the function handles empty inputs gracefully
    const { supabase } = createMockSupabase();
    const result = await syncAll({
      habits: [],
      completions: [],
      supabase,
      userId: "uid",
    });
    expect(result.habits).toEqual([]);
    expect(result.completions).toEqual([]);
  });

  it("sets syncedAt on pushed records in returned state", async () => {
    const habits = [habit({ id: "h1" })];
    const { supabase } = createMockSupabase();
    const result = await syncAll({
      habits,
      completions: [],
      supabase,
      userId: "uid",
    });
    expect(result.habits[0].syncedAt).not.toBeNull();
    expect(typeof result.habits[0].syncedAt).toBe("string");
  });
});
