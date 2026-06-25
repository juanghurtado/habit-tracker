import { useCallback, useSyncExternalStore } from "react"
import type { Habit, Completion } from "../types"
import {
  loadHabits,
  saveHabits,
  loadCompletions,
  saveCompletions,
  createHabit,
  createCompletion,
} from "../lib/storage"

let cachedHabits: Habit[] = loadHabits()
let cachedCompletions: Completion[] = loadCompletions()

const listeners = new Set<() => void>()

function notifyListeners() {
  cachedHabits = loadHabits()
  cachedCompletions = loadCompletions()
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshotHabits(): Habit[] {
  return cachedHabits
}

function getSnapshotCompletions(): Completion[] {
  return cachedCompletions
}

export function useHabits() {
  const habits = useSyncExternalStore(subscribe, getSnapshotHabits)
  const completions = useSyncExternalStore(subscribe, getSnapshotCompletions)

  const addHabit = useCallback((name: string, icon: string, type: "good" | "bad", color: string, buttonLabel: string) => {
    const updated = [...loadHabits(), createHabit(name, icon, type, color, buttonLabel)]
    saveHabits(updated)
    notifyListeners()
  }, [])

  const editHabit = useCallback((id: string, name: string, icon: string, type: "good" | "bad", color: string, buttonLabel: string) => {
    const updated = loadHabits().map((h) =>
      h.id === id ? { ...h, name, icon, type, color, buttonLabel } : h
    )
    saveHabits(updated)
    notifyListeners()
  }, [])

  const deleteHabit = useCallback((id: string) => {
    const updated = loadHabits().filter((h) => h.id !== id)
    saveHabits(updated)
    const comps = loadCompletions().filter((c) => c.habitId !== id)
    saveCompletions(comps)
    notifyListeners()
  }, [])

  const addCompletion = useCallback((habitId: string) => {
    const updated = [...loadCompletions(), createCompletion(habitId)]
    saveCompletions(updated)
    notifyListeners()
  }, [])

  const undoLastCompletion = useCallback((habitId: string) => {
    const comps = loadCompletions()
    const habitComps = comps.filter((c) => c.habitId === habitId)
    if (habitComps.length === 0) return
    const mostRecent = habitComps.reduce((a, b) =>
      a.timestamp > b.timestamp ? a : b
    )
    const updated = comps.filter((c) => c.id !== mostRecent.id)
    saveCompletions(updated)
    notifyListeners()
  }, [])

  return { habits, completions, addHabit, editHabit, deleteHabit, addCompletion, undoLastCompletion }
}