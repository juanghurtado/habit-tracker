import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AddHabitSheet } from "./add-habit-sheet"

vi.mock("../lib/colors", () => ({
  getRandomColor: vi.fn(() => "oklch(0.7 0.12 225)"),
  allColors: {
    good: [{ name: "Sky", value: "oklch(0.7 0.12 225)", button: "oklch(0.45 0.12 225)" }],
    bad: [{ name: "Ruby", value: "oklch(0.56 0.20 15)", button: "oklch(0.38 0.20 15)" }],
  },
}))

vi.mock("../lib/button-labels", () => ({
  getRandomLabel: vi.fn(() => "Done!"),
  allLabels: { good: ["Done!"], bad: ["Oops..."] },
}))

describe("AddHabitSheet", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSave: vi.fn(),
  }

  beforeEach(() => { vi.clearAllMocks() })

  it("renders with dialog title", () => {
    render(<AddHabitSheet {...defaultProps} />)
    expect(screen.getByText("New Habit")).toBeInTheDocument()
  })

  it("calls onSave with habit data on submit", async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<AddHabitSheet {...defaultProps} onSave={onSave} />)
    const nameInput = screen.getByPlaceholderText("e.g. Drink water")
    await user.type(nameInput, "Morning run")
    const addButton = screen.getByRole("button", { name: /add habit/i })
    await user.click(addButton)
    expect(onSave).toHaveBeenCalledWith(
      "Morning run", expect.any(String), "good", expect.any(String), expect.any(String)
    )
  })

  it("does not call onSave when name is empty", async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<AddHabitSheet {...defaultProps} onSave={onSave} />)
    const addButton = screen.getByRole("button", { name: /add habit/i })
    await user.click(addButton)
    expect(onSave).not.toHaveBeenCalled()
  })

  it("closes the dialog on save", async () => {
    const onOpenChange = vi.fn()
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<AddHabitSheet {...defaultProps} onOpenChange={onOpenChange} onSave={onSave} />)
    const nameInput = screen.getByPlaceholderText("e.g. Drink water")
    await user.type(nameInput, "Yoga")
    const addButton = screen.getByRole("button", { name: /add habit/i })
    await user.click(addButton)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})