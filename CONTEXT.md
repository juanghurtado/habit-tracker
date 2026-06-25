# Habit Tracker

A mobile-first app for tracking daily binary habits. Designed for a single user with data stored locally in the browser.

## Language

**Habit**:
A behaviour the user wants to track. Has a name, a Lucide icon, and a type (good or bad). Good habits the user wants to increase; bad habits the user wants to decrease. Checked off by logging Completions.
_Avoid_: Task, goal, chore

**Completion**:
A single event recording that the user performed a Habit at a specific point in time. Multiple Completions can exist for the same Habit on the same day.
_Avoid_: Check-in, entry, log

**Color**:
A visual identifier assigned to a Habit at creation time. Each Habit gets one color from its type's palette — good habits draw from a blue-green-purple range, bad habits from a red-orange range. The user picks from the palette; a random default is pre-selected. The color tints the card background (subtle), fills the icon container, and sets the action button background. Stored as an oklch(l c h) string.
_Avoid_: Accent, theme, tag

**Button Label**:
The action text on a Habit's primary completion button. Assigned randomly from a curated list matching the Habit's type at creation time. Good habits get affirmative verbs ("Done!", "Nailed it!"); bad habits get softer acknowledgements ("Oops...", "Skipped"). Can be changed during editing.
_Avoid_: CTA, verb, action text

**Stats**:
The aggregate view of Habit data over rolling time windows, presented separately from the daily log. Shows totals, rates, trends, and regressions. Always computed relative to today, not the selected date.
_Avoid_: Dashboard, analytics, reports

**Completion Rate**:
The percentage of days in a given window where a Habit had at least one Completion.
_Avoid_: Hit rate, success rate, adherence

**Rolling Window**:
A date range anchored to today — e.g., the last 7 days or the last 30 days. Used instead of fixed calendar boundaries (calendar weeks/months) so the data is always current.
_Avoid_: Period, interval, range

**Regression**:
A decrease in a Habit's completion rate in the current Rolling Window compared to the preceding window of the same length. Habits that are regressing are flagged in Stats.