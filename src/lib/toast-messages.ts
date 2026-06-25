export const goodMessages = [
  'Nice — "{name}" done!',
  '"{name}" — knocked it out!',
  'Crushed "{name}" today!',
  '"{name}" — nailed it!',
  'You\'re on fire! "{name}" logged.',
  'Solid. "{name}" is in the books.',
  'Boom! "{name}" completed.',
  '"{name}" — another one in the bag.',
  'Locked in. "{name}" done.',
  'Easy. "{name}" — checked off.',
]

export const badMessages = [
  '"{name}" — slipped today.',
  'Missed "{name}". Tomorrow\'s fresh.',
  'Ugh, "{name}"... next time.',
  '"{name}" — not today. Reset tomorrow.',
  'Skipped "{name}". Onward.',
  '"{name}" — acknowledged. Keep going.',
  'Passed on "{name}". No sweat.',
  '"{name}" got away today. Tomorrow.',
  'Noted. "{name}" — move forward.',
  '"{name}" — write it off, start again.',
]

export const allToastMessages: Record<"good" | "bad", string[]> = {
  good: goodMessages,
  bad: badMessages,
}

export function getRandomToastMessage(type: "good" | "bad", name: string): string {
  const list = allToastMessages[type]
  const template = list[Math.floor(Math.random() * list.length)]
  return template.replace("{name}", name)
}