# Per-habit color identity with type-constrained palettes

Assign each Habit a stable color at creation time from a curated palette constrained by habit type (good vs. bad), stored as an oklch(l c h) string and rendered via CSS `color-mix()`.

## Context

The original design used one gradient (purple→orange) for all "good" habits and a single red for all "bad" habits. Cards were identical white containers with no visual distinction between habits, making the list feel flat and forcing the user to read each habit name to find the one they wanted.

## Decision

- **12+ colors per type**: good habits draw from blue-green-purple (cool/positive range), bad habits from red-orange (warm/alert range). This preserves the good/bad signal while letting each habit feel unique.
- **User picks at creation**: a color picker shows the palette filtered by habit type, with a randomly pre-selected default. The user can change it or keep the default.
- **OKLCH storage**: color values are stored as OKLCH strings (`oklch(l c h)`) in the Habit data for perceptual uniformity and CSS `color-mix()` compatibility.
- **Tinted card overlay**: a 10% opacity `color-mix()` overlay on `bg-card` backgrounds creates a subtle tint that works in both light and dark modes without hardcoding mode-specific values.
- **Button darkening**: habit color is too light for white text on some hues, so a darker "button" variant is computed in the palette definition.

## Considered Options

- **Fully random assignment (no user choice)**: faster to build but removes agency and the chance to express intent.
- **Fully random across all habits (no type split)**: simpler but loses the good/bad visual signal that helps the user quickly identify which habits need intervention.
- **HSL storage**: simpler parsing but `color-mix()` in HSL produces greyer mixes than OKLCH, and HSL is less perceptually uniform.
- **Computed accent from habit name (hash-based)**: deterministic and automatic but unpredictable results and no user control.

## Consequences

- Existing habits get auto-migrated with random colors and labels on first load (backward-compatible).
- `color-mix()` is a modern CSS function with ~94% browser support as of 2026; the fallback (no tint) is still readable—the card just looks slightly less colored.