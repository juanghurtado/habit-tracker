import type { SupabaseClient } from "@supabase/supabase-js";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadHabits } from "../lib/storage.ts";
import { AuthProvider } from "./use-auth.tsx";
import { useHabits } from "./use-habits.ts";

const mockSupabase = {
  auth: {
    getSession: vi.fn(async () => ({ data: { session: null } })),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
} as unknown as SupabaseClient;

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider supabase={mockSupabase}>{children}</AuthProvider>;
  };
}

describe("useHabits", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty habits and completions initially", () => {
    const { result } = renderHook(() => useHabits(), {
      wrapper: createWrapper(),
    });
    expect(result.current.habits).toEqual([]);
    expect(result.current.completions).toEqual([]);
  });

  it("adds a habit and updates the habits list", () => {
    const { result } = renderHook(() => useHabits(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.addHabit(
        "Drink water",
        "Droplets",
        "good",
        "oklch(0.7 0.12 225)",
        "Done!"
      );
    });
    expect(result.current.habits).toHaveLength(1);
    expect(result.current.habits[0].name).toBe("Drink water");
  });

  it("edits an existing habit", () => {
    const { result } = renderHook(() => useHabits(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.addHabit(
        "Old name",
        "Sun",
        "good",
        "oklch(0.7 0.12 225)",
        "Done!"
      );
    });
    const id = result.current.habits[0].id;
    act(() => {
      result.current.editHabit(
        id,
        "New name",
        "Moon",
        "bad",
        "oklch(0.5 0.2 22)",
        "Oops..."
      );
    });
    expect(result.current.habits[0].name).toBe("New name");
    expect(result.current.habits[0].icon).toBe("Moon");
    expect(result.current.habits[0].type).toBe("bad");
  });

  it("deletes a habit and its completions", () => {
    const { result } = renderHook(() => useHabits(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.addHabit(
        "Delete me",
        "Sun",
        "good",
        "oklch(0.7 0.12 225)",
        "Done!"
      );
    });
    const id = result.current.habits[0].id;
    act(() => {
      result.current.addCompletion(id);
    });
    expect(result.current.completions).toHaveLength(1);
    act(() => {
      result.current.deleteHabit(id);
    });
    expect(result.current.habits).toHaveLength(0);
    expect(result.current.completions).toHaveLength(0);
  });

  it("adds a completion for a habit", () => {
    const { result } = renderHook(() => useHabits(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.addHabit(
        "Test",
        "Sun",
        "good",
        "oklch(0.7 0.12 225)",
        "Done!"
      );
    });
    const id = result.current.habits[0].id;
    act(() => {
      result.current.addCompletion(id);
    });
    expect(result.current.completions).toHaveLength(1);
    expect(result.current.completions[0].habitId).toBe(id);
  });

  it("adds a completion for a specific date", () => {
    const { result } = renderHook(() => useHabits(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.addHabit(
        "Test",
        "Sun",
        "good",
        "oklch(0.7 0.12 225)",
        "Done!"
      );
    });
    const id = result.current.habits[0].id;
    const pastDate = new Date(2026, 5, 24);
    act(() => {
      result.current.addCompletion(id, pastDate);
    });
    expect(result.current.completions).toHaveLength(1);
    expect(result.current.completions[0].habitId).toBe(id);
  });

  it("undoes the last completion for a habit", () => {
    const { result } = renderHook(() => useHabits(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.addHabit(
        "Test",
        "Sun",
        "good",
        "oklch(0.7 0.12 225)",
        "Done!"
      );
    });
    const id = result.current.habits[0].id;
    act(() => {
      result.current.addCompletion(id);
      result.current.addCompletion(id);
    });
    expect(result.current.completions).toHaveLength(2);
    act(() => {
      result.current.undoLastCompletion(id);
    });
    expect(result.current.completions).toHaveLength(1);
  });

  it("persists data to localStorage", () => {
    const { result } = renderHook(() => useHabits(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.addHabit(
        "Persist test",
        "Star",
        "good",
        "oklch(0.7 0.12 225)",
        "Done!"
      );
    });
    const loaded = loadHabits();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("Persist test");
  });
});
