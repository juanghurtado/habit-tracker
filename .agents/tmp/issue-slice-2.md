## Parent

#1

## What to build

Create the stats computation engine and the stats page UI that displays real data.

**Stats computation** (`computeStats` pure function):
- Takes habits, completions, and a window size (7 or 30 days)
- Returns: grand total (all-time), per-habit stats (total in window, completion rate %, average per day, lifetime total), and regression flags (rate dropped vs prior window of same length)
- No side effects, no React dependencies

**Stats page UI** (replaces the placeholder from Slice 1):
- Grand total of all completions ever at the top (hero number)
- Good habits section with per-habit cards
- Bad habits section with per-habit cards
- Each card: habit name/icon/color, total completions, completion rate, average per day, lifetime total, mini daily bar chart using the habit's color
- Toggle between 7-day and 30-day rolling windows
- Habits flagged as regressing show an indicator

**Testing**:
- Add `vitest` as a dev dependency
- Write tests for `computeStats` -- feed known data, assert known results
- No component/hook tests needed

## Acceptance criteria

- [ ] `computeStats(habits, completions, windowDays)` returns the correct stats structure
- [ ] Grand total is shown at the top of the stats page
- [ ] Good and bad habits are in separate sections
- [ ] Each habit card shows total, rate, average, and lifetime total
- [ ] Each habit card shows a mini daily bar chart colored to the habit
- [ ] 7/30-day toggle switches the window
- [ ] Regressing habits are flagged (rate dropped vs prior window)
- [ ] `computeStats` has tests that pass
- [ ] Stats page fits the playful-warm visual style

## Blocked by

- #2