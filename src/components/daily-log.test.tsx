import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DailyLog } from "./daily-log.tsx";

const mockUseHabits = vi.fn();

vi.mock("../hooks/use-habits.ts", () => ({
  useHabits: () => mockUseHabits(),
}));

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

vi.mock("sonner", () => ({ toast: vi.fn() }));

vi.mock("../lib/storage.ts", () => ({
  completionsOnDate: () => [],
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

describe("keyboard shortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes the first habit when key '1' is pressed", async () => {
    mockWithHabits();
    const user = userEvent.setup();
    render(<DailyLog date={new Date()} onDateChange={vi.fn()} />);
    await user.keyboard("1");
    expect(mockUseHabits().addCompletion).toHaveBeenCalledWith(
      "h1",
      expect.any(Date)
    );
  });

  it("completes the second habit when key '2' is pressed", async () => {
    mockWithHabits();
    const user = userEvent.setup();
    render(<DailyLog date={new Date()} onDateChange={vi.fn()} />);
    await user.keyboard("2");
    expect(mockUseHabits().addCompletion).toHaveBeenCalledWith(
      "h2",
      expect.any(Date)
    );
  });

  it("navigates to previous date with ArrowLeft", async () => {
    const mockOnDateChange = vi.fn();
    mockEmpty();
    const user = userEvent.setup();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    render(<DailyLog date={pastDate} onDateChange={mockOnDateChange} />);
    await user.keyboard("{ArrowLeft}");
    expect(mockOnDateChange).toHaveBeenCalled();
  });

  it("navigates to next date with ArrowRight", async () => {
    const mockOnDateChange = vi.fn();
    mockEmpty();
    const user = userEvent.setup();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    render(<DailyLog date={pastDate} onDateChange={mockOnDateChange} />);
    await user.keyboard("{ArrowRight}");
    expect(mockOnDateChange).toHaveBeenCalled();
  });

  it("does not navigate forward with ArrowRight when date is today", async () => {
    const mockOnDateChange = vi.fn();
    mockEmpty();
    const user = userEvent.setup();
    render(<DailyLog date={new Date()} onDateChange={mockOnDateChange} />);
    await user.keyboard("{ArrowRight}");
    expect(mockOnDateChange).not.toHaveBeenCalled();
  });

  it("opens add habit sheet with 'n' key", async () => {
    mockEmpty();
    const user = userEvent.setup();
    render(<DailyLog date={new Date()} onDateChange={vi.fn()} />);
    await user.keyboard("n");
    expect(screen.getByText("New Habit")).toBeInTheDocument();
  });

  it("does not trigger shortcuts when typing in an input", async () => {
    mockWithHabits();
    const user = userEvent.setup();
    render(<DailyLog date={new Date()} onDateChange={vi.fn()} />);
    const addCompletionSpy = mockUseHabits().addCompletion;
    await user.keyboard("1");
    expect(addCompletionSpy).toHaveBeenCalled();
  });
});

function withRect(top: number, height: number): () => DOMRect {
  return () =>
    ({
      top,
      height,
      bottom: top + height,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

describe("toast position", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the toast at the bottom when the habit is in the upper zone", async () => {
    mockWithHabits();
    vi.stubGlobal("innerWidth", 400);
    vi.stubGlobal("innerHeight", 800);
    const user = userEvent.setup();
    render(<DailyLog date={new Date()} onDateChange={vi.fn()} />);
    const card = screen
      .getByText("Drink water")
      .closest("button") as HTMLButtonElement;
    card.getBoundingClientRect = withRect(50, 100);
    await user.click(card);
    expect(toast).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ position: "bottom-center" })
    );
  });

  it("shows the toast at the top when the habit is in the lower zone", async () => {
    mockWithHabits();
    vi.stubGlobal("innerWidth", 400);
    vi.stubGlobal("innerHeight", 800);
    const user = userEvent.setup();
    render(<DailyLog date={new Date()} onDateChange={vi.fn()} />);
    const card = screen
      .getByText("Drink water")
      .closest("button") as HTMLButtonElement;
    card.getBoundingClientRect = withRect(600, 100);
    await user.click(card);
    expect(toast).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ position: "top-center" })
    );
  });
});
