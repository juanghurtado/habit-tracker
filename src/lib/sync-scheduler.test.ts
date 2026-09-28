import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  flush,
  getSnapshotSyncStatus,
  reset,
  schedule,
  setUserId,
  subscribeSyncStatus,
  syncNow,
} from "../lib/sync-scheduler.ts";

const mockRunSync = vi.hoisted(() => vi.fn());

vi.mock("../lib/sync.ts", () => ({
  runSync: mockRunSync,
}));

vi.mock("../lib/supabase.ts", () => ({
  supabase: {},
}));

vi.mock("../lib/store.ts", () => ({
  getState: () => ({ habits: [], completions: [] }),
  commit: vi.fn(),
}));

describe("sync-scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockRunSync.mockReset();
    setUserId("user-1");
  });

  afterEach(() => {
    reset();
    vi.useRealTimers();
  });

  it("starts with idle status", () => {
    expect(getSnapshotSyncStatus()).toBe("idle");
  });

  it("transitions to pending on schedule, then syncing then idle after sync", async () => {
    mockRunSync.mockResolvedValue({ status: "ok" });

    schedule();
    expect(getSnapshotSyncStatus()).toBe("pending");

    await vi.advanceTimersByTimeAsync(2000);

    expect(mockRunSync).toHaveBeenCalledTimes(1);
    expect(getSnapshotSyncStatus()).toBe("idle");
  });

  it("transitions to syncing after debounce resolves", async () => {
    mockRunSync.mockResolvedValue({ status: "ok" });

    const statuses: string[] = [];
    subscribeSyncStatus(() => {
      statuses.push(getSnapshotSyncStatus());
    });

    schedule();
    await vi.advanceTimersByTimeAsync(2000);

    expect(statuses).toContain("syncing");
    expect(getSnapshotSyncStatus()).toBe("idle");
  });

  it("does not sync when userId is null", async () => {
    setUserId(null);
    mockRunSync.mockResolvedValue({ status: "ok" });

    schedule();
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockRunSync).not.toHaveBeenCalled();
  });

  it("debounces multiple schedule calls within 2s", async () => {
    mockRunSync.mockResolvedValue({ status: "ok" });

    schedule();
    await vi.advanceTimersByTimeAsync(500);
    schedule();
    await vi.advanceTimersByTimeAsync(500);
    schedule();
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockRunSync).toHaveBeenCalledTimes(1);
  });

  it("flush cancels debounce and syncs immediately", async () => {
    mockRunSync.mockResolvedValue({ status: "ok" });

    schedule();
    await vi.advanceTimersByTimeAsync(500);
    flush();

    expect(mockRunSync).toHaveBeenCalledTimes(1);
  });

  it("flush syncs immediately even when no pending sync", () => {
    mockRunSync.mockResolvedValue({ status: "ok" });

    flush();

    expect(mockRunSync).toHaveBeenCalledTimes(1);
  });

  it("syncNow syncs immediately regardless of pending state", () => {
    mockRunSync.mockResolvedValue({ status: "ok" });

    syncNow();

    expect(mockRunSync).toHaveBeenCalledTimes(1);
  });

  it("does not start a second sync while one is in progress", async () => {
    mockRunSync.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        })
    );

    schedule();
    await vi.advanceTimersByTimeAsync(2000);

    syncNow();

    expect(mockRunSync).toHaveBeenCalledTimes(1);
    reset();
  });

  it("logs a failed run and does not schedule a retry", async () => {
    mockRunSync.mockResolvedValue({ status: "failed", reason: "network" });
    const warn = vi
      .spyOn(console, "warn")
      // biome-ignore lint/suspicious/noEmptyBlockStatements: silence the expected warning
      .mockImplementation(() => {});

    try {
      syncNow();
      await vi.advanceTimersByTimeAsync(0);

      expect(getSnapshotSyncStatus()).toBe("idle");
      expect(warn).toHaveBeenCalledWith("[sync] run failed: network");

      // No automatic retry: dirty records wait for the next natural trigger.
      await vi.advanceTimersByTimeAsync(10_000);
      expect(mockRunSync).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it("reset clears timeout and status", () => {
    mockRunSync.mockResolvedValue({ status: "ok" });

    schedule();
    reset();

    expect(getSnapshotSyncStatus()).toBe("idle");

    vi.advanceTimersByTime(2000);
    expect(mockRunSync).not.toHaveBeenCalled();
  });

  it("subscribes and unsubscribes correctly", () => {
    const handler = vi.fn();
    const unsub = subscribeSyncStatus(handler);

    setUserId(null);
    schedule();
    expect(handler).not.toHaveBeenCalled();

    unsub();
  });
});
