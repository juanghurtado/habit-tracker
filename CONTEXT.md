# Habit Tracker

A mobile-first app for tracking daily binary habits. Single-user, multi-device. Data lives in localStorage with optional cloud backup via Supabase.

## Language

**Anonymous User**:
A person using the app without signing in. Their data lives only in localStorage and can be lost on browser data clear. They can upgrade to an Authenticated User at any time, migrating their local data to the cloud.
_Avoid_: Guest, visitor

**Authenticated User**:
A person who has signed in via email magic link. Their data syncs to Supabase and is recoverable across devices and browser resets.
_Avoid_: Registered user, member, account holder

**Gate**:
The full-screen entry point shown on **first visit only** — when the user has no session and no local data. Presents two paths: "Start tracking" (Anonymous User) and "Sign in" (Authenticated User). Once the user has data or a session, the Gate is skipped and they land directly on the log or stats.
_Avoid_: Welcome screen, splash, onboarding

**Auth Entry**:
An in-app mechanism for anonymous users who already have local data to sign in and upload their data to the cloud. Lives in the app chrome (e.g. a subtle link or icon in a settings area). Prompts for email, sends a magic link, and on successful auth, uploads all local data to Supabase.
_Avoid_: Login button, upgrade prompt, account settings

**Cloud Backup**:
The optional feature, enabled by signing in, that syncs data between the local browser and Supabase. Without it, the app works identically but data is not durable.
_Avoid_: Sync, cloud save, remote storage

**Sync**:
The process of reconciling local data with Supabase. Triggered on every write (debounced) and on visibility change. Habits use last-writer-wins by `updated_at` with soft deletes; Completions are append-only and both copies land.
_Avoid_: Replication, merge, backup

**Sync Queue**:
Records created or modified while offline that haven't been pushed to Supabase yet. Identified by a `synced_at` timestamp of `null`.
_Avoid_: Pending changes, outbox, dirty records

**Soft Delete**:
Marking a Habit as deleted (`deleted_at` timestamp) instead of removing it from the database. Prevents resurrection conflicts when a disconnected edit references a habit that another device has deleted.
_Avoid_: Archive, trash, hide

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

**Toast Message**:
A randomly selected message shown in a Sonner toast when the user completes a Habit. The message pool is separate per Habit type — good habits get celebratory phrases ("Crushed \"{name}\" today!"); bad habits get resilient acknowledgements ("\"{name}\" — slipped today."). The toast also shows a type-appropriate icon (Smile for good, Frown for bad) and a left border in the Habit's color. Good-habit toasts trigger a confetti burst; bad-habit toasts play a gentle wobble animation.
_Avoid_: Notification, alert, popup

**Stats**:
The aggregate view of Habit data over rolling time windows, presented separately from the daily log. Shows totals, rates, and streaks. Always computed relative to today, not the selected date.
_Avoid_: Dashboard, analytics, reports