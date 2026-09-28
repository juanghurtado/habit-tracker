import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addCompletion, editHabit, undoLastCompletion } from "../lib/crud.ts";
import { commit, getState, reset as resetStore } from "../lib/store.ts";
import {
  flush,
  getSnapshotSyncStatus,
  reset as resetScheduler,
  setUserId,
  subscribeSyncStatus,
} from "../lib/sync-scheduler.ts";
import type { Completion, Habit } from "../types.ts";

const fakeSupabase = vi.hoisted(() => ({
  from: undefined as unknown as SupabaseClient["from"],
}));

vi.mock("../lib/supabase.ts", () => ({
  supabase: { from: (table: string) => fakeSupabase.from(table) },
}));

type UpsertRow = Record<string, unknown>;

/** In-memory Supabase stand-in: no network, records every pushed row. */
function createFakeSupabase() {
  const pushed: Array<{ table: string; row: UpsertRow }> = [];
  const remote: Record<string, UpsertRow[]> = {
    habits: [],
    completions: [],
  };
  const supabase = {
    from: (table: string) => ({
      upsert: (row: UpsertRow) => {
        pushed.push({ table, row });
        return Promise.resolve({ error: null });
      },
      select: () => ({
        eq: () => Promise.resolve({ data: remote[table] ?? [], error: null }),
      }),
    }),
  } as unknown as SupabaseClient;
  return { supabase, pushed, remote };
}

function habit(overrides?: Partial<Habit>): Habit {
  return {
    id: "h1",
    name: "Beber agua",
    icon: "GlassWater",
    type: "good",
    color: "oklch(0.7 0.12 225)",
    buttonLabel: "Done!",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    syncedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

function completion(overrides?: Partial<Completion>): Completion {
  return {
    id: "c1",
    habitId: "h1",
    timestamp: "2026-09-28T12:00:00.000Z",
    syncedAt: "2026-09-28T12:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

/**
 * Resolves the first time the scheduler reports "idle", i.e. when the sync
 * that is about to start has finished committing. Must be registered before
 * the sync is triggered.
 */
function watchSyncDone(): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = subscribeSyncStatus(() => {
      if (getSnapshotSyncStatus() === "idle") {
        unsubscribe();
        resolve();
      }
    });
  });
}

/** Polls a condition, draining microtasks and firing virtual timers. */
async function until(check: () => boolean, label: string): Promise<void> {
  for (let i = 0; i < 100; i++) {
    if (check()) {
      return;
    }
    await vi.advanceTimersByTimeAsync(100);
  }
  throw new Error(`Timed out waiting for: ${label}`);
}

describe("local edits made while a sync is in flight", () => {
  let fake: ReturnType<typeof createFakeSupabase>;

  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
    resetScheduler();
    setUserId("user-1");
    fake = createFakeSupabase();
    fakeSupabase.from = fake.supabase.from;
    commit({ habits: [habit()], completions: [] });
  });

  afterEach(async () => {
    resetScheduler();
    // let any in-flight sync commit before wiping the store
    await vi.advanceTimersByTimeAsync(0);
    resetStore();
    vi.useRealTimers();
  });

  it("keeps a completion marked during an in-flight sync", async () => {
    const syncDone = watchSyncDone();

    // App opens -> the launch sync starts and is still running.
    flush();
    expect(getSnapshotSyncStatus()).toBe("syncing");

    // The user marks the habit as done while the sync is running.
    addCompletion("h1");
    expect(getState().completions).toHaveLength(1);

    await syncDone;

    // The habit must still be marked as done.
    expect(getState().completions).toHaveLength(1);
  });

  it("pushes a completion made during an in-flight sync in a follow-up sync", async () => {
    const syncDone = watchSyncDone();

    flush();
    expect(getSnapshotSyncStatus()).toBe("syncing");

    addCompletion("h1");
    const completionId = getState().completions[0]?.id;
    expect(completionId).toBeDefined();

    // The debounced follow-up fires while the first sync is still running.
    await vi.advanceTimersByTimeAsync(2000);
    await syncDone;

    // A follow-up sync must push the completion and mark it as synced.
    await until(
      () =>
        fake.pushed.some(
          (p) => p.table === "completions" && p.row.id === completionId
        ),
      "the completion to be pushed to Supabase"
    );
    expect(getState().completions[0]?.syncedAt).not.toBeNull();
  });

  it("keeps a habit edit made during an in-flight sync", async () => {
    const syncDone = watchSyncDone();

    flush();
    expect(getSnapshotSyncStatus()).toBe("syncing");

    // The user renames the habit while the sync is running.
    editHabit(
      "h1",
      "Renombrado",
      "GlassWater",
      "good",
      "oklch(0.7 0.12 225)",
      "Done!"
    );

    await syncDone;

    expect(getState().habits[0]?.name).toBe("Renombrado");
    // The rename is still dirty, so the next sync pushes it.
    expect(getState().habits[0]?.syncedAt).toBeNull();
  });

  it("keeps a completion undone during an in-flight sync", async () => {
    commit({
      habits: [habit()],
      completions: [completion()],
    });

    const syncDone = watchSyncDone();
    flush();
    expect(getSnapshotSyncStatus()).toBe("syncing");

    // The user undoes the completion while the sync is running.
    undoLastCompletion("h1");
    expect(
      getState().completions.find((c) => c.id === "c1")?.deletedAt
    ).not.toBeNull();

    await syncDone;

    expect(
      getState().completions.find((c) => c.id === "c1")?.deletedAt
    ).not.toBeNull();
  });
});
