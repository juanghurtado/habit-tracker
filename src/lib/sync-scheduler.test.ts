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

const mockSyncAll = vi.hoisted(() => vi.fn());

vi.mock("../lib/sync.ts", () => ({
  syncAll: mockSyncAll,
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
    mockSyncAll.mockReset();
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
    mockSyncAll.mockResolvedValue({ habits: [], completions: [] });

    schedule();
    expect(getSnapshotSyncStatus()).toBe("pending");

    await vi.advanceTimersByTimeAsync(2000);

    expect(mockSyncAll).toHaveBeenCalledTimes(1);
    expect(getSnapshotSyncStatus()).toBe("idle");
  });

  it("transitions to syncing after debounce resolves", async () => {
    mockSyncAll.mockResolvedValue({ habits: [], completions: [] });

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
    mockSyncAll.mockResolvedValue({ habits: [], completions: [] });

    schedule();
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockSyncAll).not.toHaveBeenCalled();
  });

  it("debounces multiple schedule calls within 2s", async () => {
    mockSyncAll.mockResolvedValue({ habits: [], completions: [] });

    schedule();
    await vi.advanceTimersByTimeAsync(500);
    schedule();
    await vi.advanceTimersByTimeAsync(500);
    schedule();
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockSyncAll).toHaveBeenCalledTimes(1);
  });

  it("flush cancels debounce and syncs immediately", async () => {
    mockSyncAll.mockResolvedValue({ habits: [], completions: [] });

    schedule();
    await vi.advanceTimersByTimeAsync(500);
    flush();

    expect(mockSyncAll).toHaveBeenCalledTimes(1);
  });

  it("flush syncs immediately even when no pending sync", () => {
    mockSyncAll.mockResolvedValue({ habits: [], completions: [] });

    flush();

    expect(mockSyncAll).toHaveBeenCalledTimes(1);
  });

  it("syncNow syncs immediately regardless of pending state", () => {
    mockSyncAll.mockResolvedValue({ habits: [], completions: [] });

    syncNow();

    expect(mockSyncAll).toHaveBeenCalledTimes(1);
  });

  it("reset clears timeout and status", () => {
    mockSyncAll.mockResolvedValue({ habits: [], completions: [] });

    schedule();
    reset();

    expect(getSnapshotSyncStatus()).toBe("idle");

    vi.advanceTimersByTime(2000);
    expect(mockSyncAll).not.toHaveBeenCalled();
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
