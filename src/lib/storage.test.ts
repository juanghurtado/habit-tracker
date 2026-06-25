import { describe, it, expect } from "vitest"
import { formatDateKey, getCompletionsForDate, getCompletionsForHabitOnDate, createHabit, createCompletion } from "./storage"

describe("formatDateKey", () => {
  it("formats a date as YYYY-MM-DD", () => {
    const date = new Date(2026, 5, 25)
    expect(formatDateKey(date)).toBe("2026-06-25")
  })

  it("pads single-digit month and day", () => {
    const date = new Date(2026, 0, 5)
    expect(formatDateKey(date)).toBe("2026-01-05")
  })

  it("handles December date", () => {
    const date = new Date(2026, 11, 31)
    expect(formatDateKey(date)).toBe("2026-12-31")
  })
})

describe("getCompletionsForDate", () => {
  const completions = [
    { id: "1", habitId: "a", timestamp: "2026-06-25T10:00:00.000Z" },
    { id: "2", habitId: "b", timestamp: "2026-06-25T14:30:00.000Z" },
    { id: "3", habitId: "a", timestamp: "2026-06-24T23:00:00.000Z" },
  ]

  it("returns completions matching the date key", () => {
    const date = new Date(2026, 5, 25)
    const result = getCompletionsForDate(completions, date)
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.id)).toEqual(["1", "2"])
  })

  it("returns empty array when no completions match", () => {
    const date = new Date(2026, 6, 1)
    expect(getCompletionsForDate(completions, date)).toEqual([])
  })

  it("matches timestamp prefix exactly", () => {
    const date = new Date(2026, 5, 24)
    const result = getCompletionsForDate(completions, date)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("3")
  })
})

describe("getCompletionsForHabitOnDate", () => {
  const completions = [
    { id: "1", habitId: "a", timestamp: "2026-06-25T10:00:00.000Z" },
    { id: "2", habitId: "b", timestamp: "2026-06-25T14:30:00.000Z" },
    { id: "3", habitId: "a", timestamp: "2026-06-24T23:00:00.000Z" },
  ]

  it("returns completions for specific habit and date", () => {
    const date = new Date(2026, 5, 25)
    const result = getCompletionsForHabitOnDate(completions, "a", date)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })

  it("returns empty array for habit with no completions on date", () => {
    const date = new Date(2026, 5, 25)
    expect(getCompletionsForHabitOnDate(completions, "c", date)).toEqual([])
  })

  it("handles empty completions array", () => {
    const date = new Date(2026, 5, 25)
    expect(getCompletionsForHabitOnDate([], "a", date)).toEqual([])
  })
})

describe("createHabit", () => {
  it("creates a habit with given fields and a generated id", () => {
    const habit = createHabit("Drink water", "Droplets", "good", "oklch(0.7 0.12 225)", "I did it!")
    expect(habit.name).toBe("Drink water")
    expect(habit.icon).toBe("Droplets")
    expect(habit.type).toBe("good")
    expect(habit.color).toBe("oklch(0.7 0.12 225)")
    expect(habit.buttonLabel).toBe("I did it!")
    expect(habit.id).toBeDefined()
    expect(typeof habit.id).toBe("string")
    expect(habit.createdAt).toBeDefined()
    expect(() => new Date(habit.createdAt)).not.toThrow()
  })
})

describe("createCompletion", () => {
  it("creates a completion with a given habitId", () => {
    const completion = createCompletion("habit-1")
    expect(completion.habitId).toBe("habit-1")
    expect(completion.id).toBeDefined()
    expect(typeof completion.id).toBe("string")
    expect(completion.timestamp).toBeDefined()
    expect(() => new Date(completion.timestamp)).not.toThrow()
  })
})