import { describe, it, expect } from "vitest"
import { getRandomColor, allColors } from "./colors"
import { getRandomLabel, allLabels } from "./button-labels"

describe("getRandomColor", () => {
  it("returns a color from the good palette for type 'good'", () => {
    const color = getRandomColor("good")
    expect(allColors.good.some((c) => c.value === color)).toBe(true)
  })

  it("returns a color from the bad palette for type 'bad'", () => {
    const color = getRandomColor("bad")
    expect(allColors.bad.some((c) => c.value === color)).toBe(true)
  })

  it("returns different colors across multiple calls (non-deterministic)", () => {
    const results = new Set(Array.from({ length: 50 }, () => getRandomColor("good")))
    expect(results.size).toBeGreaterThan(1)
  })
})

describe("getRandomLabel", () => {
  it("returns a label from the good list for type 'good'", () => {
    const label = getRandomLabel("good")
    expect(allLabels.good).toContain(label)
  })

  it("returns a label from the bad list for type 'bad'", () => {
    const label = getRandomLabel("bad")
    expect(allLabels.bad).toContain(label)
  })
})