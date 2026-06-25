// Paste this into your browser console while the app is running on localhost:3000.
// It overwrites all existing data. Refresh to see the stats page populated.

const HABITS_KEY = "habit-tracker-habits"
const COMPLETIONS_KEY = "habit-tracker-completions"

function id() {
  return crypto.randomUUID()
}

function day(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d
}

const habits = [
  { id: id(), name: "Exercise", icon: "Dumbbell", type: "good", color: "oklch(0.58 0.20 235)", buttonLabel: "Crushed it!", createdAt: day(90).toISOString() },
  { id: id(), name: "Read", icon: "BookOpen", type: "good", color: "oklch(0.66 0.14 205)", buttonLabel: "Done!", createdAt: day(90).toISOString() },
  { id: id(), name: "Meditate", icon: "Brain", type: "good", color: "oklch(0.70 0.12 225)", buttonLabel: "Yes!", createdAt: day(60).toISOString() },
  { id: id(), name: "Smoking", icon: "Cigarette", type: "bad", color: "oklch(0.52 0.20 350)", buttonLabel: "Oops...", createdAt: day(90).toISOString() },
  { id: id(), name: "Junk Food", icon: "Pizza", type: "bad", color: "oklch(0.64 0.18 40)", buttonLabel: "Slipped...", createdAt: day(90).toISOString() },
  { id: id(), name: "Late Night", icon: "Moon", type: "bad", color: "oklch(0.52 0.20 35)", buttonLabel: "Ugh...", createdAt: day(45).toISOString() },
]

// Each function returns true/false for a given daysAgo
const patterns = [
  // Exercise — improving (30% → 85%)
  (d) =>
    d > 80 ? Math.random() < 0.3 : d > 50 ? Math.random() < 0.5 : d > 30 ? Math.random() < 0.65 : d > 14 ? Math.random() < 0.75 : Math.random() < 0.85,
  // Read — steady ~70%
  (d) => Math.random() < 0.7,
  // Meditate — declining (85% → 20%)
  (d) => (d > 45 ? Math.random() < 0.85 : d > 25 ? Math.random() < 0.6 : d > 10 ? Math.random() < 0.4 : Math.random() < 0.2),
  // Smoking — improving (40% → 8%)
  (d) =>
    d > 60 ? Math.random() < 0.4 : d > 30 ? Math.random() < 0.25 : d > 10 ? Math.random() < 0.15 : Math.random() < 0.08,
  // Junk Food — mild improvement
  (d) => (d > 60 ? Math.random() < 0.35 : d > 30 ? Math.random() < 0.25 : Math.random() < 0.2),
  // Late Night — getting worse (20% → 50%)
  (d) => (d > 30 ? Math.random() < 0.2 : d > 14 ? Math.random() < 0.35 : Math.random() < 0.5),
]

let completions = []

habits.forEach((habit, hi) => {
  const startDaysAgo = Math.round((Date.now() - new Date(habit.createdAt).getTime()) / 86400000)
  for (let d = startDaysAgo; d >= 0; d--) {
    if (patterns[hi](d)) {
      const count = habit.type === "good" && Math.random() < 0.12 ? 2 : 1
      for (let n = 0; n < count; n++) {
        const ts = new Date(day(d).getFullYear(), day(d).getMonth(), day(d).getDate(), 8 + Math.floor(Math.random() * 14))
        completions.push({ id: id(), habitId: habit.id, timestamp: ts.toISOString() })
      }
    }
  }
})

localStorage.setItem(HABITS_KEY, JSON.stringify(habits))
localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions))

window.dispatchEvent(new Event("storage"))

console.log(`✅ Seeded ${habits.length} habits with ${completions.length} completions over 90 days. Refresh to see.`)