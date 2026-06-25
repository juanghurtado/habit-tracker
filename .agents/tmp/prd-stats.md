## Problem Statement

The habit tracker currently shows only a day-by-day log. There is no way to see trends, totals, or patterns over time. The user has been tracking habits and accumulating completions, but has no feedback on whether they are improving, where they are slipping, or how much they've done in total.

## Solution

A new Stats tab, accessed via a bottom tab bar, that shows aggregate habit data over rolling time windows. The page presents a grand total of all completions ever, then breaks down per-habit stats — total completions, completion rate, and average per day — for 7-day and 30-day windows. Good and bad habits are shown in separate sections. Habits whose rate has dropped compared to the prior window are flagged as regressing.

## User Stories

1. As a user, I want to see a tab bar at the bottom of the app so that I can switch between the daily log and stats.
2. As a user, I want to see a grand total of all completions ever at the top of the stats page so that I feel a sense of accomplishment.
3. As a user, I want to see good and bad habits separated into two sections so that I can evaluate them differently.
4. As a user, I want to see per-habit stats in card format with a mini chart so that I can quickly scan my performance.
5. As a user, I want each habit card to show total completions in the window so that I know how many times I did it.
6. As a user, I want each habit card to show completion rate so that I know how consistent I was.
7. As a user, I want each habit card to show average completions per day so that I understand my intensity.
8. As a user, I want a lifetime total per habit in its card so that I can see the big picture for each habit.
9. As a user, I want to toggle between 7-day and 30-day rolling windows so that I can see short-term and long-term trends.
10. As a user, I want to see which habits are regressing (rate dropped compared to the prior window of the same length) so that I know where I'm slipping.
11. As a user, I want stats to always be relative to today so that I always see my current status.
12. As a user, I want the stats page to feel visually consistent with the playful-warm design of the rest of the app.
13. As a user, I want the selected tab to be visually highlighted so that I know which view I'm on.

## Implementation Decisions

- **Tab navigation**: A bottom tab bar managed by `useState` in `App.tsx`. No router library — two tabs doesn't warrant it (ADR-0002).
- **Stats computation**: A single pure function `computeStats(habits, completions, windowDays)` in `src/lib/compute-stats.ts`. Takes data in, returns computed stats out. No side effects, no React dependencies.
- **Compute on render**: Stats are recomputed in-memory from localStorage on every render. The dataset is small (single user, local only), so no caching or pre-aggregation is needed.
- **Date anchor**: All stats windows are anchored to today, not the selected date from the daily log.
- **Rolling windows**: 7-day and 30-day windows, user-selectable via a toggle. Each window has an implicit "prior window" of the same length (days 8–14 and days 31–60 respectively) for regression comparison.
- **Regression**: A habit is flagged as regressing if its completion rate in the current window is lower than in the prior window of the same length.
- **Mini charts**: Horizontal bar charts showing daily completions across the window. One bar per day, filled proportionally to completions on that day. Bars use the habit's color.
- **Sectioning**: Good habits listed first, bad habits listed second, each under a section header.
- **New dependency**: `vitest` as a dev dependency for testing. No other new dependencies.
- **No new state storage**: The existing localStorage keys and the `useHabits` hook provide all the data needed.

## Testing Decisions

- **One test seam**: The pure `computeStats` function in `src/lib/compute-stats.ts`. Test only external behaviour — given habits and completions, assert the output structure and values.
- **What makes a good test**: Feed known habit and completion data, get back known stat results. No mocks, no localStorage, no React. Pure function in, pure assertion out.
- **Prior art**: No existing tests in the codebase. This will be the first.
- **Not tested**: Components, hooks, tab navigation, localStorage interaction. These are trivial enough that testing adds more maintenance cost than value at this stage.

## Out of Scope

- Exported or printable reports
- Calendar heatmap or month grid
- Streak tracking or streak history
- Data export or CSV download
- Predictions, recommendations, or AI features
- Custom date range selector
- Notifications or alerts for regression
- Charts beyond mini daily bar charts per habit

## Further Notes

- This is the first navigation feature in what has been a single-screen app. The tab bar pattern sets a precedent for future screens.
- The pure stats computation module is intentionally isolated so it can be tested, reasoned about, and potentially reused (e.g., for a widget or notification preview).