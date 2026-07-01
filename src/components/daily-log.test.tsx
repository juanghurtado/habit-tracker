import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DailyLog } from "./daily-log.tsx";

const mockUseHabits = vi.fn();

vi.mock("../hooks/use-habits.ts", () => ({
  useHabits: () => mockUseHabits(),
}));

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

vi.mock("sonner", () => ({ toast: vi.fn() }));

vi.mock("../lib/storage.ts", () => ({
  getCompletionsForHabitOnDate: () => [],
}));

function mockEmpty() {
  mockUseHabits.mockReturnValue({
    habits: [],
    completions: [],
    addHabit: vi.fn(),
    editHabit: vi.fn(),
    deleteHabit: vi.fn(),
    addCompletion: vi.fn(),
    undoLastCompletion: vi.fn(),
    syncStatus: "idle",
    syncNow: vi.fn(),
  });
}

function mockWithHabits() {
  mockUseHabits.mockReturnValue({
    habits: [
      {
        id: "h1",
        name: "Drink water",
        icon: "Droplets",
        type: "good",
        color: "oklch(0.7 0.12 225)",
        buttonLabel: "Done!",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        deletedAt: null,
        syncedAt: null,
      },
      {
        id: "h2",
        name: "No soda",
        icon: "Beer",
        type: "bad",
        color: "oklch(0.56 0.20 15)",
        buttonLabel: "Oops...",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        deletedAt: null,
        syncedAt: null,
      },
    ],
    completions: [],
    addHabit: vi.fn(),
    editHabit: vi.fn(),
    deleteHabit: vi.fn(),
    addCompletion: vi.fn(),
    undoLastCompletion: vi.fn(),
    syncStatus: "idle",
    syncNow: vi.fn(),
  });
}

describe("DailyLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no habits exist", () => {
    mockEmpty();
    render(<DailyLog date={new Date()} onDateChange={vi.fn()} />);
    expect(screen.getByText("Your habits start here")).toBeInTheDocument();
  });

  it("renders habit cards with names", () => {
    mockWithHabits();
    render(<DailyLog date={new Date()} onDateChange={vi.fn()} />);
    expect(screen.getByText("Drink water")).toBeInTheDocument();
    expect(screen.getByText("No soda")).toBeInTheDocument();
  });

  it("renders the add habit FAB button", () => {
    mockEmpty();
    render(<DailyLog date={new Date()} onDateChange={vi.fn()} />);
    const fabButton = screen.getByRole("button", { name: "" });
    expect(fabButton.querySelector("svg")).toBeInTheDocument();
  });
});
