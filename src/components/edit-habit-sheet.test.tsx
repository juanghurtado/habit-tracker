import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Habit } from "../types.ts";
import { EditHabitSheet } from "./edit-habit-sheet.tsx";

const saveRegex = /save/i;

vi.mock("../lib/colors", () => ({
  getRandomColor: vi.fn(() => "oklch(0.7 0.12 225)"),
  allColors: {
    good: [
      {
        name: "Sky",
        value: "oklch(0.7 0.12 225)",
        button: "oklch(0.45 0.12 225)",
      },
    ],
    bad: [
      {
        name: "Ruby",
        value: "oklch(0.56 0.20 15)",
        button: "oklch(0.38 0.20 15)",
      },
    ],
  },
}));

vi.mock("../lib/button-labels", () => ({
  getRandomLabel: vi.fn(() => "Done!"),
  allLabels: { good: ["Done!"], bad: ["Oops..."] },
}));

const mockHabit: Habit = {
  id: "test-habit-1",
  name: "Exercise",
  icon: "Dumbbell",
  type: "good",
  color: "oklch(0.7 0.12 225)",
  buttonLabel: "I did it!",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("EditHabitSheet", () => {
  const defaultProps = {
    habit: mockHabit,
    open: true,
    onOpenChange: vi.fn(),
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with the habit name pre-populated", () => {
    render(<EditHabitSheet {...defaultProps} />);
    expect(screen.getByText("Edit Habit")).toBeInTheDocument();
    const nameInput = screen.getByPlaceholderText("e.g. Drink water");
    expect(nameInput).toHaveValue("Exercise");
  });

  it("calls onSave with updated habit data", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<EditHabitSheet {...defaultProps} onSave={onSave} />);
    const nameInput = screen.getByPlaceholderText("e.g. Drink water");
    await user.clear(nameInput);
    await user.type(nameInput, "Running");
    const saveButton = screen.getByRole("button", { name: saveRegex });
    await user.click(saveButton);
    expect(onSave).toHaveBeenCalledWith(
      "test-habit-1",
      "Running",
      "Dumbbell",
      "good",
      expect.any(String),
      expect.any(String)
    );
  });

  it("does not call onSave when name is cleared", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<EditHabitSheet {...defaultProps} onSave={onSave} />);
    const nameInput = screen.getByPlaceholderText("e.g. Drink water");
    await user.clear(nameInput);
    const saveButton = screen.getByRole("button", { name: saveRegex });
    await user.click(saveButton);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("closes the dialog on save", async () => {
    const onOpenChange = vi.fn();
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <EditHabitSheet
        {...defaultProps}
        onOpenChange={onOpenChange}
        onSave={onSave}
      />
    );
    const saveButton = screen.getByRole("button", { name: saveRegex });
    await user.click(saveButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
