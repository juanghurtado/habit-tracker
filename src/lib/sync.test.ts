import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Completion, Habit } from "../types.ts";
import {
  mergeCompletions,
  mergeHabits,
  runSync,
  validateCompletionRecord,
  validateHabitRecord,
} from "./sync.ts";

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
    deletedAt: null,
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

  it("skips remote completions with deletedAt set", () => {
    const local: Completion[] = [];
    const remote = [
      completion({ id: "c1", deletedAt: "2026-01-03T12:00:00.000Z" }),
    ];
    const result = mergeCompletions(local, remote);
    expect(result).toHaveLength(0);
  });

  it("keeps local completion marked as deleted (local wins by id)", () => {
    const local = [
      completion({
        id: "c1",
        deletedAt: "2026-01-03T12:00:00.000Z",
        syncedAt: null,
      }),
    ];
    const remote = [completion({ id: "c1", deletedAt: null })];
    const result = mergeCompletions(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].deletedAt).toBe("2026-01-03T12:00:00.000Z");
  });
});

describe("validateHabitRecord", () => {
  it("accepts a valid habit record", () => {
    const record = {
      id: "h1",
      user_id: "u1",
      name: "Test",
      icon: "Sun",
      type: "good" as const,
      color: "oklch(0.7 0.12 225)",
      button_label: "Done!",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      synced_at: null,
      deleted_at: null,
    };
    expect(() => validateHabitRecord(record as never)).not.toThrow();
  });

  it("throws when id is not a string", () => {
    const record = {
      id: 123,
      user_id: "u1",
      name: "Test",
      icon: "Sun",
      type: "good" as const,
      color: "oklch(0.7 0.12 225)",
      button_label: "Done!",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      synced_at: null,
      deleted_at: null,
    };
    expect(() => validateHabitRecord(record as never)).toThrow(
      'Invalid habit record: field "id" is not a string'
    );
  });

  it("throws when type is not good or bad", () => {
    const record = {
      id: "h1",
      user_id: "u1",
      name: "Test",
      icon: "Sun",
      type: "invalid" as unknown as "good" | "bad",
      color: "oklch(0.7 0.12 225)",
      button_label: "Done!",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      synced_at: null,
      deleted_at: null,
    };
    expect(() => validateHabitRecord(record as never)).toThrow(
      'Invalid habit record: field "type" must be "good" or "bad"'
    );
  });
});

describe("validateCompletionRecord", () => {
  it("accepts a valid completion record", () => {
    const record = {
      id: "c1",
      user_id: "u1",
      habit_id: "h1",
      timestamp: "2026-01-01T12:00:00.000Z",
      synced_at: null,
      deleted_at: null,
    };
    expect(() => validateCompletionRecord(record as never)).not.toThrow();
  });

  it("throws when timestamp is not a string", () => {
    const record = {
      id: "c1",
      user_id: "u1",
      habit_id: "h1",
      timestamp: 12_345,
      synced_at: null,
      deleted_at: null,
    };
    expect(() => validateCompletionRecord(record as never)).toThrow(
      'Invalid completion record: field "timestamp" is not a string'
    );
  });
});

describe("runSync", () => {
  function createMockSupabase(options?: {
    remoteHabits?: Record<string, unknown>[];
    remoteCompletions?: Record<string, unknown>[];
    selectError?: { message: string } | null;
    beforeFetch?: () => void;
  }) {
    const {
      remoteHabits = [],
      remoteCompletions = [],
      selectError = null,
      beforeFetch,
    } = options ?? {};
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockHabitsEq = vi.fn().mockImplementation(() => {
      beforeFetch?.();
      return Promise.resolve({
        data: selectError ? null : remoteHabits,
        error: selectError,
      });
    });
    const mockCompletionsEq = vi.fn().mockImplementation(() => {
      beforeFetch?.();
      return Promise.resolve({
        data: selectError ? null : remoteCompletions,
        error: selectError,
      });
    });
    const mockSelectHabits = vi.fn().mockReturnValue({ eq: mockHabitsEq });
    const mockSelectCompletions = vi.fn().mockReturnValue({
      eq: mockCompletionsEq,
    });
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "habits") {
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

  function fakeStore(initial: { habits: Habit[]; completions: Completion[] }) {
    let state = initial;
    const commit = vi.fn(
      (transforms: { habits?: Habit[]; completions?: Completion[] }) => {
        state = {
          habits: transforms.habits ?? state.habits,
          completions: transforms.completions ?? state.completions,
        };
      }
    );
    return {
      store: { getState: () => state, commit },
      commit,
      latestState: () => state,
    };
  }

  it("pushes unsynced records and commits them as synced", async () => {
    const { supabase, mockUpsert, mockFrom } = createMockSupabase();
    const { store, latestState } = fakeStore({
      habits: [habit({ id: "h1", syncedAt: null })],
      completions: [completion({ id: "c1", syncedAt: null })],
    });

    const outcome = await runSync({ store, supabase, userId: "uid" });

    expect(mockFrom).toHaveBeenCalledWith("habits");
    expect(mockFrom).toHaveBeenCalledWith("completions");
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(outcome).toEqual({ status: "ok" });
    expect(latestState().habits[0]?.syncedAt).not.toBeNull();
    expect(latestState().completions[0]?.syncedAt).not.toBeNull();
  });

  it("does not push already synced records", async () => {
    const { supabase, mockUpsert } = createMockSupabase();
    const { store, commit } = fakeStore({
      habits: [habit({ id: "h1", syncedAt: "2026-01-01T00:00:00.000Z" })],
      completions: [],
    });

    const outcome = await runSync({ store, supabase, userId: "uid" });

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(outcome).toEqual({ status: "ok" });
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("pulls remote records and merges them into the commit", async () => {
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
        deleted_at: null,
        user_id: "uid",
      },
    ];
    const { supabase } = createMockSupabase({
      remoteHabits,
      remoteCompletions,
    });
    const { store, latestState } = fakeStore({
      habits: [habit({ id: "h1", name: "Local" })],
      completions: [],
    });

    const outcome = await runSync({ store, supabase, userId: "uid" });

    expect(outcome).toEqual({ status: "ok" });
    expect(latestState().habits).toHaveLength(2);
    expect(latestState().completions).toHaveLength(1);
    expect(latestState().completions[0]?.id).toBe("c2");
  });

  it("commits an empty reconciliation when there is nothing to sync", async () => {
    const { supabase } = createMockSupabase();
    const { store, latestState } = fakeStore({ habits: [], completions: [] });

    const outcome = await runSync({ store, supabase, userId: "uid" });

    expect(outcome).toEqual({ status: "ok" });
    expect(latestState().habits).toEqual([]);
    expect(latestState().completions).toEqual([]);
  });

  it("reports push-rejected but still commits the reconciliation", async () => {
    const mockUpsert = vi
      .fn()
      .mockResolvedValue({ error: { message: "fail" } });
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi
      .fn()
      .mockReturnValue({ upsert: mockUpsert, select: mockSelect });
    const supabase = { from: mockFrom } as unknown as SupabaseClient;
    const { store, latestState } = fakeStore({
      habits: [habit({ id: "h1", syncedAt: null })],
      completions: [],
    });

    const outcome = await runSync({ store, supabase, userId: "uid" });

    expect(outcome).toEqual({ status: "failed", reason: "push-rejected" });
    // Rejected records stay dirty so the next run pushes them again.
    expect(latestState().habits[0]?.syncedAt).toBeNull();
  });

  it("marks the successful pushes but not the rejected ones", async () => {
    let call = 0;
    const mockUpsert = vi.fn().mockImplementation(() => {
      call += 1;
      return Promise.resolve(
        call === 1 ? { error: { message: "fail" } } : { error: null }
      );
    });
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi
      .fn()
      .mockReturnValue({ upsert: mockUpsert, select: mockSelect });
    const supabase = { from: mockFrom } as unknown as SupabaseClient;
    const { store, latestState } = fakeStore({
      habits: [
        habit({ id: "h1", syncedAt: null }),
        habit({ id: "h2", syncedAt: null }),
      ],
      completions: [],
    });

    const outcome = await runSync({ store, supabase, userId: "uid" });

    expect(outcome).toEqual({ status: "failed", reason: "push-rejected" });
    expect(latestState().habits[0]?.syncedAt).toBeNull();
    expect(latestState().habits[1]?.syncedAt).not.toBeNull();
  });

  it("reports network and does not commit when the remote copy is unreadable", async () => {
    const { supabase } = createMockSupabase({
      selectError: { message: "boom" },
    });
    const { store, commit } = fakeStore({ habits: [], completions: [] });

    const outcome = await runSync({ store, supabase, userId: "uid" });

    expect(outcome).toEqual({ status: "failed", reason: "network" });
    expect(commit).not.toHaveBeenCalled();
  });

  it("reports invalid-remote and does not commit on a malformed row", async () => {
    const { supabase } = createMockSupabase({ remoteHabits: [{ id: 123 }] });
    const { store, commit } = fakeStore({ habits: [], completions: [] });

    const outcome = await runSync({ store, supabase, userId: "uid" });

    expect(outcome).toEqual({ status: "failed", reason: "invalid-remote" });
    expect(commit).not.toHaveBeenCalled();
  });

  it("commits edits made while the run is in flight, keeping them dirty", async () => {
    const original = habit({ id: "h1", name: "Beber agua", syncedAt: null });
    let local: { habits: Habit[]; completions: Completion[] } = {
      habits: [original],
      completions: [],
    };
    const commit = vi.fn(
      (transforms: { habits?: Habit[]; completions?: Completion[] }) => {
        local = {
          habits: transforms.habits ?? local.habits,
          completions: transforms.completions ?? local.completions,
        };
      }
    );
    // A local edit lands between the snapshot and the remote fetch.
    const { supabase } = createMockSupabase({
      beforeFetch: () => {
        local = {
          habits: [{ ...original, name: "Renombrado", syncedAt: null }],
          completions: [],
        };
      },
    });

    const outcome = await runSync({
      store: { getState: () => local, commit },
      supabase,
      userId: "uid",
    });

    expect(outcome).toEqual({ status: "ok" });
    expect(local.habits[0]?.name).toBe("Renombrado");
    // The edit was not the record we pushed, so it stays queued.
    expect(local.habits[0]?.syncedAt).toBeNull();
  });

  it("snapshots the arrays, not the live state object", async () => {
    // The real store's getState() returns the same object every time and
    // replaces its properties on commit — capturing the object instead of
    // the arrays makes the "snapshot" silently track post-edit state.
    const state: { habits: Habit[]; completions: Completion[] } = {
      habits: [habit({ id: "h1", name: "Beber agua", syncedAt: null })],
      completions: [],
    };
    const commit = vi.fn(
      (transforms: { habits?: Habit[]; completions?: Completion[] }) => {
        if (transforms.habits) {
          state.habits = transforms.habits;
        }
        if (transforms.completions) {
          state.completions = transforms.completions;
        }
      }
    );
    const { supabase } = createMockSupabase({
      beforeFetch: () => {
        state.habits = state.habits.map((h) => ({
          ...h,
          name: "Renombrado",
          syncedAt: null,
        }));
      },
    });

    const outcome = await runSync({
      store: { getState: () => state, commit },
      supabase,
      userId: "uid",
    });

    expect(outcome).toEqual({ status: "ok" });
    expect(state.habits[0]?.name).toBe("Renombrado");
    // Marking must key off the captured arrays: the edit stays queued.
    expect(state.habits[0]?.syncedAt).toBeNull();
  });
});
