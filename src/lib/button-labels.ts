export const goodLabels = [
  "I did it!",
  "Done!",
  "Got it!",
  "Nailed it!",
  "Crushed it!",
  "Boom!",
  "Yes!",
  "On it!",
  "Locked in!",
  "Let's go!",
  "Solid!",
  "Easy!",
]

export const badLabels = [
  "Oops...",
  "Slipped...",
  "Missed...",
  "Ugh...",
  "Nope",
  "Not today",
  "Skipped",
  "Avoided",
  "Passed",
  "Nah",
]

export const allLabels: Record<"good" | "bad", string[]> = {
  good: goodLabels,
  bad: badLabels,
}

export function getRandomLabel(type: "good" | "bad"): string {
  const list = allLabels[type]
  return list[Math.floor(Math.random() * list.length)]
}