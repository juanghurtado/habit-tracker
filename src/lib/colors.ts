export interface PaletteColor {
  name: string
  value: string
  button: string
}

export const goodColors: PaletteColor[] = [
  { name: "Lavender", value: "oklch(0.65 0.18 280)", button: "oklch(0.42 0.18 280)" },
  { name: "Orchid", value: "oklch(0.64 0.16 300)", button: "oklch(0.42 0.16 300)" },
  { name: "Sapphire", value: "oklch(0.68 0.14 260)", button: "oklch(0.44 0.14 260)" },
  { name: "Cobalt", value: "oklch(0.58 0.20 235)", button: "oklch(0.38 0.20 235)" },
  { name: "Sky", value: "oklch(0.70 0.12 225)", button: "oklch(0.45 0.12 225)" },
  { name: "Teal", value: "oklch(0.66 0.14 205)", button: "oklch(0.42 0.14 205)" },
  { name: "Cyan", value: "oklch(0.70 0.12 185)", button: "oklch(0.45 0.12 185)" },
  { name: "Mint", value: "oklch(0.68 0.16 165)", button: "oklch(0.44 0.16 165)" },
  { name: "Emerald", value: "oklch(0.66 0.18 145)", button: "oklch(0.42 0.18 145)" },
  { name: "Chartreuse", value: "oklch(0.70 0.14 125)", button: "oklch(0.46 0.14 125)" },
  { name: "Lime", value: "oklch(0.74 0.12 105)", button: "oklch(0.48 0.12 105)" },
  { name: "Rose", value: "oklch(0.68 0.10 325)", button: "oklch(0.44 0.10 325)" },
]

export const badColors: PaletteColor[] = [
  { name: "Burgundy", value: "oklch(0.48 0.22 25)", button: "oklch(0.35 0.22 25)" },
  { name: "Crimson", value: "oklch(0.52 0.20 350)", button: "oklch(0.36 0.20 350)" },
  { name: "Ruby", value: "oklch(0.56 0.20 15)", button: "oklch(0.38 0.20 15)" },
  { name: "Vermilion", value: "oklch(0.60 0.20 30)", button: "oklch(0.40 0.20 30)" },
  { name: "Tangerine", value: "oklch(0.64 0.18 40)", button: "oklch(0.42 0.18 40)" },
  { name: "Amber", value: "oklch(0.66 0.16 55)", button: "oklch(0.44 0.16 55)" },
  { name: "Gold", value: "oklch(0.70 0.14 70)", button: "oklch(0.46 0.14 70)" },
  { name: "Sunset", value: "oklch(0.58 0.18 10)", button: "oklch(0.38 0.18 10)" },
  { name: "Rust", value: "oklch(0.52 0.20 35)", button: "oklch(0.34 0.20 35)" },
  { name: "Coral", value: "oklch(0.62 0.16 15)", button: "oklch(0.42 0.16 15)" },
  { name: "Peach", value: "oklch(0.68 0.14 60)", button: "oklch(0.44 0.14 60)" },
  { name: "Scarlet", value: "oklch(0.50 0.22 340)", button: "oklch(0.34 0.22 340)" },
]

export const allColors: Record<"good" | "bad", PaletteColor[]> = {
  good: goodColors,
  bad: badColors,
}

export function getRandomColor(type: "good" | "bad"): string {
  const list = allColors[type]
  return list[Math.floor(Math.random() * list.length)].value
}

