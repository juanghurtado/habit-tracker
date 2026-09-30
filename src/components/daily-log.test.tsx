import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays } from "date-fns/addDays";
import { subDays } from "date-fns/subDays";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("swipe navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function swipeSurface(container: HTMLElement): HTMLElement {
    const surface = container.querySelector<HTMLElement>(".touch-pan-y");
    if (!surface) {
      throw new Error("swipe surface not found");
    }
    return surface;
  }

  function swipe(element: HTMLElement, fromX: number, toX: number) {
    fireEvent.touchStart(element, {
      touches: [{ clientX: fromX, clientY: 100 }],
    });
    fireEvent.touchMove(element, {
      touches: [{ clientX: toX, clientY: 100 }],
    });
    fireEvent.touchEnd(element, {
      changedTouches: [{ clientX: toX, clientY: 100 }],
    });
  }

  it("goes to the previous day when swiping right", () => {
    mockEmpty();
    const onDateChange = vi.fn();
    const date = new Date();
    const { container } = render(
      <DailyLog date={date} onDateChange={onDateChange} />
    );

    swipe(swipeSurface(container), 100, 220);

    expect(onDateChange).toHaveBeenCalledWith(subDays(date, 1));
  });

  it("goes to the next day when swiping left", () => {
    mockEmpty();
    const onDateChange = vi.fn();
    const date = subDays(new Date(), 2);
    const { container } = render(
      <DailyLog date={date} onDateChange={onDateChange} />
    );

    swipe(swipeSurface(container), 220, 100);

    expect(onDateChange).toHaveBeenCalledWith(addDays(date, 1));
  });

  it("does not go past today when swiping left", () => {
    mockEmpty();
    const onDateChange = vi.fn();
    const { container } = render(
      <DailyLog date={new Date()} onDateChange={onDateChange} />
    );

    swipe(swipeSurface(container), 220, 100);

    expect(onDateChange).not.toHaveBeenCalled();
  });
});
