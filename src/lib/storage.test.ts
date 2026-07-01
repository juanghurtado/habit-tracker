import { beforeEach, describe, expect, it } from "vitest";
import {
  completionsOnDate,
  createCompletion,
  createHabit,
  formatDateKey,
  loadCompletions,
  loadHabits,
  saveCompletions,
  saveHabits,
} from "./storage.ts";

describe("formatDateKey", () => {
  it("formats a date as YYYY-MM-DD", () => {
    const date = new Date(2026, 5, 25);
    expect(formatDateKey(date)).toBe("2026-06-25");
  });

  it("pads single-digit month and day", () => {
    const date = new Date(2026, 0, 5);
    expect(formatDateKey(date)).toBe("2026-01-05");
  });

  it("handles December date", () => {
    const date = new Date(2026, 11, 31);
    expect(formatDateKey(date)).toBe("2026-12-31");
  });
});

describe("completionsOnDate (all habits)", () => {
  const completions = [
    {
      id: "1",
      habitId: "a",
      timestamp: "2026-06-25T10:00:00.000Z",
      syncedAt: null,
      deletedAt: null,
    },
    {
      id: "2",
      habitId: "b",
      timestamp: "2026-06-25T14:30:00.000Z",
      syncedAt: null,
      deletedAt: null,
    },
    {
      id: "3",
      habitId: "a",
      timestamp: "2026-06-24T23:00:00.000Z",
      syncedAt: null,
      deletedAt: null,
    },
  ];

  it("returns completions matching the date key", () => {
    const date = new Date(2026, 5, 25);
    const result = completionsOnDate(completions, date);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.id)).toEqual(["1", "2"]);
  });

  it("returns empty array when no completions match", () => {
    const date = new Date(2026, 6, 1);
    expect(completionsOnDate(completions, date)).toEqual([]);
  });

  it("matches timestamp using local-day range", () => {
    const date = new Date(2026, 5, 24);
    const result = completionsOnDate(completions, date);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });
});

describe("completionsOnDate (specific habit)", () => {
  const completions = [
    {
      id: "1",
      habitId: "a",
      timestamp: "2026-06-25T10:00:00.000Z",
      syncedAt: null,
      deletedAt: null,
    },
    {
      id: "2",
      habitId: "b",
      timestamp: "2026-06-25T14:30:00.000Z",
      syncedAt: null,
      deletedAt: null,
    },
    {
      id: "3",
      habitId: "a",
      timestamp: "2026-06-24T23:00:00.000Z",
      syncedAt: null,
      deletedAt: null,
    },
  ];

  it("returns completions for specific habit and date", () => {
    const date = new Date(2026, 5, 25);
    const result = completionsOnDate(completions, date, "a");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns empty array for habit with no completions on date", () => {
    const date = new Date(2026, 5, 25);
    expect(completionsOnDate(completions, date, "c")).toEqual([]);
  });

  it("handles empty completions array", () => {
    const date = new Date(2026, 5, 25);
    expect(completionsOnDate([], date, "a")).toEqual([]);
  });
});

describe("createHabit", () => {
  it("creates a habit with given fields and a generated id", () => {
    const habit = createHabit(
      "Drink water",
      "Droplets",
      "good",
      "oklch(0.7 0.12 225)",
      "I did it!"
    );
    expect(habit.name).toBe("Drink water");
    expect(habit.icon).toBe("Droplets");
    expect(habit.type).toBe("good");
    expect(habit.color).toBe("oklch(0.7 0.12 225)");
    expect(habit.buttonLabel).toBe("I did it!");
    expect(habit.id).toBeDefined();
    expect(typeof habit.id).toBe("string");
    expect(habit.createdAt).toBeDefined();
    expect(() => new Date(habit.createdAt)).not.toThrow();

    expect(habit.syncedAt).toBeNull();
    expect(habit.updatedAt).toBeDefined();
    expect(() => new Date(habit.updatedAt)).not.toThrow();
    expect(habit.deletedAt).toBeNull();
  });
});

describe("createCompletion", () => {
  it("creates a completion with a given habitId and default timestamp", () => {
    const completion = createCompletion("habit-1");
    expect(completion.habitId).toBe("habit-1");
    expect(completion.id).toBeDefined();
    expect(typeof completion.id).toBe("string");
    expect(completion.timestamp).toBeDefined();
    expect(() => new Date(completion.timestamp)).not.toThrow();
    expect(completion.syncedAt).toBeNull();
    expect(completion.deletedAt).toBeNull();
  });

  it("creates a completion for a specific date so it is findable by completionsOnDate", () => {
    const pastDate = new Date(2026, 5, 24);
    const completion = createCompletion("habit-1", pastDate);
    const result = completionsOnDate([completion], pastDate, "habit-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(completion.id);
  });
});

describe("loadHabits", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns complete habits unchanged and does not re-save", () => {
    const habit = createHabit(
      "Drink water",
      "Droplets",
      "good",
      "oklch(0.7 0.12 225)",
      "Done!"
    );
    saveHabits([habit]);

    const result = loadHabits();

    expect(result).toHaveLength(1);
    expect(result[0].color).toBe("oklch(0.7 0.12 225)");
    expect(result[0].buttonLabel).toBe("Done!");

    const raw = localStorage.getItem("habit-tracker-habits");
    const parsed = raw ? JSON.parse(raw) : [];
    expect(parsed[0].color).toBe("oklch(0.7 0.12 225)");
  });

  it("migrates habits missing color and buttonLabel and persists them", () => {
    const legacy = {
      id: "legacy-1",
      name: "Old habit",
      icon: "Star",
      type: "good" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    localStorage.setItem("habit-tracker-habits", JSON.stringify([legacy]));

    const result = loadHabits();

    expect(result).toHaveLength(1);
    expect(result[0].color).toBeDefined();
    expect(result[0].buttonLabel).toBeDefined();
    expect(typeof result[0].color).toBe("string");
    expect(typeof result[0].buttonLabel).toBe("string");

    const raw = localStorage.getItem("habit-tracker-habits");
    const parsed = raw ? JSON.parse(raw) : [];
    expect(parsed[0].color).toBe(result[0].color);
    expect(parsed[0].buttonLabel).toBe(result[0].buttonLabel);
  });

  it("returns stable colors after two loads (first load persists)", () => {
    const legacy = {
      id: "legacy-2",
      name: "Unstable color?",
      icon: "Zap",
      type: "bad" as const,
      createdAt: "2026-02-01T00:00:00.000Z",
    };
    localStorage.setItem("habit-tracker-habits", JSON.stringify([legacy]));

    const first = loadHabits();
    const second = loadHabits();

    expect(first[0].color).toBe(second[0].color);
    expect(first[0].buttonLabel).toBe(second[0].buttonLabel);
  });

  it("returns empty array when no habits exist", () => {
    expect(loadHabits()).toEqual([]);
  });

  it("returns empty array on corrupt localStorage", () => {
    localStorage.setItem("habit-tracker-habits", "not-json");
    expect(loadHabits()).toEqual([]);
  });

  it("migrates habits missing syncedAt, updatedAt, and deletedAt", () => {
    const legacy = {
      id: "legacy-sync-1",
      name: "Old habit",
      icon: "Star",
      type: "good" as const,
      color: "oklch(0.7 0.12 225)",
      buttonLabel: "Done!",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    localStorage.setItem("habit-tracker-habits", JSON.stringify([legacy]));

    const result = loadHabits();

    expect(result).toHaveLength(1);
    expect(result[0].syncedAt).toBeNull();
    expect(result[0].updatedAt).toBeDefined();
    expect(() => new Date(result[0].updatedAt)).not.toThrow();
    expect(result[0].deletedAt).toBeNull();

    const raw = localStorage.getItem("habit-tracker-habits");
    const parsed = raw ? JSON.parse(raw) : [];
    expect(parsed[0].syncedAt).toBeNull();
    expect(parsed[0].updatedAt).toBeDefined();
    expect(parsed[0].deletedAt).toBeNull();
  });

  it("leaves modern habits with complete sync fields unchanged", () => {
    const modern = createHabit(
      "Modern habit",
      "Zap",
      "good",
      "oklch(0.7 0.12 225)",
      "Nice!"
    );
    saveHabits([modern]);

    const result = loadHabits();

    expect(result).toHaveLength(1);
    expect(result[0].syncedAt).toBeNull();
    expect(result[0].updatedAt).toBe(modern.updatedAt);
    expect(result[0].deletedAt).toBeNull();

    const raw = localStorage.getItem("habit-tracker-habits");
    const storedAfter = raw ? JSON.parse(raw) : [];
    expect(storedAfter[0].updatedAt).toBe(modern.updatedAt);
  });
});

describe("loadCompletions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty array when no completions exist", () => {
    expect(loadCompletions()).toEqual([]);
  });

  it("returns empty array on corrupt localStorage", () => {
    localStorage.setItem("habit-tracker-completions", "not-json");
    expect(loadCompletions()).toEqual([]);
  });

  it("returns completions unchanged when they have syncedAt", () => {
    const completions = [
      {
        id: "1",
        habitId: "a",
        timestamp: "2026-06-25T10:00:00.000Z",
        syncedAt: null,
        deletedAt: null,
      },
    ];
    saveCompletions(completions);

    const result = loadCompletions();

    expect(result).toHaveLength(1);
    expect(result[0].syncedAt).toBeNull();
  });

  it("migrates old completions missing syncedAt and deletedAt", () => {
    const legacy = {
      id: "legacy-completion-1",
      habitId: "habit-a",
      timestamp: "2026-06-25T10:00:00.000Z",
    };
    localStorage.setItem("habit-tracker-completions", JSON.stringify([legacy]));

    const result = loadCompletions();

    expect(result).toHaveLength(1);
    expect(result[0].syncedAt).toBeNull();
    expect(result[0].deletedAt).toBeNull();

    const raw = localStorage.getItem("habit-tracker-completions");
    const parsed = raw ? JSON.parse(raw) : [];
    expect(parsed[0].syncedAt).toBeNull();
    expect(parsed[0].deletedAt).toBeNull();
  });
});
