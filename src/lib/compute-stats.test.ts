import { describe, it, expect } from "vitest"
import { computeStats } from "./compute-stats"
import type { Habit, Completion } from "../types"

const habits: Habit[] = [
  { id: "h1", name: "Exercise", icon: "Dumbbell", type: "good", color: "oklch(0.7 0.12 225)", buttonLabel: "I did it!", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "h2", name: "Smoking", icon: "Ban", type: "bad", color: "oklch(0.7 0.2 22)", buttonLabel: "Oops!", createdAt: "2026-01-01T00:00:00.000Z" },
]

function makeCompletion(habitId: string, daysAgo: number): Completion {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return { id: `c-${habitId}-${daysAgo}`, habitId, timestamp: `${y}-${m}-${day}T12:00:00.000Z` }
}

describe("computeStats", () => {
  it("returns grand total of all completions", () => {
    const completions = [makeCompletion("h1", 0), makeCompletion("h1", 1), makeCompletion("h2", 2)]
    const result = computeStats(habits, completions, 7)
    expect(result.grandTotal).toBe(3)
  })

  it("splits habits into good and bad sections", () => {
    const result = computeStats(habits, [], 7)
    expect(result.goodHabits).toHaveLength(1)
    expect(result.badHabits).toHaveLength(1)
    expect(result.goodHabits[0].habitId).toBe("h1")
    expect(result.badHabits[0].habitId).toBe("h2")
  })

  it("counts lifetime total per habit", () => {
    const completions = [makeCompletion("h1", 0), makeCompletion("h1", 5), makeCompletion("h1", 100)]
    const result = computeStats(habits, completions, 7)
    const h1 = result.goodHabits[0]
    expect(h1.lifetimeTotal).toBe(3)
  })

  it("counts total in window for 7-day window", () => {
    const completions = [
      makeCompletion("h1", 0),
      makeCompletion("h1", 1),
      makeCompletion("h1", 6), // 6 days ago = within 7-day window (days 0-6)
      makeCompletion("h1", 7), // 7 days ago = outside 7-day window
    ]
    const result = computeStats(habits, completions, 7)
    expect(result.goodHabits[0].totalInWindow).toBe(3)
  })

  it("counts total in window for 30-day window", () => {
    const completions = [
      makeCompletion("h1", 0),
      makeCompletion("h1", 29),
      makeCompletion("h1", 30),
    ]
    const result = computeStats(habits, completions, 30)
    expect(result.goodHabits[0].totalInWindow).toBe(2)
  })

  it("calculates completion rate as percentage", () => {
    const completions = Array.from({ length: 4 }, () => makeCompletion("h1", 0))
    const result = computeStats(habits, completions, 7)
    expect(result.goodHabits[0].completionRate).toBeCloseTo(57.1, 0)
  })

  it("calculates average per day", () => {
    const completions = Array.from({ length: 14 }, (_, i) => makeCompletion("h1", i))
    const result = computeStats(habits, completions, 7)
    expect(result.goodHabits[0].averagePerDay).toBeCloseTo(1, 1)
  })

  it("returns daily data for each day in the window", () => {
    const completions = [makeCompletion("h1", 0), makeCompletion("h1", 0)]
    const result = computeStats(habits, completions, 7)
    expect(result.goodHabits[0].dailyData).toHaveLength(7)
    const todayEntry = result.goodHabits[0].dailyData[6]
    expect(todayEntry.count).toBe(2)
  })

  it("flags habit as regressing when rate dropped in prior window", () => {
    const completions: Completion[] = []
    for (let i = 0; i < 5; i++) completions.push(makeCompletion("h1", 8 + i))
    for (let i = 0; i < 1; i++) completions.push(makeCompletion("h1", i))
    const result = computeStats(habits, completions, 7)
    expect(result.goodHabits[0].isRegressing).toBe(true)
  })

  it("does not flag habit as regressing when rate increased", () => {
    const completions: Completion[] = []
    for (let i = 0; i < 1; i++) completions.push(makeCompletion("h1", 8 + i))
    for (let i = 0; i < 5; i++) completions.push(makeCompletion("h1", i))
    const result = computeStats(habits, completions, 7)
    expect(result.goodHabits[0].isRegressing).toBe(false)
  })

  it("handles empty habits array", () => {
    const result = computeStats([], [], 7)
    expect(result.grandTotal).toBe(0)
    expect(result.goodHabits).toHaveLength(0)
    expect(result.badHabits).toHaveLength(0)
  })

  it("handles empty completions array", () => {
    const result = computeStats(habits, [], 7)
    expect(result.grandTotal).toBe(0)
    expect(result.goodHabits[0].totalInWindow).toBe(0)
    expect(result.goodHabits[0].lifetimeTotal).toBe(0)
    expect(result.goodHabits[0].isRegressing).toBe(false)
  })
})